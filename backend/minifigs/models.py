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
    theme = models.ForeignKey(
        Theme,
        on_delete=models.CASCADE,
        related_name="minifigs",
        blank=True,
        null=True,
    )

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


class MinifigIngredient(models.Model):
    ROLE_HEAD = "head"
    ROLE_HAIR = "hair"
    ROLE_HAT = "hat"
    ROLE_HELMET = "helmet"
    ROLE_TORSO = "torso"
    ROLE_LEGS = "legs"
    ROLE_HEADGEAR = "headgear"
    ROLE_ACCESSORY = "accessory"
    ROLE_WEAPON = "weapon"
    ROLE_CAPE = "cape"
    ROLE_BODY = "body"
    ROLE_OTHER = "other"

    ROLE_CHOICES = [
        (ROLE_HEAD, "Head"),
        (ROLE_HAIR, "Hair"),
        (ROLE_HAT, "Hat"),
        (ROLE_HELMET, "Helmet"),
        (ROLE_TORSO, "Torso"),
        (ROLE_LEGS, "Legs"),
        (ROLE_HEADGEAR, "Headgear"),
        (ROLE_ACCESSORY, "Accessory"),
        (ROLE_WEAPON, "Weapon"),
        (ROLE_CAPE, "Cape"),
        (ROLE_BODY, "Body"),
        (ROLE_OTHER, "Other"),
    ]

    minifig = models.ForeignKey(
        Minifig,
        on_delete=models.CASCADE,
        related_name="ingredients",
    )
    part_color = models.ForeignKey(
        "parts.PartColor",
        on_delete=models.PROTECT,
        related_name="minifig_ingredients",
    )

    quantity = models.PositiveIntegerField(default=1)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLE_OTHER)
    is_required = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["minifig", "part_color", "role", "sort_order"],
                name="uniq_minifig_partcolor_role_sort"
            )
        ]

    def __str__(self):
        return f"{self.minifig.name} → {self.part_color} x{self.quantity}"