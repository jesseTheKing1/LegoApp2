from django.db import models


class Set(models.Model):
    set_num = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    image_url = models.URLField(max_length=200, blank=True)

    theme = models.ForeignKey(
        "minifigs.Theme",
        on_delete=models.SET_NULL,
        related_name="sets",
        null=True,
        blank=True,
    )

    official_piece_count = models.PositiveIntegerField(default=0)

    catalog_item = models.OneToOneField(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="set",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        ordering = ["set_num", "name"]

    def __str__(self):
        return f"{self.set_num} - {self.name}"


class SetPart(models.Model):
    set = models.ForeignKey(
        Set,
        on_delete=models.CASCADE,
        related_name="parts",
    )

    part_color = models.ForeignKey(
        "parts.PartColor",
        on_delete=models.PROTECT,
        related_name="set_parts",
    )

    quantity = models.PositiveIntegerField(default=1)

    instruction_page = models.PositiveIntegerField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    bag_number = models.CharField(max_length=20, blank=True)

    is_visible = models.BooleanField(default=True)
    is_structural = models.BooleanField(default=False)

    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["instruction_page", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["set", "part_color", "instruction_page", "sort_order"],
                name="uniq_set_part_row",
            )
        ]

    def __str__(self):
        return f"{self.set.name} → {self.part_color} x{self.quantity}"


class SetMinifig(models.Model):
    set = models.ForeignKey(
        Set,
        on_delete=models.CASCADE,
        related_name="minifigs",
    )

    minifig = models.ForeignKey(
        "minifigs.Minifig",
        on_delete=models.PROTECT,
        related_name="set_entries",
    )

    quantity = models.PositiveIntegerField(default=1)
    sort_order = models.PositiveIntegerField(default=0)

    bag_number = models.CharField(max_length=20, blank=True)

    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["set", "minifig", "sort_order"],
                name="uniq_set_minifig_row",
            )
        ]

    def __str__(self):
        return f"{self.set.name} → {self.minifig.name} x{self.quantity}"