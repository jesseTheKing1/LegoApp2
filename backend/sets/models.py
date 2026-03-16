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

    piece_count = models.PositiveIntegerField(default=0)

    catalog_item = models.OneToOneField(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="set",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["set_num", "name"]

    def __str__(self):
        return f"{self.set_num} - {self.name}"

        