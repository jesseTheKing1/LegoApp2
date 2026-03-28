from decimal import Decimal

from django.db.models import Count, Sum, F, ExpressionWrapper, DecimalField
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Location, InventoryRecord
from .serializers import LocationSerializer, InventoryRecordSerializer


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