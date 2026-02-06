from rest_framework.viewsets import ModelViewSet
from .models import Theme, Minifig
from .serializers import ThemeSerializer, MinifigSerializer

class ThemeViewSet(ModelViewSet):
    queryset = Theme.objects.all()
    serializer_class = ThemeSerializer

class MinifigViewSet(ModelViewSet):
    queryset = Minifig.objects.select_related("theme", "catalog_item").all()
    serializer_class = MinifigSerializer
