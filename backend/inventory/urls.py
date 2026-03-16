from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LocationViewSet, InventoryRecordViewSet, InventoryDashboardView

router = DefaultRouter()
router.register("locations", LocationViewSet, basename="inventory-locations")
router.register("records", InventoryRecordViewSet, basename="inventory-records")

urlpatterns = [
    path("dashboard/", InventoryDashboardView.as_view(), name="inventory-dashboard"),
    path("", include(router.urls)),
]