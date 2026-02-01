from rest_framework import serializers
from .models import Color, Part, PartColor


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
    variant = serializers.CharField(required=False, allow_blank=True)

    # catalog_item is in another app; keep it optional + ID-based
    catalog_item_id = serializers.IntegerField(required=False, allow_null=True)

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
            "catalog_item_id",
        ]

    def validate_part_color_code(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("part_color_code cannot be blank.")
        return v

    def create(self, validated_data):
        # catalog_item_id comes in as raw int; only assign if provided
        catalog_item_id = validated_data.pop("catalog_item_id", None)

        obj = super().create(validated_data)

        if catalog_item_id is not None:
            # Set by id without importing CatalogItem model directly (keeps coupling low)
            obj.catalog_item_id = catalog_item_id
            obj.save(update_fields=["catalog_item"])

        return obj

    def update(self, instance, validated_data):
        catalog_item_id = validated_data.pop("catalog_item_id", None)

        obj = super().update(instance, validated_data)

        if catalog_item_id is not None:
            obj.catalog_item_id = catalog_item_id
            obj.save(update_fields=["catalog_item"])

        return obj
