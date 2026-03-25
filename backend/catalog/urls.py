from rest_framework.routers import DefaultRouter
from .views import CatalogItemViewSet, CatalogCostEntryViewSet

router = DefaultRouter()
router.register("catalog-items", CatalogItemViewSet, basename="catalog-item")
router.register("catalog-cost-entries", CatalogCostEntryViewSet, basename="catalog-cost-entry")

urlpatterns = router.urls