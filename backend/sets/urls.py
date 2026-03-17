from rest_framework.routers import DefaultRouter
from .views import SetViewSet, SetPartViewSet, SetMinifigViewSet

router = DefaultRouter()
router.register(r"sets", SetViewSet, basename="sets")
router.register(r"set-parts", SetPartViewSet, basename="set-parts")
router.register(r"set-minifigs", SetMinifigViewSet, basename="set-minifigs")

urlpatterns = router.urls