from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from catalog.models import CatalogItem
from .models import InventoryRecord, Location
from .views import InventoryDashboardView


class InventoryPricingDashboardTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="pricing-admin", email="pricing@example.com", password="test-password"
        )
        self.location = Location.objects.create(name="Sales shelf", code="SALE")
        self.priced = CatalogItem.objects.create(
            sku="priced-part", bricklink_reference_price=Decimal("2.0000")
        )
        self.missing = CatalogItem.objects.create(sku="missing-reference")
        InventoryRecord.objects.create(
            catalog_item=self.priced, location=self.location,
            quantity_on_hand=10, quantity_reserved=2, is_sellable=True,
        )
        InventoryRecord.objects.create(
            catalog_item=self.priced, location=self.location,
            quantity_on_hand=5, quantity_reserved=1, is_sellable=True,
        )
        InventoryRecord.objects.create(
            catalog_item=self.missing, location=self.location,
            quantity_on_hand=3, is_sellable=True,
        )
        InventoryRecord.objects.create(
            catalog_item=self.priced, location=self.location,
            quantity_on_hand=100, is_sellable=False,
        )

    def request(self, method="get", payload=None):
        factory = APIRequestFactory()
        request = getattr(factory, method)("/", payload or {}, format="json")
        force_authenticate(request, user=self.user)
        return InventoryDashboardView.as_view()(request)

    def test_dashboard_groups_sellable_available_inventory(self):
        response = self.request()
        self.assertEqual(response.status_code, 200)
        rows = response.data["pricing_items"]
        priced = next(row for row in rows if row["sku"] == "priced-part")
        self.assertEqual(priced["quantity_available"], 12)
        self.assertEqual(priced["reference_total"], Decimal("24.0000"))
        self.assertEqual(response.data["summary"]["sellable_available_units"], 15)

    def test_apply_markup_updates_prices_and_skips_missing_references(self):
        response = self.request("post", {"markup_percent": "25"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated"], 1)
        self.assertEqual(response.data["skipped"], 1)
        self.priced.refresh_from_db()
        self.missing.refresh_from_db()
        self.assertEqual(self.priced.base_price_override, Decimal("2.5000"))
        self.assertIsNone(self.missing.base_price_override)
