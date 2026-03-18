from rest_framework import viewsets

from .models import Set, SetPart, SetMinifig
from .serializers import (
    SetReadSerializer,
    SetWriteSerializer,
    SetPartReadSerializer,
    SetMinifigReadSerializer,
)


class SetViewSet(viewsets.ModelViewSet):
    queryset = (
        Set.objects
        .select_related("theme", "catalog_item")
        .prefetch_related(
            "parts",
            "parts__part_color",
            "parts__part_color__part",
            "parts__part_color__color",
            "minifigs",
            "minifigs__minifig",
        )
    )
    lookup_field = "set_num"

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return SetReadSerializer
        return SetWriteSerializer


class SetPartViewSet(viewsets.ModelViewSet):
    queryset = (
        SetPart.objects
        .select_related("set", "part_color", "part_color__part", "part_color__color")
    )
    serializer_class = SetPartReadSerializer


class SetMinifigViewSet(viewsets.ModelViewSet):
    queryset = SetMinifig.objects.select_related("set", "minifig")
    serializer_class = SetMinifigReadSerializer