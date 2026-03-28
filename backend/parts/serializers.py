from rest_framework import serializers
from .models import Color, Part, PartColor
from catalog.models import CatalogItem
from catalog.serializers import CatalogItemMiniSerializer


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

    catalog_item = CatalogItemMiniSerializer(read_only=True)

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
        default="",
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