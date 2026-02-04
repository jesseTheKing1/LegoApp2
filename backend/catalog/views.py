# app/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import CatalogItem
from .serializers import CatalogItemSerializer


class CatalogItemViewSet(viewsets.ModelViewSet):
    queryset = CatalogItem.objects.all().order_by("sku")
    serializer_class = CatalogItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # tighten later if you want staff-only writes
