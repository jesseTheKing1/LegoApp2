from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from parts.models import PartColor
from minifigs.models import Minifig
from sets.models import Set
from catalog.models import CatalogItem


class LibraryPickerLookupView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        type_param = (request.query_params.get("type") or "all").strip().lower()

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

        if include_part_colors:
            pc_qs = (
                PartColor.objects
                .select_related("part", "color")
                .all()
                .order_by("part__general_category", "part__part_id", "color__name", "variant")
            )

            if q:
                pc_qs = pc_qs.filter(
                    Q(part_color_code__icontains=q)
                    | Q(description__icontains=q)
                    | Q(variant__icontains=q)
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
                        getattr(part, "part_id", "") if part else "",
                        getattr(part, "name", "") if part else "",
                        getattr(part, "general_category", "") if part else "",
                        getattr(part, "specific_category", "") if part else "",
                        getattr(part, "actual_category", "") if part else "",
                        getattr(color, "name", "") if color else "",
                    ]).strip(),
                    "meta": {
                        "part_color_code": row.part_color_code or "",
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
                .select_related("theme")
                .all()
                .order_by("set_num", "name")
            )

            if q:
                set_qs = set_qs.filter(
                    Q(name__icontains=q)
                    | Q(set_num__icontains=q)
                    | Q(theme__name__icontains=q)
                )

            for row in set_qs[:limit]:
                theme = getattr(row, "theme", None)
                piece_count = getattr(row, "official_piece_count", 0) or 0

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

                if row.is_active is not None:
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
            q_lower = q.lower()
            results.sort(
                key=lambda x: (
                    0 if x["title"].lower().startswith(q_lower) else 1,
                    0 if q_lower in x["search_text"].lower() else 1,
                    x["title"].lower(),
                )
            )
        else:
            results.sort(key=lambda x: (x["type"], x["title"].lower()))

        return Response(results[:limit])