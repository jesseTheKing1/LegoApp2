from rest_framework import viewsets
from .models import Set, SetPart, SetMinifig
from .serializers import (
    SetSerializer,
    SetPartSerializer,
    SetMinifigSerializer,
)


class SetViewSet(viewsets.ModelViewSet):
    queryset = Set.objects.all()
    serializer_class = SetSerializer
    lookup_field = "set_num"


class SetPartViewSet(viewsets.ModelViewSet):
    queryset = SetPart.objects.select_related("part_color", "set")
    serializer_class = SetPartSerializer


class SetMinifigViewSet(viewsets.ModelViewSet):
    queryset = SetMinifig.objects.select_related("minifig", "set")
    serializer_class = SetMinifigSerializer