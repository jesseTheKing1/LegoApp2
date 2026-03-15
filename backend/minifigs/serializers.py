from rest_framework import serializers
from .models import Theme, Minifig, MinifigIngredient
from catalog.models import CatalogItem
from catalog.serializers import CatalogItemSerializer
from parts.models import PartColor
from parts.serializers import PartColorSerializer


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = ["id", "sku", "is_active", "base_price_override", "force_override", "notes"]


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theme
        fields = ["id", "name", "image_url"]


class MinifigIngredientSerializer(serializers.ModelSerializer):
    part_color = PartColorSerializer(read_only=True)
    part_color_id = serializers.PrimaryKeyRelatedField(
        queryset=PartColor.objects.select_related("part", "color").all(),
        source="part_color",
        write_only=True,
    )

    class Meta:
        model = MinifigIngredient
        fields = [
            "id",
            "part_color",
            "part_color_id",
            "quantity",
            "role",
            "is_required",
            "sort_order",
            "notes",
        ]


class MinifigSerializer(serializers.ModelSerializer):
    theme = ThemeSerializer(read_only=True)
    theme_id = serializers.PrimaryKeyRelatedField(
        queryset=Theme.objects.all(),
        source="theme",
        write_only=True,
        required=False,
        allow_null=True,
    )

    catalog_item = CatalogItemMiniSerializer(read_only=True)
    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        write_only=True,
        required=False,
        allow_null=True,
    )

    create_catalog_item = serializers.BooleanField(write_only=True, required=False, default=False)
    base_price_override = serializers.DecimalField(
        write_only=True,
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=2,
    )

    ingredients = MinifigIngredientSerializer(many=True, required=False)

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
            "ingredients",
        ]

    def _upsert_ingredients(self, minifig, ingredients_data):
        if ingredients_data is None:
            return

        # simple and reliable first pass:
        # replace the ingredient list entirely on save
        minifig.ingredients.all().delete()

        rows = []
        for row in ingredients_data:
            rows.append(
                MinifigIngredient(
                    minifig=minifig,
                    part_color=row["part_color"],
                    quantity=row.get("quantity", 1),
                    role=row.get("role", MinifigIngredient.ROLE_OTHER),
                    is_required=row.get("is_required", True),
                    sort_order=row.get("sort_order", 0),
                    notes=row.get("notes", ""),
                )
            )

        if rows:
            MinifigIngredient.objects.bulk_create(rows)

    def create(self, validated_data):
        create_catalog = validated_data.pop("create_catalog_item", False)
        base_price = validated_data.pop("base_price_override", None)
        ingredients_data = validated_data.pop("ingredients", None)

        mf = Minifig.objects.create(**validated_data)

        if create_catalog and mf.catalog_item is None:
            sku = f"MINIFIG-{mf.bricklink_id}".upper()
            ci = CatalogItem.objects.create(
                sku=sku,
                is_active=True,
                base_price_override=base_price,
                force_override=True,
                notes="Auto-created from Minifig create",
            )
            mf.catalog_item = ci
            mf.save(update_fields=["catalog_item"])

        self._upsert_ingredients(mf, ingredients_data)
        return mf

    def update(self, instance, validated_data):
        create_catalog = validated_data.pop("create_catalog_item", False)
        base_price = validated_data.pop("base_price_override", None)
        ingredients_data = validated_data.pop("ingredients", None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

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

        if base_price is not None and instance.catalog_item_id:
            instance.catalog_item.base_price_override = base_price
            instance.catalog_item.force_override = True
            instance.catalog_item.save(update_fields=["base_price_override", "force_override"])

        self._upsert_ingredients(instance, ingredients_data)
        return instance