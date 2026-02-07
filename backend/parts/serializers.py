from rest_framework import serializers
from .models import Color, Part, PartColor
from catalog.models import CatalogItem


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    """Small read-only view of the catalog item (good for embedding in PartColor)."""
    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "sku",
            "is_active",
            "base_price_override",
            "force_override",
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
    # read-only nested objects (nice for frontend rendering)
    part = PartSerializer(read_only=True)
    color = ColorSerializer(read_only=True)

    # write-only IDs (nice for create/update)
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

    # READ: include catalog item info on GET
    catalog_item = CatalogItemMiniSerializer(read_only=True)

    # WRITE: attach/detach catalog item by id on POST/PATCH
    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        write_only=True,
        required=False,
        allow_null=True,
    )

    variant = serializers.CharField(
        required=False,
        allow_blank=True,
        default=""   # ✅ key change
    )
    class Meta:
        model = PartColor
        fields = [
            "id",
            "part",
            "color",
            "part_id",
            "color_id",
            "variant",
            "part_color_code",
            "description",
            "image_url_1",
            "image_url_2",
            "catalog_item",
            "catalog_item_id",
        ]

    def validate_part_color_code(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("part_color_code cannot be blank.")
        return v
