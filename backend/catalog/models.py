from decimal import Decimal, ROUND_HALF_UP
from django.core.cache import cache
from django.db import models
from django.db.models import Sum, F, DecimalField, ExpressionWrapper


class CatalogPricingSettings(models.Model):
    overall_markup_percent = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=Decimal("25.00"),
    )
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_markup_percent(cls):
        cache_key = "catalog_overall_markup_percent"
        value = cache.get(cache_key)
        if value is None:
            settings, _ = cls.objects.get_or_create(pk=1)
            value = settings.overall_markup_percent
            cache.set(cache_key, value, 300)
        return Decimal(str(value))

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete("catalog_overall_markup_percent")

    def delete(self, *args, **kwargs):
        cache.delete("catalog_overall_markup_percent")
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f"Overall markup: {self.overall_markup_percent}%"


class CatalogItem(models.Model):
    sku = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)

    # ---------------- SELL PRICE ----------------
    # This is your SELLING price override, not your cost.
    base_price_override = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )
    force_override = models.BooleanField(default=False)

    # ---------------- MARKET REFERENCE PRICES ----------------
    # These are optional reference prices for comparison only.
    lego_reference_price = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )
    bricklink_reference_price = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ---------------- SELL PRICE LOGIC ----------------

    @property
    def current_price(self):
        """
        SELL price.
        This remains separate from cost.
        """
        if self.force_override and self.base_price_override is not None:
            return self.base_price_override

        if self.bricklink_reference_price is not None:
            multiplier = Decimal("1") + (
                CatalogPricingSettings.get_markup_percent() / Decimal("100")
            )
            return (self.bricklink_reference_price * multiplier).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )

        return self.base_price_override

    @property
    def pricing_source(self):
        if self.force_override and self.base_price_override is not None:
            return "forced_override"
        if self.bricklink_reference_price is not None:
            return "bricklink_markup"
        if self.base_price_override is not None:
            return "manual_override"
        return "none"

    def get_computed_price_from_logs(self):
        """
        Stub for future selling-price automation.
        Keep this separate from cost logic.
        """
        return None

    # ---------------- COST LOGIC ----------------

    @property
    def latest_cost_entry(self):
        return self.cost_entries.order_by("-purchased_at", "-id").first()

    @property
    def latest_landed_unit_cost(self):
        latest = self.latest_cost_entry
        return latest.landed_unit_cost if latest else None

    @property
    def total_units_purchased(self):
        agg = self.cost_entries.aggregate(total=Sum("quantity"))
        return agg["total"] or 0

    @property
    def total_spent(self):
        total = Decimal("0.0000")
        for entry in self.cost_entries.all():
            total += entry.total_cost
        return total

    @property
    def weighted_average_unit_cost(self):
        total_units = 0
        total_cost = Decimal("0.0000")

        for entry in self.cost_entries.all():
            total_units += entry.quantity
            total_cost += entry.total_cost

        if total_units == 0:
            return None

        return total_cost / Decimal(total_units)

    @property
    def current_cost(self):
        """
        Main cost value to show in UI.
        Weighted average is usually the best default.
        """
        return self.weighted_average_unit_cost

    @property
    def margin_amount(self):
        if self.current_price is None or self.current_cost is None:
            return None
        return self.current_price - self.current_cost

    @property
    def margin_percent(self):
        if self.current_price is None or self.current_cost is None:
            return None
        if self.current_cost == 0:
            return None
        return ((self.current_price - self.current_cost) / self.current_cost) * Decimal("100")

    @property
    def lego_vs_bricklink_diff_percent(self):
        if self.lego_reference_price is None or self.bricklink_reference_price is None:
            return None
        if self.lego_reference_price == 0:
            return None
        return (
            (self.bricklink_reference_price - self.lego_reference_price)
            / self.lego_reference_price
        ) * Decimal("100")

    def __str__(self):
        return self.sku


class CatalogCostEntry(models.Model):
    SOURCE_CHOICES = [
        ("lego", "LEGO"),
        ("bricklink", "BrickLink"),
        ("brickowl", "BrickOwl"),
        ("ebay", "eBay"),
        ("local", "Local"),
        ("other", "Other"),
    ]

    catalog_item = models.ForeignKey(
        CatalogItem,
        on_delete=models.CASCADE,
        related_name="cost_entries",
    )

    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)
    supplier_name = models.CharField(max_length=120, blank=True)

    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=4)

    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    tax_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    other_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("0.0000"),
    )

    purchased_at = models.DateField()
    reference = models.CharField(max_length=120, blank=True)  # invoice #, order #, etc.
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-purchased_at", "-id"]

    @property
    def subtotal(self):
        return self.unit_cost * self.quantity

    @property
    def total_cost(self):
        return self.subtotal + self.shipping_cost + self.tax_cost + self.other_cost

    @property
    def landed_unit_cost(self):
        if not self.quantity:
            return Decimal("0.0000")
        return self.total_cost / Decimal(self.quantity)

    def __str__(self):
        return f"{self.catalog_item.sku} | {self.source} | {self.purchased_at}"
