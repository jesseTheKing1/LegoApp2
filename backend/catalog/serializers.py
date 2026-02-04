from rest_framework import serializers
from .models import CatalogItem


class CatalogItemSerializer(serializers.ModelSerializer):
    """
    Full CatalogItem serializer.
    Used for:
    - Catalog item admin screens
    - Embedded pricing info (via mini serializer)
    """

    # -------- computed / derived fields --------
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

            # pricing controls
            "base_price_override",
            "force_override",

            # resolved pricing (READ ONLY)
            "current_price",
            "pricing_source",

            # misc
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "current_price",
            "pricing_source",
        ]

    def validate_sku(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("SKU cannot be blank.")
        return v
