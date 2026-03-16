from rest_framework import serializers
from .models import Location, InventoryRecord
from catalog.models import CatalogItem


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        read_only=True,
    )
    pricing_source = serializers.CharField(read_only=True)

    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "sku",
            "is_active",
            "base_price_override",
            "force_override",
            "current_price",
            "pricing_source",
            "notes",
        ]


class LocationSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    parent_code = serializers.CharField(source="parent.code", read_only=True)

    class Meta:
        model = Location
        fields = [
            "id",
            "name",
            "code",
            "location_type",
            "parent",
            "parent_name",
            "parent_code",
            "notes",
            "is_active",
        ]


class InventoryRecordSerializer(serializers.ModelSerializer):
    catalog_item = CatalogItemMiniSerializer(read_only=True)
    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        write_only=True,
    )

    location = LocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source="location",
        write_only=True,
    )

    quantity_available = serializers.IntegerField(read_only=True)
    total_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    total_available_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = InventoryRecord
        fields = [
            "id",
            "catalog_item",
            "catalog_item_id",
            "location",
            "location_id",
            "condition",
            "source_type",
            "quantity_on_hand",
            "quantity_reserved",
            "quantity_available",
            "unit_cost",
            "total_cost",
            "total_available_cost",
            "acquired_at",
            "notes",
            "is_sellable",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "quantity_available",
            "total_cost",
            "total_available_cost",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        quantity_on_hand = attrs.get(
            "quantity_on_hand",
            getattr(self.instance, "quantity_on_hand", 0),
        )
        quantity_reserved = attrs.get(
            "quantity_reserved",
            getattr(self.instance, "quantity_reserved", 0),
        )

        if quantity_reserved > quantity_on_hand:
            raise serializers.ValidationError(
                {"quantity_reserved": "Reserved quantity cannot be greater than quantity on hand."}
            )

        return attrs