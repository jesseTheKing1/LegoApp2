from rest_framework import serializers
from .models import Location, InventoryRecord, CollectionSet, CollectionPart, CollectionMinifig
from sets.models import Set
from parts.models import PartColor
from minifigs.models import Minifig
from catalog.models import CatalogItem


class CatalogItemMiniSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        read_only=True,
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
            "current_price",
            "pricing_source",
            "notes",
        ]


class LocationSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    parent_code = serializers.CharField(source="parent.code", read_only=True)

    class Meta:
        model = Location
        fields = [
            "id",
            "name",
            "code",
            "location_type",
            "parent",
            "parent_name",
            "parent_code",
            "notes",
            "is_active",
        ]


class InventoryRecordSerializer(serializers.ModelSerializer):
    catalog_item = CatalogItemMiniSerializer(read_only=True)
    catalog_item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(),
        source="catalog_item",
        write_only=True,
    )

    location = LocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source="location",
        write_only=True,
    )

    quantity_available = serializers.IntegerField(read_only=True)
    total_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )
    total_available_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=4,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = InventoryRecord
        fields = [
            "id",
            "catalog_item",
            "catalog_item_id",
            "location",
            "location_id",
            "condition",
            "source_type",
            "quantity_on_hand",
            "quantity_reserved",
            "quantity_available",
            "unit_cost",
            "total_cost",
            "total_available_cost",
            "acquired_at",
            "notes",
            "is_sellable",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "quantity_available",
            "total_cost",
            "total_available_cost",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        quantity_on_hand = attrs.get(
            "quantity_on_hand",
            getattr(self.instance, "quantity_on_hand", 0),
        )
        quantity_reserved = attrs.get(
            "quantity_reserved",
            getattr(self.instance, "quantity_reserved", 0),
        )

        if quantity_reserved > quantity_on_hand:
            raise serializers.ValidationError(
                {"quantity_reserved": "Reserved quantity cannot be greater than quantity on hand."}
            )

        return attrs


class CollectionSetSerializer(serializers.ModelSerializer):
    set_id = serializers.PrimaryKeyRelatedField(source="lego_set", queryset=Set.objects.all(), write_only=True)
    set = serializers.SerializerMethodField()
    contributed_piece_count = serializers.SerializerMethodField()

    class Meta:
        model = CollectionSet
        fields = ["id", "set_id", "set", "quantity", "contributed_piece_count", "added_at"]
        validators = []

    def get_set(self, obj):
        row = obj.lego_set
        return {
            "id": row.id, "set_num": row.set_num, "name": row.name,
            "image_url": row.image_url, "official_piece_count": row.official_piece_count,
            "theme_name": row.theme.name if row.theme else "",
        }

    def get_contributed_piece_count(self, obj):
        return sum(row.quantity for row in obj.lego_set.parts.all()) * obj.quantity

    def create(self, validated_data):
        obj, created = CollectionSet.objects.get_or_create(
            user=self.context["request"].user,
            lego_set=validated_data["lego_set"],
            defaults={"quantity": validated_data.get("quantity", 1)},
        )
        if not created:
            obj.quantity += validated_data.get("quantity", 1)
            obj.save(update_fields=["quantity"])
        return obj


class CollectionPartSerializer(serializers.ModelSerializer):
    part_color_id = serializers.PrimaryKeyRelatedField(source="part_color", queryset=PartColor.objects.all(), write_only=True)
    part_color = serializers.SerializerMethodField()

    class Meta:
        model = CollectionPart
        fields = ["id", "part_color_id", "part_color", "quantity", "added_at"]
        validators = []

    def get_part_color(self, obj):
        pc = obj.part_color
        return {
            "id": pc.id, "part_color_code": pc.part_color_code,
            "name": pc.part.name, "part_id": pc.part.part_id,
            "color_name": pc.color.name,
            "image_url": pc.image_url_1 or pc.image_url_2 or pc.part.image_url,
        }

    def create(self, validated_data):
        obj, created = CollectionPart.objects.get_or_create(
            user=self.context["request"].user,
            part_color=validated_data["part_color"],
            defaults={"quantity": validated_data.get("quantity", 1)},
        )
        if not created:
            obj.quantity += validated_data.get("quantity", 1)
            obj.save(update_fields=["quantity"])
        return obj


class CollectionMinifigSerializer(serializers.ModelSerializer):
    minifig_id = serializers.PrimaryKeyRelatedField(source="minifig", queryset=Minifig.objects.all(), write_only=True)
    minifig = serializers.SerializerMethodField()

    class Meta:
        model = CollectionMinifig
        fields = ["id", "minifig_id", "minifig", "quantity", "added_at"]
        validators = []

    def get_minifig(self, obj):
        fig = obj.minifig
        item = fig.catalog_item
        price = (
            item.current_price if item and item.current_price is not None
            else item.bricklink_reference_price if item and item.bricklink_reference_price is not None
            else item.lego_reference_price if item else None
        )
        value = float(price) if price is not None else 0
        rarity = "legendary" if value >= 75 else "epic" if value >= 35 else "rare" if value >= 15 else "uncommon" if value >= 5 else "common"
        return {
            "id": fig.id, "bricklink_id": fig.bricklink_id, "name": fig.name,
            "image_url": fig.image_url, "theme_name": fig.theme.name if fig.theme else "",
            "market_value": str(price) if price is not None else None, "rarity": rarity,
        }

    def create(self, validated_data):
        obj, created = CollectionMinifig.objects.get_or_create(
            user=self.context["request"].user,
            minifig=validated_data["minifig"],
            defaults={"quantity": validated_data.get("quantity", 1)},
        )
        if not created:
            obj.quantity += validated_data.get("quantity", 1)
            obj.save(update_fields=["quantity"])
        return obj
