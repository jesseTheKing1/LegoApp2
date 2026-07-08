from collections import defaultdict

from .models import CollectionPart, CollectionSet


def owned_part_color_quantities(user):
    """Combine loose pieces with every piece contributed by owned sets.

    Quantities are keyed by the effective/root PartColor ID so historical
    variant IDs count as the same usable piece during build matching.
    """
    totals = defaultdict(int)
    if not user or not user.is_authenticated:
        return {}

    for row in CollectionPart.objects.filter(user=user).select_related("part_color__root_part_color"):
        totals[row.part_color.effective_part_color_id] += row.quantity

    owned_sets = (
        CollectionSet.objects.filter(user=user)
        .prefetch_related("lego_set__parts__part_color__root_part_color")
    )
    for owned_set in owned_sets:
        available_copies = owned_set.available_quantity
        if available_copies <= 0:
            continue
        for set_part in owned_set.lego_set.parts.all():
            totals[set_part.part_color.effective_part_color_id] += set_part.quantity * available_copies

    return dict(totals)


def part_source_inventory(user):
    """Available quantities grouped by part color and collection source."""
    sources = defaultdict(list)
    if not user or not user.is_authenticated:
        return {}

    for row in CollectionPart.objects.filter(user=user).select_related(
        "part_color",
        "part_color__part",
        "part_color__root_part_color",
    ):
        sources[row.part_color.effective_part_color_id].append({
            "type": "loose",
            "id": row.id,
            "name": "Loose pieces",
            "image_url": row.part_color.image_url_1 or row.part_color.image_url_2 or row.part_color.part.image_url,
            "available": row.quantity,
        })

    owned_sets = (
        CollectionSet.objects.filter(user=user)
        .select_related("lego_set")
        .prefetch_related("lego_set__parts__part_color__root_part_color")
    )
    for owned_set in owned_sets:
        available_copies = owned_set.available_quantity
        if available_copies <= 0:
            continue
        for set_part in owned_set.lego_set.parts.all():
            sources[set_part.part_color.effective_part_color_id].append({
                "type": "set",
                "id": owned_set.id,
                "set_num": owned_set.lego_set.set_num,
                "name": owned_set.lego_set.name,
                "image_url": owned_set.lego_set.image_url,
                "available": set_part.quantity * available_copies,
            })

    # A set can list the same part color on multiple bags/steps. Combine those
    # rows so one registered set contributes its complete quantity exactly once.
    consolidated = {}
    for part_color_id, rows in sources.items():
        by_source = {}
        for row in rows:
            key = (row["type"], row["id"])
            if key not in by_source:
                by_source[key] = row.copy()
            else:
                by_source[key]["available"] += row["available"]
        consolidated[part_color_id] = list(by_source.values())
    return consolidated
