from rest_framework import viewsets
from rest_framework.response import Response

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

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            print("SETS LIST ERROR:", repr(e))
            raise

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print("SETS CREATE ERROR:", repr(e))
            print("SETS CREATE PAYLOAD:", request.data)
            raise

class SetMinifigViewSet(viewsets.ModelViewSet):
    queryset = SetMinifig.objects.select_related("set", "minifig")
    serializer_class = SetMinifigReadSerializer