from django.db.models import Q, Sum, F
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from parts.models import PartColor
from minifigs.models import Minifig
from sets.models import Set
from catalog.models import CatalogItem
from inventory.collection import owned_part_color_quantities
from inventory.models import CollectionSet


def catalog_storefront_price(item):
    if not item:
        return None
    return (
        item.current_price
        if item.current_price is not None
        else item.bricklink_reference_price
        if item.bricklink_reference_price is not None
        else item.lego_reference_price
    )


def rank_result(item, q_lower: str):
    title = (item.get("title") or "").lower()
    subtitle = (item.get("subtitle") or "").lower()
    search_text = (item.get("search_text") or "").lower()
    meta = item.get("meta") or {}

    important_fields = [
        str(meta.get("part_id", "")).lower(),
        str(meta.get("part_color_code", "")).lower(),
        str(meta.get("set_num", "")).lower(),
        str(meta.get("bricklink_id", "")).lower(),
        str(meta.get("sku", "")).lower(),
        str(meta.get("color_name", "")).lower(),
        str(meta.get("theme_name", "")).lower(),
    ]

    if any(field == q_lower for field in important_fields if field):
        return (0, title)

    if any(field.startswith(q_lower) for field in important_fields if field):
        return (1, title)

    if title == q_lower:
        return (2, title)

    if title.startswith(q_lower):
        return (3, title)

    if q_lower in title:
        return (4, title)

    if q_lower in subtitle:
        return (5, title)

    if q_lower in search_text:
        return (6, title)

    return (7, title)


def tokens_match(item, tokens: list[str]) -> bool:
    meta = item.get("meta") or {}

    haystacks = [
        (item.get("title") or "").lower(),
        (item.get("subtitle") or "").lower(),
        (item.get("search_text") or "").lower(),
        " ".join(str(v).lower() for v in meta.values() if v is not None),
    ]

    joined = " ".join(haystacks)
    return all(token in joined for token in tokens)


