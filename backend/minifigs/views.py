from rest_framework.viewsets import ModelViewSet
from .models import Minifig, Theme
from .serializers import MinifigSerializer, ThemeSerializer


class ThemeViewSet(ModelViewSet):
    queryset = Theme.objects.all().order_by("name")
    serializer_class = ThemeSerializer


class MinifigViewSet(ModelViewSet):
    queryset = (
        Minifig.objects
        .select_related("theme", "catalog_item")
        .prefetch_related(
            "ingredients",
            "ingredients__part_color",
            "ingredients__part_color__part",
            "ingredients__part_color__color",
            "ingredients__part_color__catalog_item",
        )
        .all()
    )
    serializer_class = MinifigSerializer