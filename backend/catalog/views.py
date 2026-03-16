# catalog/views.py
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import CatalogItem
from .serializers import CatalogItemSerializer


class CatalogItemViewSet(viewsets.ModelViewSet):
    queryset = (
        CatalogItem.objects
        .select_related("minifig", "part_color")
        .select_related("part_color__part", "part_color__color")
        .all()
        .order_by("sku")
    )
    serializer_class = CatalogItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        q = (request.query_params.get("q") or "").strip()
        limit = min(int(request.query_params.get("limit", 25)), 100)

        qs = (
            CatalogItem.objects
            .select_related("minifig", "part_color")
            .select_related("part_color__part", "part_color__color")
            .all()
            .order_by("sku")
        )

        if q:
            qs = qs.filter(
                Q(sku__icontains=q)
                |
                Q(minifig__name__icontains=q)
                |
                Q(minifig__bricklink_id__icontains=q)
                |
                Q(part_color__part_color_code__icontains=q)
                |
                Q(part_color__description__icontains=q)
                |
                Q(part_color__part__part_id__icontains=q)
                |
                Q(part_color__part__name__icontains=q)
                |
                Q(part_color__color__name__icontains=q)
            )

        results = []
        for item in qs[:limit]:
            product_type = "catalog"
            display_name = item.sku
            subtitle = ""
            display_image_url = ""

            if hasattr(item, "minifig") and item.minifig:
                product_type = "minifig"
                display_name = item.minifig.name or item.sku
                subtitle = item.minifig.bricklink_id or ""
                display_image_url = item.minifig.image_url or ""

            elif hasattr(item, "part_color") and item.part_color:
                pc = item.part_color
                product_type = "part_color"
                part_name = pc.part.name if pc.part else "Unnamed Part"
                part_id = pc.part.part_id if pc.part else ""
                color_name = pc.color.name if pc.color else "No Color"

                display_name = part_name
                subtitle_parts = [part_id, color_name]
                if pc.variant:
                    subtitle_parts.append(pc.variant)
                subtitle = " • ".join([x for x in subtitle_parts if x])

                display_image_url = (
                    pc.image_url_1
                    or pc.image_url_2
                    or (pc.part.image_url if pc.part else "")
                    or ""
                )

            results.append({
                "id": item.id,
                "sku": item.sku,
                "product_type": product_type,
                "display_name": display_name,
                "subtitle": subtitle,
                "display_image_url": display_image_url,
                "current_price": item.current_price,
                "pricing_source": item.pricing_source,
                "is_active": item.is_active,
            })

        return Response(results)