from rest_framework import serializers
from .models import CatalogItem, CatalogCostEntry


class CatalogCostEntrySerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
    )
    total_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
    )
    landed_unit_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
    )

    class Meta:
        model = CatalogCostEntry
        fields = [
            "id",
            "catalog_item",
            "source",
            "supplier_name",
            "quantity",
            "unit_cost",
            "shipping_cost",
            "tax_cost",
            "other_cost",
            "purchased_at",
            "reference",
            "notes",
            "subtotal",
            "total_cost",
            "landed_unit_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "total_cost",
            "landed_unit_cost",
            "created_at",
            "updated_at",
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value


class CatalogItemSerializer(serializers.ModelSerializer):
    # -------- sell pricing / derived --------
    current_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        read_only=True,
    )
    pricing_source = serializers.CharField(read_only=True)

    # -------- cost / analytics --------
    latest_landed_unit_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    weighted_average_unit_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    current_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    margin_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    margin_percent = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    lego_vs_bricklink_diff_percent = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    total_units_purchased = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        read_only=True,
    )

    cost_entries = CatalogCostEntrySerializer(many=True, read_only=True)

    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "sku",
            "is_active",

            # sell pricing controls
            "base_price_override",
            "force_override",

            # reference pricing
            "lego_reference_price",
            "bricklink_reference_price",

            # resolved selling price
            "current_price",
            "pricing_source",

            # cost analytics
            "latest_landed_unit_cost",
            "weighted_average_unit_cost",
            "current_cost",
            "margin_amount",
            "margin_percent",
            "lego_vs_bricklink_diff_percent",
            "total_units_purchased",
            "total_spent",

            "notes",
            "cost_entries",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "current_price",
            "pricing_source",
            "latest_landed_unit_cost",
            "weighted_average_unit_cost",
            "current_cost",
            "margin_amount",
            "margin_percent",
            "lego_vs_bricklink_diff_percent",
            "total_units_purchased",
            "total_spent",
            "cost_entries",
            "created_at",
            "updated_at",
        ]

    def validate_sku(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("SKU cannot be blank.")
        return v

class CatalogItemMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "sku",
            "is_active",
            "base_price_override",
            "force_override",
            "lego_reference_price",
            "bricklink_reference_price",
            "current_price",
            "pricing_source",
            "current_cost",
            "margin_amount",
            "margin_percent",
            "notes",
        ]


class CatalogItemPickerSerializer(serializers.ModelSerializer):
    """Lean catalog representation for selects and attachment pickers."""
    current_price = serializers.DecimalField(
        max_digits=10, decimal_places=4, read_only=True, allow_null=True
    )

    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "sku",
            "is_active",
            "base_price_override",
            "force_override",
            "lego_reference_price",
            "bricklink_reference_price",
            "current_price",
            "notes",
        ]