class LibraryPickerLookupView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        type_param = (request.query_params.get("type") or "all").strip().lower()
        theme_param = (request.query_params.get("theme") or "").strip()
        year_param = (request.query_params.get("year") or "").strip()

        try:
            limit = min(int(request.query_params.get("limit", 30)), 100)
        except (TypeError, ValueError):
            limit = 30

        allowed_types = {"all", "part_color", "minifig", "set", "catalog"}
        if type_param not in allowed_types:
            type_param = "all"

        results = []

        include_part_colors = type_param in {"all", "part_color"}
        include_minifigs = type_param in {"all", "minifig"}
        include_sets = type_param in {"all", "set"}
        include_catalog = type_param in {"all", "catalog"}
        owned_quantities = owned_part_color_quantities(request.user)
        directly_owned_sets = {}
        if request.user.is_authenticated:
            directly_owned_sets = {
                row.lego_set_id: row
                for row in CollectionSet.objects.filter(user=request.user)
            }

        if include_part_colors:
            pc_qs = (
                PartColor.objects
                .select_related(
                    "part",
                    "color",
                    "catalog_item",
                    "root_part_color",
                    "root_part_color__catalog_item",
                )
                .all()
                .order_by("part__general_category", "part__part_id", "color__name", "variant")
            )

            if q:
                pc_qs = pc_qs.filter(
                    Q(part_color_code__icontains=q)
                    | Q(description__icontains=q)
                    | Q(variant__icontains=q)
                    | Q(root_part_color__part_color_code__icontains=q)
                    | Q(root_part_color__description__icontains=q)
                    | Q(part__part_id__icontains=q)
                    | Q(part__name__icontains=q)
                    | Q(part__general_category__icontains=q)
                    | Q(part__specific_category__icontains=q)
                    | Q(part__actual_category__icontains=q)
                    | Q(color__name__icontains=q)
                )
            for row in pc_qs[:limit]:
                part = getattr(row, "part", None)
                color = getattr(row, "color", None)

                subtitle_parts = [
                    getattr(part, "part_id", "") if part else "",
                    getattr(color, "name", "") if color else "",
                    row.variant or "",
                ]

                results.append({
                    "id": row.id,
                    "type": "part_color",
                    "title": getattr(part, "name", "") if part else (row.part_color_code or "Unnamed Part Color"),
                    "subtitle": " • ".join([x for x in subtitle_parts if x]),
                    "image_url": (
                        row.image_url_1
                        or row.image_url_2
                        or (getattr(part, "image_url", "") if part else "")
                        or ""
                    ),
                    "search_text": " ".join([
                        row.part_color_code or "",
                        row.description or "",
                        row.variant or "",
                        row.root_part_color.part_color_code if row.root_part_color_id else "",
                        row.root_part_color.description if row.root_part_color_id else "",
                        getattr(part, "part_id", "") if part else "",
                        getattr(part, "name", "") if part else "",
                        getattr(part, "general_category", "") if part else "",
                        getattr(part, "specific_category", "") if part else "",
                        getattr(part, "actual_category", "") if part else "",
                        getattr(color, "name", "") if color else "",
                    ]).strip(),
                    "meta": {
                        "part_color_code": row.part_color_code or "",
                        "root_part_color_id": row.effective_part_color_id,
                        "root_part_color_code": row.root_part_color.part_color_code if row.root_part_color_id else "",
                        "root_part_color_description": row.root_part_color.description if row.root_part_color_id else "",
                        "part_id": getattr(part, "part_id", "") if part else "",
                        "part_name": getattr(part, "name", "") if part else "",
                        "general_category": getattr(part, "general_category", "") if part else "",
                        "specific_category": getattr(part, "specific_category", "") if part else "",
                        "actual_category": getattr(part, "actual_category", "") if part else "",
                        "color_name": getattr(color, "name", "") if color else "",
                        "color_hex": getattr(color, "hex", "") if color else "",
                        "variant": row.variant or "",
                        "description": row.description or "",
                    },
                })

        if include_minifigs:
            mf_qs = (
                Minifig.objects
                .select_related("theme")
                .all()
                .order_by("name", "bricklink_id")
            )

            if q:
                mf_qs = mf_qs.filter(
                    Q(name__icontains=q)
                    | Q(bricklink_id__icontains=q)
                    | Q(theme__name__icontains=q)
                )

            for row in mf_qs[:limit]:
                theme = getattr(row, "theme", None)

                results.append({
                    "id": row.id,
                    "type": "minifig",
                    "title": row.name or row.bricklink_id or "Unnamed Minifig",
                    "subtitle": " • ".join([
                        x for x in [
                            row.bricklink_id or "",
                            getattr(theme, "name", "") if theme else "",
                        ] if x
                    ]),
                    "image_url": row.image_url or "",
                    "search_text": " ".join([
                        row.name or "",
                        row.bricklink_id or "",
                        getattr(theme, "name", "") if theme else "",
                    ]).strip(),
                    "meta": {
                        "bricklink_id": row.bricklink_id or "",
                        "theme_name": getattr(theme, "name", "") if theme else "",
                    },
                })

        if include_sets:
            set_qs = (
                Set.objects
                .select_related("theme", "catalog_item")
                .prefetch_related(
                    "parts__part_color__catalog_item",
                    "parts__part_color__root_part_color",
                    "parts__part_color__root_part_color__catalog_item",
                )
                .all()
                .order_by("set_num", "name")
            )

            if q:
                set_qs = set_qs.filter(
                    Q(name__icontains=q)
                    | Q(set_num__icontains=q)
                    | Q(theme__name__icontains=q)
                )
            if theme_param:
                set_qs = set_qs.filter(theme_id=theme_param)
            if year_param.isdigit():
                set_qs = set_qs.filter(year_released=int(year_param))

            for row in set_qs[:limit]:
                theme = getattr(row, "theme", None)
                piece_count = getattr(row, "official_piece_count", 0) or 0
                parts_total = Decimal("0")
                missing_total = Decimal("0")
                priced_quantity = 0
                required_quantity = 0
                owned_quantity = 0
                remaining_owned_quantities = {}
                for set_part in row.parts.all():
                    required_quantity += set_part.quantity
                    effective_part_color_id = set_part.part_color.effective_part_color_id
                    available_owned = remaining_owned_quantities.setdefault(
                        effective_part_color_id,
                        owned_quantities.get(effective_part_color_id, 0),
                    )
                    owned_for_part = min(
                        available_owned,
                        set_part.quantity,
                    )
                    remaining_owned_quantities[effective_part_color_id] -= owned_for_part
                    owned_quantity += owned_for_part
                    item = getattr(set_part.part_color, "effective_catalog_item", None)
                    price = catalog_storefront_price(item)
                    if price is not None:
                        parts_total += price * set_part.quantity
                        missing_total += price * (set_part.quantity - owned_for_part)
                        priced_quantity += set_part.quantity
                set_price = (
                    catalog_storefront_price(row.catalog_item)
                    if catalog_storefront_price(row.catalog_item) is not None
                    else parts_total
                )
                direct_owned = directly_owned_sets.get(row.id)
                if direct_owned:
                    owned_quantity = required_quantity
                    missing_total = Decimal("0")

                subtitle_parts = [
                    row.set_num or "",
                    getattr(theme, "name", "") if theme else "",
                    f"{piece_count} pcs" if piece_count else "",
                ]

                results.append({
                    "id": row.id,
                    "type": "set",
                    "title": row.name or row.set_num or "Unnamed Set",
                    "subtitle": " • ".join([x for x in subtitle_parts if x]),
                    "image_url": row.image_url or "",
                    "search_text": " ".join([
                        row.name or "",
                        row.set_num or "",
                        getattr(theme, "name", "") if theme else "",
                        str(piece_count),
                    ]).strip(),
                    "meta": {
                        "set_num": row.set_num or "",
                        "theme_name": getattr(theme, "name", "") if theme else "",
                        "official_piece_count": piece_count,
                        "year_released": row.year_released,
                        "current_price": str(set_price),
                        "parts_total_price": str(parts_total),
                        "priced_part_quantity": priced_quantity,
                        "missing_parts_price": str(missing_total),
                        "inventory_savings": str(parts_total - missing_total),
                        "has_inventory_match": request.user.is_authenticated,
                        "required_part_quantity": required_quantity,
                        "owned_part_quantity": owned_quantity,
                        "missing_part_quantity": max(required_quantity - owned_quantity, 0),
                        "ownership_percent": round(
                            owned_quantity / required_quantity * 100
                        ) if required_quantity else (100 if direct_owned else 0),
                        "is_in_collection": bool(direct_owned),
                        "collection_set_locked": direct_owned.is_locked if direct_owned else False,
                    },
                })

        if include_catalog:
            cat_qs = CatalogItem.objects.all().order_by("sku", "id")

            if q:
                cat_qs = cat_qs.filter(
                    Q(sku__icontains=q)
                    | Q(notes__icontains=q)
                )

            for row in cat_qs[:limit]:
                title = row.sku or f"Catalog Item {row.id}"
                subtitle_bits = []

                if getattr(row, "base_price_override", None):
                    subtitle_bits.append(f"Base: {row.base_price_override}")

                subtitle_bits.append("Active" if row.is_active else "Inactive")

                results.append({
                    "id": row.id,
                    "type": "catalog",
                    "title": title,
                    "subtitle": " • ".join(subtitle_bits) or "Catalog Item",
                    "image_url": "",
                    "search_text": " ".join([
                        row.sku or "",
                        row.notes or "",
                    ]).strip(),
                    "meta": {
                        "sku": row.sku or "",
                        "is_active": row.is_active,
                        "base_price_override": str(row.base_price_override or ""),
                        "force_override": bool(getattr(row, "force_override", False)),
                        "notes": row.notes or "",
                    },
                })

        if q:
            tokens = [t.strip().lower() for t in q.split() if t.strip()]
            if tokens:
                results = [item for item in results if tokens_match(item, tokens)]

            q_lower = q.lower()
            results.sort(key=lambda item: rank_result(item, q_lower))
        else:
            results.sort(key=lambda item: (item["type"], item["title"].lower()))

        return Response(results[:limit])
