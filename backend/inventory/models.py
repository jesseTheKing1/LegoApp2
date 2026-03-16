from django.db import models
from django.core.exceptions import ValidationError


class Location(models.Model):
    LOCATION_TYPE_CHOICES = [
        ("warehouse", "Warehouse"),
        ("room", "Room"),
        ("shelf", "Shelf"),
        ("bin", "Bin"),
        ("drawer", "Drawer"),
        ("tote", "Tote"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50, unique=True)
    location_type = models.CharField(
        max_length=20,
        choices=LOCATION_TYPE_CHOICES,
        default="other",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class InventoryRecord(models.Model):
    CONDITION_CHOICES = [
        ("sealed", "Sealed"),
        ("complete", "Complete"),
        ("loose", "Loose"),
        ("incomplete", "Incomplete"),
        ("damaged", "Damaged"),
    ]

    SOURCE_TYPE_CHOICES = [
        ("lego", "LEGO"),
        ("bricklink", "BrickLink"),
        ("ebay", "eBay"),
        ("thrift", "Thrift"),
        ("trade", "Trade"),
        ("personal", "Personal"),
        ("other", "Other"),
    ]

    catalog_item = models.ForeignKey(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="inventory_records",
    )

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="inventory_records",
    )

    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        default="loose",
    )

    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPE_CHOICES,
        default="other",
    )

    quantity_on_hand = models.PositiveIntegerField(default=0)
    quantity_reserved = models.PositiveIntegerField(default=0)

    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )

    acquired_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    is_sellable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def clean(self):
        if self.quantity_reserved > self.quantity_on_hand:
            raise ValidationError("Reserved quantity cannot be greater than quantity on hand.")

    @property
    def quantity_available(self):
        return max(self.quantity_on_hand - self.quantity_reserved, 0)

    @property
    def total_cost(self):
        if self.unit_cost is None:
            return None
        return self.unit_cost * self.quantity_on_hand

    @property
    def total_available_cost(self):
        if self.unit_cost is None:
            return None
        return self.unit_cost * self.quantity_available

    def __str__(self):
        return f"{self.catalog_item.sku} @ {self.location.code} ({self.quantity_on_hand})"