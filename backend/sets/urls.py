from rest_framework.routers import DefaultRouter
from .views import SetViewSet

router = DefaultRouter()
router.register("sets", SetViewSet, basename="set")

urlpatterns = router.urls