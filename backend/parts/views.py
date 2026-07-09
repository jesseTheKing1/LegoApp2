import logging

from django.db import connection
from django.db.utils import OperationalError, ProgrammingError
from rest_framework import viewsets, filters
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
        rows = (
            PartColor.objects
            .select_related("part", "color", "catalog_item")
            .only(
                "id",
                "part_id",
                "color_id",
                "catalog_item_id",
                "variant",
                "part_color_code",
                "description",
                "image_url_1",
                "image_url_2",
                "part__id",
                "part__part_id",
                "part__name",
                "part__general_category",
                "part__specific_category",
                "part__actual_category",
                "part__image_url",
                "color__id",
                "color__lego_id",
                "color__name",
                "color__hex",
                "color__is_transparent",
                "color__is_metallic",
                "catalog_item__id",
                "catalog_item__sku",
                "catalog_item__is_active",
                "catalog_item__base_price_override",
                "catalog_item__force_override",
                "catalog_item__lego_reference_price",
                "catalog_item__bricklink_reference_price",
                "catalog_item__notes",
            )
            .order_by("part__part_id", "color__name", "variant")
        )
        q = (request.query_params.get("search") or "").strip().lower()
        payload = []
        for row in rows:
            part = row.part
            color = row.color
            catalog_item = row.catalog_item
            haystack = " ".join([
                row.part_color_code or "",
                row.description or "",
                row.variant or "",
                part.part_id or "",
                part.name or "",
                part.general_category or "",
                part.specific_category or "",
                part.actual_category or "",
                color.name or "",
                color.hex or "",
                catalog_item.sku if catalog_item else "",
            ]).lower()
            if q and q not in haystack:
                continue

            catalog_payload = None
            if catalog_item:
                current_price = (
                    catalog_item.base_price_override
                    if catalog_item.force_override or catalog_item.base_price_override is not None
                    else None
                )
                catalog_payload = {
                    "id": catalog_item.id,
                    "sku": catalog_item.sku,
                    "is_active": catalog_item.is_active,
                    "base_price_override": catalog_item.base_price_override,
                    "force_override": catalog_item.force_override,
                    "lego_reference_price": catalog_item.lego_reference_price,
                    "bricklink_reference_price": catalog_item.bricklink_reference_price,
                    "current_price": current_price,
                    "pricing_source": "manual_override" if catalog_item.base_price_override is not None else "none",
                    "current_cost": None,
                    "margin_amount": None,
                    "margin_percent": None,
                    "notes": catalog_item.notes,
                }

            payload.append({
                "id": row.id,
                "part": PartSerializer(part).data,
                "color": ColorSerializer(color).data,
                "root_part_color": None,
                "effective_part_color_id": row.id,
                "variant": row.variant,
                "part_color_code": row.part_color_code,
                "description": row.description,
                "image_url_1": row.image_url_1,
                "image_url_2": row.image_url_2,
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
            return self.legacy_list_response(request)
        except Exception:
            logger.exception("PartColor list failed unexpectedly; returning legacy payload.")
            return self.legacy_list_response(request)
