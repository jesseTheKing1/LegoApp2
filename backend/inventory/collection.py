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
        CollectionSet.objects.filter(user=user)
        .prefetch_related("lego_set__parts")
    )
    for owned_set in owned_sets:
        for set_part in owned_set.lego_set.parts.all():
            totals[set_part.part_color_id] += set_part.quantity * owned_set.quantity

    return dict(totals)
