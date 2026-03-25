from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from parts.models import PartColor
from minifigs.models import Minifig
from sets.models import Set


class LibraryPickerLookupView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        type_param = (request.query_params.get("type") or "all").strip().lower()
        limit = min(int(request.query_params.get("limit", 30)), 100)

        allowed_types = {"all", "part_color", "minifig", "set"}
        if type_param not in allowed_types:
            type_param = "all"

        results = []

        include_part_colors = type_param in {"all", "part_color"}
        include_minifigs = type_param in {"all", "minifig"}
        include_sets = type_param in {"all", "set"}

        if include_part_colors:
            pc_qs = (
                PartColor.objects
                .select_related("part", "color", "catalog_item")
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
                part = row.part
                color = row.color

                subtitle_parts = [
                    part.part_id if part else "",
                    color.name if color else "",
                    row.variant or "",
                ]

                results.append({
                    "id": row.id,
                    "type": "part_color",
                    "title": part.name if part else (row.part_color_code or "Unnamed Part Color"),
                    "subtitle": " • ".join([x for x in subtitle_parts if x]),
                    "image_url": (
                        row.image_url_1
                        or row.image_url_2
                        or (part.image_url if part else "")
                        or ""
                    ),
                    "search_text": " ".join([
                        row.part_color_code or "",
                        row.description or "",
                        row.variant or "",
                        part.part_id if part else "",
                        part.name if part else "",
                        part.general_category if part else "",
                        part.specific_category if part else "",
                        part.actual_category if part else "",
                        color.name if color else "",
                    ]).strip(),
                    "meta": {
                        "part_color_code": row.part_color_code,
                        "part_id": part.part_id if part else "",
                        "part_name": part.name if part else "",
                        "general_category": part.general_category if part else "",
                        "specific_category": part.specific_category if part else "",
                        "actual_category": part.actual_category if part else "",
                        "color_name": color.name if color else "",
                        "color_hex": getattr(color, "hex", "") if color else "",
                        "variant": row.variant or "",
                        "description": row.description or "",
                    },
                })

        if include_minifigs:
            mf_qs = (
                Minifig.objects
                .select_related("theme", "catalog_item")
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
                results.append({
                    "id": row.id,
                    "type": "minifig",
                    "title": row.name or row.bricklink_id or "Unnamed Minifig",
                    "subtitle": " • ".join([
                        x for x in [
                            row.bricklink_id or "",
                            row.theme.name if row.theme else "",
                        ] if x
                    ]),
                    "image_url": row.image_url or "",
                    "search_text": " ".join([
                        row.name or "",
                        row.bricklink_id or "",
                        row.theme.name if row.theme else "",
                    ]).strip(),
                    "meta": {
                        "bricklink_id": row.bricklink_id or "",
                        "theme_name": row.theme.name if row.theme else "",
                    },
                })

        if include_sets:
            set_qs = (
                Set.objects
                .select_related("theme", "catalog_item")
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
                subtitle_parts = [
                    row.set_num or "",
                    row.theme.name if row.theme else "",
                    f"{row.official_piece_count} pcs" if row.official_piece_count else "",
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
                        row.theme.name if row.theme else "",
                        str(row.official_piece_count or ""),
                    ]).strip(),
                    "meta": {
                        "set_num": row.set_num or "",
                        "theme_name": row.theme.name if row.theme else "",
                        "official_piece_count": row.official_piece_count or 0,
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