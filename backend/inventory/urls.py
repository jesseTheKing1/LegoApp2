from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LocationViewSet, InventoryRecordViewSet, InventoryDashboardView,
    CollectionSetViewSet, CollectionPartViewSet, CollectionMinifigViewSet,
    CollectionSummaryView,
)

router = DefaultRouter()
router.register("locations", LocationViewSet, basename="inventory-locations")
router.register("records", InventoryRecordViewSet, basename="inventory-records")
router.register("collection/sets", CollectionSetViewSet, basename="collection-sets")
router.register("collection/parts", CollectionPartViewSet, basename="collection-parts")
router.register("collection/minifigs", CollectionMinifigViewSet, basename="collection-minifigs")

urlpatterns = [
    path("dashboard/", InventoryDashboardView.as_view(), name="inventory-dashboard"),
    path("collection/summary/", CollectionSummaryView.as_view(), name="collection-summary"),
    path("", include(router.urls)),
]
