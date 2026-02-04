# app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CatalogItemViewSet

router = DefaultRouter()
router.register(r"catalog-items", CatalogItemViewSet, basename="catalog-item")

urlpatterns = [
    path("", include(router.urls)),
]
