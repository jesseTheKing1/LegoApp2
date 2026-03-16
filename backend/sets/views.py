from rest_framework.viewsets import ModelViewSet
from .models import Set
from .serializers import SetSerializer


class SetViewSet(ModelViewSet):
    queryset = (
        Set.objects
        .select_related("theme", "catalog_item")
        .prefetch_related(
            "part_requirements",
            "part_requirements__part_color",
            "part_requirements__part_color__part",
            "part_requirements__part_color__color",
            "part_requirements__part_color__catalog_item",
            "minifig_requirements",
            "minifig_requirements__minifig",
            "minifig_requirements__minifig__theme",
            "minifig_requirements__minifig__catalog_item",
        )
        .all()
    )
    serializer_class = SetSerializer