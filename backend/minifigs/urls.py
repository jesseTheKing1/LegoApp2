# minifigs/urls.py
from rest_framework.routers import DefaultRouter
from .views import MinifigViewSet, ThemeViewSet

router = DefaultRouter()
router.register("themes", ThemeViewSet, basename="theme")
router.register("minifigs", MinifigViewSet, basename="minifig")

urlpatterns = router.urls
