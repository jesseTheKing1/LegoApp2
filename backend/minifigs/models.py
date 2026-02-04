from django.db import models

class Theme(models.Model):
    name = models.CharField(max_length=50)
    image_url = models.URLField(max_length=200, blank=True)

    def __str__(self):
        return self.name


class Minifig(models.Model):
    bricklink_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    image_url = models.URLField(max_length=200, blank=True)
    theme = models.ForeignKey(Theme, on_delete=models.CASCADE, related_name="minifigs", blank = True, null=True)

    catalog_item = models.OneToOneField(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="minifig",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - {self.theme}"
