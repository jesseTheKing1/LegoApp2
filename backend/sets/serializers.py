from rest_framework import serializers
from .models import Set, SetPart, SetMinifig
from parts.serializers import PartColorSerializer
from minifigs.serializers import MinifigSerializer


class SetPartSerializer(serializers.ModelSerializer):
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
            "notes",
        ]


class SetMinifigSerializer(serializers.ModelSerializer):
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
            "notes",
        ]


class SetSerializer(serializers.ModelSerializer):
    parts = SetPartSerializer(many=True, read_only=True)
    minifigs = SetMinifigSerializer(many=True, read_only=True)

    class Meta:
        model = Set
        fields = [
            "id",
            "set_num",
            "name",
            "image_url",
            "theme",
            "official_piece_count",
            "parts",
            "minifigs",
        ]