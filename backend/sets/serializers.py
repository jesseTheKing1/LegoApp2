from rest_framework import serializers

from .models import Set, SetPartRequirement, SetMinifigRequirement
from catalog.models import CatalogItem
from minifigs.models import Theme, Minifig
from parts.models import PartColor

from parts.serializers import PartColorSerializer
from minifigs.serializers import ThemeSerializer


class CatalogItemMiniSerializer(serializers.ModelSerializer):
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


class MinifigMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Minifig
        fields = [
            "id",
            "bricklink_id",
            "name",
            "image_url",
        ]


class SetPartRequirementSerializer(serializers.ModelSerializer):
    part_color = PartColorSerializer(read_only=True)
    part_color_id = serializers.PrimaryKeyRelatedField(
        queryset=PartColor.objects.select_related("part", "color").all(),
        source="part_color",
        write_only=True,
    )

    class Meta:
        model = SetPartRequirement
        fields = [
            "id",
            "part_color",
            "part_color_id",
            "quantity",
            "instruction_page",
            "sort_order",
            "is_visible",
            "is_structural",
            "is_exact_color_required",
            "is_required",
            "notes",
        ]


class SetMinifigRequirementSerializer(serializers.ModelSerializer):
    minifig = MinifigMiniSerializer(read_only=True)
    minifig_id = serializers.PrimaryKeyRelatedField(
        queryset=Minifig.objects.select_related("theme", "catalog_item").all(),
        source="minifig",
        write_only=True,
    )

    class Meta:
        model = SetMinifigRequirement
        fields = [
            "id",
            "minifig",
            "minifig_id",
            "quantity",
            "sort_order",
            "is_required",
            "is_exact_required",
            "notes",
        ]


class SetSerializer(serializers.ModelSerializer):
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
        decimal_places=4,
    )

    part_requirements = SetPartRequirementSerializer(many=True, required=False)
    minifig_requirements = SetMinifigRequirementSerializer(many=True, required=False)

    class Meta:
        model = Set
        fields = [
            "id",
            "set_num",
            "name",
            "image_url",
            "piece_count",
            "theme",
            "theme_id",
            "catalog_item",
            "catalog_item_id",
            "create_catalog_item",
            "base_price_override",
            "part_requirements",
            "minifig_requirements",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def _upsert_part_requirements(self, set_obj, part_requirements_data):
        if part_requirements_data is None:
            return

        set_obj.part_requirements.all().delete()

        rows = []
        for row in part_requirements_data:
            rows.append(
                SetPartRequirement(
                    set=set_obj,
                    part_color=row["part_color"],
                    quantity=row.get("quantity", 1),
                    instruction_page=row.get("instruction_page"),
                    sort_order=row.get("sort_order", 0),
                    is_visible=row.get("is_visible", True),
                    is_structural=row.get("is_structural", False),
                    is_exact_color_required=row.get("is_exact_color_required", True),
                    is_required=row.get("is_required", True),
                    notes=row.get("notes", ""),
                )
            )

        if rows:
            SetPartRequirement.objects.bulk_create(rows)

    def _upsert_minifig_requirements(self, set_obj, minifig_requirements_data):
        if minifig_requirements_data is None:
            return

        set_obj.minifig_requirements.all().delete()

        rows = []
        for row in minifig_requirements_data:
            rows.append(
                SetMinifigRequirement(
                    set=set_obj,
                    minifig=row["minifig"],
                    quantity=row.get("quantity", 1),
                    sort_order=row.get("sort_order", 0),
                    is_required=row.get("is_required", True),
                    is_exact_required=row.get("is_exact_required", True),
                    notes=row.get("notes", ""),
                )
            )

        if rows:
            SetMinifigRequirement.objects.bulk_create(rows)

    def create(self, validated_data):
        create_catalog = validated_data.pop("create_catalog_item", False)
        base_price = validated_data.pop("base_price_override", None)
        part_requirements_data = validated_data.pop("part_requirements", None)
        minifig_requirements_data = validated_data.pop("minifig_requirements", None)

        set_obj = Set.objects.create(**validated_data)

        if create_catalog and set_obj.catalog_item is None:
            sku = f"SET-{set_obj.set_num}".upper()
            ci = CatalogItem.objects.create(
                sku=sku,
                is_active=True,
                base_price_override=base_price,
                force_override=True if base_price is not None else False,
                notes="Auto-created from Set create",
            )
            set_obj.catalog_item = ci
            set_obj.save(update_fields=["catalog_item"])

        self._upsert_part_requirements(set_obj, part_requirements_data)
        self._upsert_minifig_requirements(set_obj, minifig_requirements_data)
        return set_obj

    def update(self, instance, validated_data):
        create_catalog = validated_data.pop("create_catalog_item", False)
        base_price = validated_data.pop("base_price_override", None)
        part_requirements_data = validated_data.pop("part_requirements", None)
        minifig_requirements_data = validated_data.pop("minifig_requirements", None)

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if create_catalog and instance.catalog_item is None:
            sku = f"SET-{instance.set_num}".upper()
            ci = CatalogItem.objects.create(
                sku=sku,
                is_active=True,
                base_price_override=base_price,
                force_override=True if base_price is not None else False,
                notes="Auto-created from Set edit",
            )
            instance.catalog_item = ci
            instance.save(update_fields=["catalog_item"])

        if base_price is not None and instance.catalog_item_id:
            instance.catalog_item.base_price_override = base_price
            instance.catalog_item.force_override = True
            instance.catalog_item.save(update_fields=["base_price_override", "force_override"])

        self._upsert_part_requirements(instance, part_requirements_data)
        self._upsert_minifig_requirements(instance, minifig_requirements_data)
        return instance

    def validate_set_num(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("set_num cannot be blank.")
        return v