from rest_framework import serializers
from .models import Theme, Minifig, MinifigIngredient
from catalog.models import CatalogItem
from parts.serializers import PartColorSerializer  # or a smaller “mini” serializer


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = ["id", "sku", "is_active", "base_price_override", "force_override", "notes"]


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ["id", "name", "image_url"]


class MinifigSerializer(serializers.ModelSerializer):
    theme = ThemeSerializer(read_only=True)
    theme_id = serializers.PrimaryKeyRelatedField(
        queryset=Theme.objects.all(),
        source="theme",
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

    class Meta:
        model = Minifig
        fields = [
            "id",
            "bricklink_id",
            "name",
            "image_url",
            "theme",
            "theme_id",
            "catalog_item",
            "catalog_item_id",
        ]
