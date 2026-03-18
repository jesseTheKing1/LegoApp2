from django.db import transaction
from rest_framework import serializers

from .models import Set, SetPart, SetMinifig
from parts.models import PartColor
from parts.serializers import PartColorSerializer
from minifigs.models import Minifig, Theme
from minifigs.serializers import MinifigSerializer, ThemeSerializer
from catalog.models import CatalogItem


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = ["id", "sku", "base_price_override", "force_override", "notes"]


# -----------------------------
# READ SERIALIZERS
# -----------------------------

class SetPartReadSerializer(serializers.ModelSerializer):
    part_color_detail = PartColorSerializer(source="part_color", read_only=True)

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
            "is_visible",
            "is_structural",
            "color_match_mode",
            "notes",
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

    class Meta:
        model = Set
        fields = [
            "id",
            "set_num",
            "name",
            "image_url",
            "theme",
            "official_piece_count",
            "catalog_item",
            "parts",
            "minifigs",
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