from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ColorViewSet, PartViewSet, PartColorViewSet

router = DefaultRouter()
router.register(r"colors", ColorViewSet, basename="color")
router.register(r"parts", PartViewSet, basename="part")
router.register(r"part-colors", PartColorViewSet, basename="partcolor")

urlpatterns = [
    path("", include(router.urls)),
]
