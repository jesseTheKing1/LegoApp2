import logging

from django.db import connection
from django.db.utils import OperationalError, ProgrammingError
from rest_framework import viewsets, filters
from rest_framework import status
from rest_framework.response import Response
from .models import Color, Part, PartColor
from .serializers import ColorSerializer, PartSerializer, PartColorSerializer
from .permissions import IsAdminOrReadOnly


logger = logging.getLogger(__name__)


def table_has_column(table_name, column_name):
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, table_name)
        return any(column.name == column_name for column in columns)
    except Exception:
        return False


class ColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "lego_id", "hex"]
    ordering_fields = ["name", "lego_id"]
    ordering = ["name"]


class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["part_id", "name", "general_category", "specific_category", "actual_category"]
    ordering_fields = ["part_id", "name", "actual_category"]
    ordering = ["part_id"]


class PartColorViewSet(viewsets.ModelViewSet):
    # Part, color, and catalog are all rendered in the list. Joining them here
    # prevents one additional database query per row.
    queryset = (
        PartColor.objects
        .select_related(
            "part",
            "color",
            "catalog_item",
            "root_part_color",
            "root_part_color__part",
            "root_part_color__color",
            "root_part_color__catalog_item",
        )
        .all()
    )
    serializer_class = PartColorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "part_color_code", "variant", "description",
        "root_part_color__part_color_code", "root_part_color__description",
        "part__part_id", "part__name", "part__actual_category",
        "color__name", "color__hex",
    ]
    ordering_fields = ["id", "part_color_code", "variant", "part__part_id", "color__name"]
    ordering = ["part__part_id", "color__name", "variant"]

    def legacy_list_response(self, request):
        sql = """
            SELECT
                pc.id,
                pc.variant,
                pc.part_color_code,
                pc.description,
                pc.image_url_1,
                pc.image_url_2,
                p.id AS part_id_pk,
                p.part_id,
                p.name AS part_name,
                p.general_category,
                p.specific_category,
                p.actual_category,
                p.image_url AS part_image_url,
                c.id AS color_id_pk,
                c.lego_id,
                c.name AS color_name,
                c.hex,
                c.is_transparent,
                c.is_metallic,
                ci.id AS catalog_item_id,
                ci.sku,
                ci.is_active,
                ci.base_price_override,
                ci.force_override,
                ci.lego_reference_price,
                ci.bricklink_reference_price,
                ci.notes
            FROM parts_partcolor pc
            INNER JOIN parts_part p ON p.id = pc.part_id
            INNER JOIN parts_color c ON c.id = pc.color_id
            LEFT JOIN catalog_catalogitem ci ON ci.id = pc.catalog_item_id
            ORDER BY p.part_id, c.name, pc.variant
        """
        q = (request.query_params.get("search") or "").strip().lower()
        payload = []

        with connection.cursor() as cursor:
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, values)) for values in cursor.fetchall()]

        for row in rows:
            haystack = " ".join([
                row.get("part_color_code") or "",
                row.get("description") or "",
                row.get("variant") or "",
                row.get("part_id") or "",
                row.get("part_name") or "",
                row.get("general_category") or "",
                row.get("specific_category") or "",
                row.get("actual_category") or "",
                row.get("color_name") or "",
                row.get("hex") or "",
                row.get("sku") or "",
            ]).lower()
            if q and q not in haystack:
                continue

            catalog_payload = None
            if row.get("catalog_item_id"):
                base_price_override = row.get("base_price_override")
                current_price = (
                    base_price_override
                    if row.get("force_override") or base_price_override is not None
                    else None
                )
                catalog_payload = {
                    "id": row.get("catalog_item_id"),
                    "sku": row.get("sku"),
                    "is_active": row.get("is_active"),
                    "base_price_override": base_price_override,
                    "force_override": row.get("force_override"),
                    "lego_reference_price": row.get("lego_reference_price"),
                    "bricklink_reference_price": row.get("bricklink_reference_price"),
                    "current_price": current_price,
                    "pricing_source": "manual_override" if base_price_override is not None else "none",
                    "current_cost": None,
                    "margin_amount": None,
                    "margin_percent": None,
                    "notes": row.get("notes") or "",
                }

            payload.append({
                "id": row.get("id"),
                "part": {
                    "id": row.get("part_id_pk"),
                    "part_id": row.get("part_id"),
                    "name": row.get("part_name"),
                    "general_category": row.get("general_category") or "",
                    "specific_category": row.get("specific_category") or "",
                    "actual_category": row.get("actual_category") or "",
                    "image_url": row.get("part_image_url") or "",
                },
                "color": {
                    "id": row.get("color_id_pk"),
                    "lego_id": row.get("lego_id"),
                    "name": row.get("color_name"),
                    "hex": row.get("hex") or "",
                    "is_transparent": row.get("is_transparent"),
                    "is_metallic": row.get("is_metallic"),
                },
                "root_part_color": None,
                "effective_part_color_id": row.get("id"),
                "variant": row.get("variant") or "",
                "part_color_code": row.get("part_color_code") or "",
                "description": row.get("description") or "",
                "image_url_1": row.get("image_url_1") or "",
                "image_url_2": row.get("image_url_2") or "",
                "catalog_item": catalog_payload,
                "effective_catalog_item": catalog_payload,
            })
        return Response(payload)

    def list(self, request, *args, **kwargs):
        # Production safety net: if Render is running the new code before the
        # parts.0004 migration has created root_part_color_id, normal ORM
        # PartColor queries crash and the admin page cannot load. In that
        # temporary state, return the legacy payload using only pre-existing
        # columns. Once migrations run, the normal variant-aware serializer is
        # used automatically.
        if not table_has_column(PartColor._meta.db_table, "root_part_color_id"):
            return self.legacy_list_response(request)

        try:
            return super().list(request, *args, **kwargs)
        except (OperationalError, ProgrammingError):
            logger.exception("PartColor variant-aware list failed; returning legacy payload.")
            try:
                return self.legacy_list_response(request)
            except Exception as fallback_error:
                logger.exception("PartColor legacy fallback failed.")
                return Response(
                    {"detail": f"PartColor list failed and fallback failed: {fallback_error}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception:
            logger.exception("PartColor list failed unexpectedly; returning legacy payload.")
            try:
                return self.legacy_list_response(request)
            except Exception as fallback_error:
                logger.exception("PartColor legacy fallback failed.")
                return Response(
                    {"detail": f"PartColor list failed and fallback failed: {fallback_error}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
