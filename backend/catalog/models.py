from django.db import models

class CatalogItem(models.Model):
    sku = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)

    base_price_override = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )
    force_override = models.BooleanField(default=False)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ---------------- PRICING LOGIC ----------------

    @property
    def current_price(self):
        """
        Single source of truth for pricing.
        """
        if self.force_override and self.base_price_override is not None:
            return self.base_price_override

        computed = self.get_computed_price_from_logs()
        if computed is not None:
            return computed

        return self.base_price_override

    @property
    def pricing_source(self):
        if self.force_override and self.base_price_override is not None:
            return "forced_override"
        if self.get_computed_price_from_logs() is not None:
            return "computed_average"
        if self.base_price_override is not None:
            return "manual_override"
        return "none"

    def get_computed_price_from_logs(self):
        """
        Stub for now.
        Later: weighted average from BrickLink orders, etc.
        """
        return None
