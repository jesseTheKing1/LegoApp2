from django.db import models

class Color(models.Model):
    lego_id = models.IntegerField(unique=True, null=True, blank=True)
    name = models.CharField(max_length=80, unique=True)
    hex = models.CharField(max_length=7, blank=True)  # "#RRGGBB"
    is_transparent = models.BooleanField(default=False)
    is_metallic = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class Part(models.Model):

    part_id = models.CharField(max_length=50, unique=True)
    name = models.CharField( max_length=200)
    general_category = models.CharField(max_length=120, blank=True)
    specific_category = models.CharField(max_length=120, blank=True)
    #new this is general shape
    #lego has different part numbers on pieces that share the same shape
    actual_category = models.CharField(max_length=50)
    image_url = models.URLField(blank=True)

    class Meta:
        ordering = ["part_id"]

    def __str__(self):
        return f"{self.part_id} - {self.name}"

class PartColor(models.Model):
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="part_colors")
    color = models.ForeignKey(Color, on_delete=models.PROTECT, related_name="part_colors")
    variant = models.CharField(max_length=80, blank=True, default="")

    root_part_color = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="variant_part_colors",
        null=True,
        blank=True,
        help_text=(
            "Optional canonical/root PartColor. Use this when older LEGO/BrickLink "
            "IDs represent the same usable part-color. Variants inherit the root "
            "catalog pricing and count together for build matching."
        ),
    )

    part_color_code = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=300, blank=True)
    image_url_1 = models.URLField(blank=True)
    image_url_2 = models.URLField(blank=True)

    catalog_item = models.OneToOneField(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="part_color",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["part__part_id", "color__name", "variant"]
        constraints = [
            models.UniqueConstraint(fields=["part", "color", "variant"], name="uniq_part_color_variant")
        ]

    def __str__(self):
        v = f" ({self.variant})" if self.variant else ""
        return f"{self.part.part_id} - {self.color.name}{v}"

    @property
    def effective_part_color(self):
        return self.root_part_color or self

    @property
    def effective_part_color_id(self):
        return self.root_part_color_id or self.id

    @property
    def effective_catalog_item(self):
        if self.root_part_color_id and self.root_part_color:
            return self.root_part_color.catalog_item or self.catalog_item
        return self.catalog_item
