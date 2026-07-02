from rest_framework import viewsets, filters
from .models import Color, Part, PartColor
from .serializers import ColorSerializer, PartSerializer, PartColorSerializer
from .permissions import IsAdminOrReadOnly


class ColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "lego_id", "hex"]
    ordering_fields = ["name", "lego_id"]
    ordering = ["name"]


class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["part_id", "name", "general_category", "specific_category", "actual_category"]
    ordering_fields = ["part_id", "name", "actual_category"]
    ordering = ["part_id"]


class PartColorViewSet(viewsets.ModelViewSet):
    # Part, color, and catalog are all rendered in the list. Joining them here
    # prevents one additional database query per row.
    queryset = PartColor.objects.select_related("part", "color", "catalog_item").all()
    serializer_class = PartColorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "part_color_code", "variant", "description",
        "part__part_id", "part__name", "part__actual_category",
        "color__name", "color__hex",
    ]
    ordering_fields = ["id", "part_color_code", "variant", "part__part_id", "color__name"]
    ordering = ["part__part_id", "color__name", "variant"]
