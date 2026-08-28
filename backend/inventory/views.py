from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db import transaction
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

    @staticmethod
    def _pricing_rows(qs):
        grouped = (
            qs.filter(is_sellable=True, catalog_item__is_active=True)
            .values("catalog_item_id")
            .annotate(
                quantity=Sum(F("quantity_on_hand") - F("quantity_reserved")),
            )
            .filter(quantity__gt=0)
            .order_by("catalog_item__sku")
        )
        catalog_ids = [row["catalog_item_id"] for row in grouped]
        from catalog.models import CatalogItem

        items = {
            item.id: item
            for item in CatalogItem.objects.filter(id__in=catalog_ids)
            .select_related("set", "set__theme", "minifig", "part_color__part", "part_color__color")
        }
        rows = []
        for group in grouped:
            item = items[group["catalog_item_id"]]
            product_type = "catalog"
            name = item.sku
            subtitle = ""
            image_url = ""
            if hasattr(item, "set") and item.set:
                product_type = "set"
                name = item.set.name
                subtitle = item.set.set_num
                image_url = item.set.image_url
            elif hasattr(item, "minifig") and item.minifig:
                product_type = "minifig"
                name = item.minifig.name
                subtitle = item.minifig.bricklink_id
                image_url = item.minifig.image_url
            elif hasattr(item, "part_color") and item.part_color:
                product_type = "part"
                name = item.part_color.part.name
                subtitle = f"{item.part_color.part.part_id} · {item.part_color.color.name}"
                image_url = item.part_color.image_url_1 or item.part_color.image_url_2 or item.part_color.part.image_url

            quantity = group["quantity"] or 0
            reference = item.bricklink_reference_price
            current = item.current_price
            rows.append({
                "catalog_item_id": item.id,
                "sku": item.sku,
                "product_type": product_type,
                "name": name,
                "subtitle": subtitle,
                "image_url": image_url,
                "quantity_available": quantity,
                "bricklink_reference_price": reference,
                "current_price": current,
                "reference_total": reference * quantity if reference is not None else None,
                "current_total": current * quantity if current is not None else None,
            })
        return sorted(rows, key=lambda row: ({"set": 0, "minifig": 1, "part": 2}.get(row["product_type"], 3), row["name"]))

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

        pricing_items = self._pricing_rows(qs)
        sellable_available_units = sum(row["quantity_available"] for row in pricing_items)
        bricklink_reference_value = sum(
            (row["reference_total"] or Decimal("0")) for row in pricing_items
        )
        current_sell_value = sum(
            (row["current_total"] or Decimal("0")) for row in pricing_items
        )

        return Response({
            "summary": {
                "total_units": total_units,
                "total_reserved": total_reserved,
                "total_available": total_available,
                "active_skus": active_skus,
                "total_cost": total_cost,
                "total_available_cost": total_available_cost,
                "bricklink_reference_value": bricklink_reference_value,
                "current_sell_value": current_sell_value,
                "sellable_available_units": sellable_available_units,
            },
            "by_condition": by_condition,
            "by_location": by_location,
            "product_type_counts": product_type_counts,
            "pricing_items": pricing_items,
        })

    def post(self, request):
        try:
            markup = Decimal(str(request.data.get("markup_percent", "")))
        except (InvalidOperation, TypeError):
            return Response({"detail": "Enter a valid markup percentage."}, status=400)
        if markup < Decimal("-100") or markup > Decimal("1000"):
            return Response({"detail": "Markup must be between -100% and 1000%."}, status=400)

        qs = InventoryRecord.objects.filter(is_active=True)
        rows = self._pricing_rows(qs)
        multiplier = Decimal("1") + (markup / Decimal("100"))
        from catalog.models import CatalogItem

        updated = 0
        skipped = 0
        with transaction.atomic():
            for row in rows:
                if row["bricklink_reference_price"] is None:
                    skipped += 1
                    continue
                price = (row["bricklink_reference_price"] * multiplier).quantize(
                    Decimal("0.0001"), rounding=ROUND_HALF_UP
                )
                CatalogItem.objects.filter(pk=row["catalog_item_id"]).update(
                    base_price_override=price
                )
                updated += 1
        return Response({"updated": updated, "skipped": skipped, "markup_percent": markup})


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
