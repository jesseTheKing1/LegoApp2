# minifigs/serializers.py
from rest_framework import serializers
from .models import Theme, Minifig
from catalog.models import CatalogItem

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
    theme_id = serializers.PrimaryKeyRelatedField(queryset=Theme.objects.all(), source="theme", write_only=True)

    catalog_item = CatalogItemMiniSerializer(read_only=True)
    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # NEW:
    create_catalog_item = serializers.BooleanField(write_only=True, required=False, default=False)
    base_price_override = serializers.DecimalField(
        write_only=True,
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=2,
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
            "create_catalog_item",
            "base_price_override",
        ]

    def create(self, validated_data):
        create_catalog = validated_data.pop("create_catalog_item", False)
        base_price = validated_data.pop("base_price_override", None)

        mf = Minifig.objects.create(**validated_data)

        if create_catalog and mf.catalog_item is None:
            sku = f"MINIFIG-{mf.bricklink_id}".upper()
            ci = CatalogItem.objects.create(
                sku=sku,
                is_active=True,
                base_price_override=base_price,
                force_override=True,   # optional, but usually what you want for “hard price”
                notes="Auto-created from Minifig create",
            )
            mf.catalog_item = ci
            mf.save(update_fields=["catalog_item"])

        return mf

    def update(self, instance, validated_data):
        create_catalog = validated_data.pop("create_catalog_item", False)
        base_price = validated_data.pop("base_price_override", None)

        # normal updates
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        # optional: if user toggles create_catalog_item on edit
        if create_catalog and instance.catalog_item is None:
            sku = f"MINIFIG-{instance.bricklink_id}".upper()
            ci = CatalogItem.objects.create(
                sku=sku,
                is_active=True,
                base_price_override=base_price,
                force_override=True,
                notes="Auto-created from Minifig edit",
            )
            instance.catalog_item = ci
            instance.save(update_fields=["catalog_item"])

        # optional: if they provided base_price_override and catalog exists, update it
        if base_price is not None and instance.catalog_item_id:
            instance.catalog_item.base_price_override = base_price
            instance.catalog_item.force_override = True
            instance.catalog_item.save(update_fields=["base_price_override", "force_override"])

        return instance
