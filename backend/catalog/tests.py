from decimal import Decimal
from django.core.cache import cache
from django.test import TestCase

from .models import CatalogItem, CatalogPricingSettings


class CatalogMarkupPricingTests(TestCase):
    def setUp(self):
        cache.clear()
        CatalogPricingSettings.objects.create(pk=1, overall_markup_percent=Decimal("25.00"))

    def test_bricklink_reference_uses_overall_markup(self):
        item = CatalogItem.objects.create(
            sku="3001-red", bricklink_reference_price=Decimal("2.0000")
        )
        self.assertEqual(item.current_price, Decimal("2.5000"))
        self.assertEqual(item.pricing_source, "bricklink_markup")

    def test_forced_override_remains_an_exception(self):
        item = CatalogItem.objects.create(
            sku="special-price",
            bricklink_reference_price=Decimal("2.0000"),
            base_price_override=Decimal("1.7500"),
            force_override=True,
        )
        self.assertEqual(item.current_price, Decimal("1.7500"))
        self.assertEqual(item.pricing_source, "forced_override")

    def test_saving_markup_immediately_changes_selling_price(self):
        item = CatalogItem.objects.create(
            sku="dynamic-price", bricklink_reference_price=Decimal("10.0000")
        )
        settings = CatalogPricingSettings.objects.get(pk=1)
        settings.overall_markup_percent = Decimal("40.00")
        settings.save()
        self.assertEqual(item.current_price, Decimal("14.0000"))
