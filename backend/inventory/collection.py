from collections import defaultdict

from .models import CollectionPart, CollectionSet


def owned_part_color_quantities(user):
    """Combine loose pieces with every piece contributed by owned sets."""
    totals = defaultdict(int)
    if not user or not user.is_authenticated:
        return {}

    for row in CollectionPart.objects.filter(user=user):
        totals[row.part_color_id] += row.quantity

    owned_sets = (
        CollectionSet.objects.filter(user=user, is_locked=False)
        .prefetch_related("lego_set__parts")
    )
    for owned_set in owned_sets:
        for set_part in owned_set.lego_set.parts.all():
            totals[set_part.part_color_id] += set_part.quantity * owned_set.quantity

    return dict(totals)


def part_source_inventory(user):
    """Available quantities grouped by part color and collection source."""
    sources = defaultdict(list)
    if not user or not user.is_authenticated:
        return {}

    for row in CollectionPart.objects.filter(user=user).select_related("part_color", "part_color__part"):
        sources[row.part_color_id].append({
            "type": "loose",
            "id": row.id,
            "name": "Loose pieces",
            "image_url": row.part_color.image_url_1 or row.part_color.image_url_2 or row.part_color.part.image_url,
            "available": row.quantity,
        })

    owned_sets = (
        CollectionSet.objects.filter(user=user, is_locked=False)
        .select_related("lego_set")
        .prefetch_related("lego_set__parts")
    )
    for owned_set in owned_sets:
        for set_part in owned_set.lego_set.parts.all():
            sources[set_part.part_color_id].append({
                "type": "set",
                "id": owned_set.id,
                "set_num": owned_set.lego_set.set_num,
                "name": owned_set.lego_set.name,
                "image_url": owned_set.lego_set.image_url,
                "available": set_part.quantity * owned_set.quantity,
            })
    return dict(sources)
