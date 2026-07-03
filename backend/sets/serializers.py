from django.db import transaction
from django.db.models import Sum, F
from decimal import Decimal
from rest_framework import serializers

from .models import Set, SetPart, SetMinifig
from parts.models import PartColor
from parts.serializers import PartColorSerializer
from minifigs.models import Minifig, Theme
from minifigs.serializers import MinifigSerializer, ThemeSerializer
from catalog.models import CatalogItem
from inventory.collection import owned_part_color_quantities


def catalog_storefront_price(item):
    """Resolve the best customer-facing price available on a catalog item."""
    if not item:
        return None
    return (
        item.current_price
        if item.current_price is not None
        else item.bricklink_reference_price
        if item.bricklink_reference_price is not None
        else item.lego_reference_price
    )


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)

    class Meta:
        model = CatalogItem
        fields = ["id", "sku", "base_price_override", "force_override", "current_price", "notes"]


# -----------------------------
# READ SERIALIZERS
# -----------------------------

class SetPartReadSerializer(serializers.ModelSerializer):
    part_color_detail = PartColorSerializer(source="part_color", read_only=True)
    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    owned_quantity = serializers.SerializerMethodField()
    missing_quantity = serializers.SerializerMethodField()
    missing_line_total = serializers.SerializerMethodField()

    def get_unit_price(self, obj):
        item = getattr(obj.part_color, "catalog_item", None)
        return catalog_storefront_price(item)

    def get_line_total(self, obj):
        price = self.get_unit_price(obj)
        return price * obj.quantity if price is not None else None

    def _owned_map(self):
        root = self.root
        if hasattr(root, "_owned_catalog_quantities"):
            return root._owned_catalog_quantities
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            root._owned_catalog_quantities = {}
            return root._owned_catalog_quantities
        root._owned_catalog_quantities = owned_part_color_quantities(request.user)
        return root._owned_catalog_quantities

    def get_owned_quantity(self, obj):
        return min(self._owned_map().get(obj.part_color_id, 0), obj.quantity)

    def get_missing_quantity(self, obj):
        return max(obj.quantity - self.get_owned_quantity(obj), 0)

    def get_missing_line_total(self, obj):
        price = self.get_unit_price(obj)
        return price * self.get_missing_quantity(obj) if price is not None else None

    class Meta:
        model = SetPart
        fields = [
            "id",
            "part_color",
            "part_color_detail",
            "quantity",
            "instruction_page",
            "sort_order",
            "bag_number",
            "step_number",
            "is_visible",
            "is_structural",
            "color_match_mode",
            "notes",
            "unit_price",
            "line_total",
            "owned_quantity",
            "missing_quantity",
            "missing_line_total",
        ]


class SetMinifigReadSerializer(serializers.ModelSerializer):
    minifig_detail = MinifigSerializer(source="minifig", read_only=True)

    class Meta:
        model = SetMinifig
        fields = [
            "id",
            "minifig",
            "minifig_detail",
            "quantity",
            "sort_order",
            "bag_number",
            "is_required",
            "notes",
        ]


class SetReadSerializer(serializers.ModelSerializer):
    parts = SetPartReadSerializer(many=True, read_only=True)
    minifigs = SetMinifigReadSerializer(many=True, read_only=True)
    theme = ThemeSerializer(read_only=True)
    catalog_item = CatalogItemMiniSerializer(read_only=True)
    parts_total_price = serializers.SerializerMethodField()
    missing_parts_price = serializers.SerializerMethodField()
    inventory_savings = serializers.SerializerMethodField()
    priced_part_quantity = serializers.SerializerMethodField()

    def _part_rows(self, obj):
        serializer = SetPartReadSerializer(obj.parts.all(), many=True, context=self.context)
        return serializer

    def get_parts_total_price(self, obj):
        total = Decimal("0")
        for part in obj.parts.all():
            item = getattr(part.part_color, "catalog_item", None)
            price = catalog_storefront_price(item)
            if price is not None:
                total += price * part.quantity
        return total

    def get_missing_parts_price(self, obj):
        serializer = self._part_rows(obj)
        total = Decimal("0")
        for part in obj.parts.all():
            amount = serializer.child.get_missing_line_total(part)
            if amount is not None:
                total += amount
        return total

    def get_inventory_savings(self, obj):
        return self.get_parts_total_price(obj) - self.get_missing_parts_price(obj)

    def get_priced_part_quantity(self, obj):
        return sum(
            part.quantity for part in obj.parts.all()
            if catalog_storefront_price(getattr(part.part_color, "catalog_item", None)) is not None
        )

    class Meta:
        model = Set
        fields = [
            "id",
            "set_num",
            "name",
            "image_url",
            "theme",
            "official_piece_count",
            "year_released",
            "catalog_item",
            "parts",
            "minifigs",
            "parts_total_price",
            "missing_parts_price",
            "inventory_savings",
            "priced_part_quantity",
        ]


# -----------------------------
# WRITE SERIALIZERS
# -----------------------------

class SetPartWriteSerializer(serializers.ModelSerializer):
    part_color_id = serializers.PrimaryKeyRelatedField(
        queryset=PartColor.objects.select_related("part", "color").all(),
        source="part_color",
    )

    class Meta:
        model = SetPart
        fields = [
            "part_color_id",
            "quantity",
            "instruction_page",
            "sort_order",
            "bag_number",
            "step_number",
            "is_visible",
            "is_structural",
            "color_match_mode",
            "notes",
        ]


class SetMinifigWriteSerializer(serializers.ModelSerializer):
    minifig_id = serializers.PrimaryKeyRelatedField(
        queryset=Minifig.objects.all(),
        source="minifig",
    )

    class Meta:
        model = SetMinifig
        fields = [
            "minifig_id",
            "quantity",
            "sort_order",
            "bag_number",
            "is_required",
            "notes",
        ]


class SetWriteSerializer(serializers.ModelSerializer):
    theme_id = serializers.PrimaryKeyRelatedField(
        queryset=Theme.objects.all(),
        source="theme",
        allow_null=True,
        required=False,
    )

    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        allow_null=True,
        required=False,
    )

    parts = SetPartWriteSerializer(many=True, required=False)
    minifigs = SetMinifigWriteSerializer(many=True, required=False)

    class Meta:
        model = Set
        fields = [
            "id",
            "set_num",
            "name",
            "image_url",
            "official_piece_count",
            "year_released",
            "theme_id",
            "catalog_item_id",
            "parts",
            "minifigs",
        ]

    @transaction.atomic
    def create(self, validated_data):
        parts_data = validated_data.pop("parts", [])
        minifigs_data = validated_data.pop("minifigs", [])

        set_obj = Set.objects.create(**validated_data)

        for part_data in parts_data:
            SetPart.objects.create(set=set_obj, **part_data)

        for minifig_data in minifigs_data:
            SetMinifig.objects.create(set=set_obj, **minifig_data)

        return set_obj

    @transaction.atomic
    def update(self, instance, validated_data):
        parts_data = validated_data.pop("parts", None)
        minifigs_data = validated_data.pop("minifigs", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if parts_data is not None:
            instance.parts.all().delete()
            for part_data in parts_data:
                SetPart.objects.create(set=instance, **part_data)

        if minifigs_data is not None:
            instance.minifigs.all().delete()
            for minifig_data in minifigs_data:
                SetMinifig.objects.create(set=instance, **minifig_data)

        return instance

    def to_representation(self, instance):
        return SetReadSerializer(instance, context=self.context).data
