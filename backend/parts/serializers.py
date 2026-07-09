from rest_framework import serializers
from .models import Color, Part, PartColor
from catalog.models import CatalogItem


class PartColorCatalogItemSerializer(serializers.ModelSerializer):
    """Small pricing payload for list-heavy part-color screens.

    Keep this intentionally cheap. Expensive cost/margin properties walk
    catalog cost_entries and can turn the PartColor list into thousands of
    repeated queries on production data.
    """
    current_price = serializers.DecimalField(
        max_digits=10, decimal_places=4, read_only=True, allow_null=True
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
            "lego_reference_price",
            "bricklink_reference_price",
            "current_price",
            "pricing_source",
            "notes",
        ]


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = [
            "id",
            "lego_id",
            "name",
            "hex",
            "is_transparent",
            "is_metallic",
        ]


class PartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Part
        fields = [
            "id",
            "part_id",
            "name",
            "general_category",
            "specific_category",
            "actual_category",
            "image_url",
        ]


class PartColorSerializer(serializers.ModelSerializer):
    part = PartSerializer(read_only=True)
    color = ColorSerializer(read_only=True)
    root_part_color = serializers.SerializerMethodField()
    effective_catalog_item = serializers.SerializerMethodField()
    effective_part_color_id = serializers.IntegerField(read_only=True)

    part_id = serializers.PrimaryKeyRelatedField(
        queryset=Part.objects.all(),
        source="part",
        write_only=True,
    )
    color_id = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.all(),
        source="color",
        write_only=True,
    )

    catalog_item = PartColorCatalogItemSerializer(read_only=True)

    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        write_only=True,
        required=False,
        allow_null=True,
    )
    root_part_color_id = serializers.PrimaryKeyRelatedField(
        queryset=PartColor.objects.all(),
        source="root_part_color",
        write_only=True,
        required=False,
        allow_null=True,
    )

    variant = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    class Meta:
        model = PartColor
        fields = [
            "id",
            "part",
            "color",
            "root_part_color",
            "part_id",
            "color_id",
            "root_part_color_id",
            "effective_part_color_id",
            "variant",
            "part_color_code",
            "description",
            "image_url_1",
            "image_url_2",
            "catalog_item",
            "effective_catalog_item",
            "catalog_item_id",
        ]

    def validate_part_color_code(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("part_color_code cannot be blank.")
        return v

    def validate(self, attrs):
        attrs = super().validate(attrs)
        root = attrs.get("root_part_color", getattr(self.instance, "root_part_color", None))
        color = attrs.get("color", getattr(self.instance, "color", None))

        if root is not None:
            if self.instance and root.id == self.instance.id:
                raise serializers.ValidationError({
                    "root_part_color_id": "A PartColor cannot be its own root variant group."
                })
            if root.root_part_color_id:
                raise serializers.ValidationError({
                    "root_part_color_id": "Choose the top-level/root PartColor, not another variant."
                })
            if color is not None and root.color_id != color.id:
                raise serializers.ValidationError({
                    "root_part_color_id": "Variant groups must use the same color as the root PartColor."
                })
        return attrs

    def get_root_part_color(self, obj):
        root = obj.root_part_color
        if not root:
            return None
        return {
            "id": root.id,
            "part_color_code": root.part_color_code,
            "variant": root.variant,
            "description": root.description,
            "part": {
                "id": root.part_id,
                "part_id": root.part.part_id,
                "name": root.part.name,
            } if root.part_id else None,
            "color": {
                "id": root.color_id,
                "name": root.color.name,
                "hex": root.color.hex,
            } if root.color_id else None,
            "catalog_item": {
                "id": root.catalog_item_id,
                "sku": root.catalog_item.sku,
            } if root.catalog_item_id else None,
        }

    def get_effective_catalog_item(self, obj):
        item = obj.effective_catalog_item
        return PartColorCatalogItemSerializer(item).data if item else None
