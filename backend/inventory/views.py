from decimal import Decimal

from django.db.models import Count, Sum, F, ExpressionWrapper, DecimalField
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Location, InventoryRecord, CollectionSet, CollectionPart, CollectionMinifig
from .serializers import (
    LocationSerializer, InventoryRecordSerializer, CollectionSetSerializer,
    CollectionPartSerializer, CollectionMinifigSerializer,
)


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.select_related("parent").all().order_by("name")
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        is_active = self.request.query_params.get("is_active")
        location_type = self.request.query_params.get("location_type")

        if is_active is not None:
            value = str(is_active).lower() in ["1", "true", "yes"]
            qs = qs.filter(is_active=value)

        if location_type:
            qs = qs.filter(location_type=location_type)

        return qs


class InventoryRecordViewSet(viewsets.ModelViewSet):
    queryset = (
        InventoryRecord.objects
        .select_related("catalog_item", "location", "location__parent")
        .all()
        .order_by("-updated_at", "-id")
    )
    serializer_class = InventoryRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        catalog_item_id = self.request.query_params.get("catalog_item")
        location_id = self.request.query_params.get("location")
        is_active = self.request.query_params.get("is_active")

        if catalog_item_id:
            qs = qs.filter(catalog_item_id=catalog_item_id)

        if location_id:
            qs = qs.filter(location_id=location_id)

        if is_active is not None:
            value = str(is_active).lower() in ["1", "true", "yes"]
            qs = qs.filter(is_active=value)

        return qs


class InventoryDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            InventoryRecord.objects
            .select_related("catalog_item", "location")
            .filter(is_active=True)
        )

        total_units = qs.aggregate(v=Sum("quantity_on_hand"))["v"] or 0
        total_reserved = qs.aggregate(v=Sum("quantity_reserved"))["v"] or 0
        total_available = total_units - total_reserved

        active_skus = (
            qs.values("catalog_item_id")
            .distinct()
            .count()
        )

        cost_expr = ExpressionWrapper(
            F("unit_cost") * F("quantity_on_hand"),
            output_field=DecimalField(max_digits=14, decimal_places=4),
        )
        available_cost_expr = ExpressionWrapper(
            F("unit_cost") * (F("quantity_on_hand") - F("quantity_reserved")),
            output_field=DecimalField(max_digits=14, decimal_places=4),
        )

        total_cost = qs.exclude(unit_cost__isnull=True).aggregate(v=Sum(cost_expr))["v"] or Decimal("0")
        total_available_cost = (
            qs.exclude(unit_cost__isnull=True).aggregate(v=Sum(available_cost_expr))["v"]
            or Decimal("0")
        )

        by_condition = list(
            qs.values("condition")
            .annotate(
                count=Count("id"),
                quantity=Sum("quantity_on_hand"),
            )
            .order_by("condition")
        )

        by_location = list(
            qs.values("location__id", "location__name", "location__code")
            .annotate(
                count=Count("id"),
                quantity=Sum("quantity_on_hand"),
            )
            .order_by("location__name")
        )

        product_type_counts = {
            "sets": qs.filter(catalog_item__set__isnull=False).count(),
            "minifigs": qs.filter(catalog_item__minifig__isnull=False).count(),
            "part_colors": qs.filter(catalog_item__part_color__isnull=False).count(),
        }

        return Response({
            "summary": {
                "total_units": total_units,
                "total_reserved": total_reserved,
                "total_available": total_available,
                "active_skus": active_skus,
                "total_cost": total_cost,
                "total_available_cost": total_available_cost,
            },
            "by_condition": by_condition,
            "by_location": by_location,
            "product_type_counts": product_type_counts,
        })


class OwnedCollectionMixin:
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)


class CollectionSetViewSet(OwnedCollectionMixin, viewsets.ModelViewSet):
    queryset = CollectionSet.objects.select_related("lego_set", "lego_set__theme", "lego_set__catalog_item").prefetch_related("lego_set__parts")
    serializer_class = CollectionSetSerializer


class CollectionPartViewSet(OwnedCollectionMixin, viewsets.ModelViewSet):
    queryset = CollectionPart.objects.select_related(
        "part_color",
        "part_color__part",
        "part_color__color",
        "part_color__catalog_item",
        "part_color__root_part_color",
        "part_color__root_part_color__catalog_item",
    )
    serializer_class = CollectionPartSerializer


class CollectionMinifigViewSet(OwnedCollectionMixin, viewsets.ModelViewSet):
    queryset = CollectionMinifig.objects.select_related("minifig", "minifig__theme", "minifig__catalog_item")
    serializer_class = CollectionMinifigSerializer


class CollectionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sets = CollectionSet.objects.filter(user=request.user).select_related("lego_set__catalog_item").prefetch_related("lego_set__parts")
        loose_parts = CollectionPart.objects.filter(user=request.user).select_related(
            "part_color__catalog_item",
            "part_color__root_part_color__catalog_item",
        )
        minifigs = CollectionMinifig.objects.filter(user=request.user).select_related("minifig__catalog_item")
        set_pieces = sum(sum(p.quantity for p in row.lego_set.parts.all()) * row.quantity for row in sets)
        loose_piece_count = sum(row.quantity for row in loose_parts)
        set_value = sum(
            (row.lego_set.catalog_item.bricklink_reference_price or Decimal("0")) * row.quantity
            for row in sets if row.lego_set.catalog_item
        )
        loose_parts_value = sum(
            (row.part_color.effective_catalog_item.bricklink_reference_price or Decimal("0")) * row.quantity
            for row in loose_parts if row.part_color.effective_catalog_item
        )
        minifig_value = Decimal("0")
        for row in minifigs:
            item = row.minifig.catalog_item
            if not item:
                continue
            price = item.bricklink_reference_price
            minifig_value += (price or Decimal("0")) * row.quantity
        return Response({
            "set_count": sum(row.quantity for row in sets),
            "unique_sets": sets.count(),
            "piece_count": set_pieces + loose_piece_count,
            "loose_piece_count": loose_piece_count,
            "minifig_count": sum(row.quantity for row in minifigs),
            "minifig_value": minifig_value,
            "set_value": set_value,
            "loose_parts_value": loose_parts_value,
            "total_value": set_value + loose_parts_value + minifig_value,
        })
