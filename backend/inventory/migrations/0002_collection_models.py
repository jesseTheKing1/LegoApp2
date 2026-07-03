import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_remove_user_is_approved_remove_user_is_verified"),
        ("inventory", "0001_initial"),
        ("minifigs", "0003_minifigingredient_and_more"),
        ("parts", "0003_alter_partcolor_variant"),
        ("sets", "0002_setpart_step_number"),
    ]

    operations = [
        migrations.CreateModel(
            name="CollectionSet",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                ("lego_set", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collected_by", to="sets.set")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collection_sets", to="accounts.user")),
            ],
            options={"ordering": ["-added_at"]},
        ),
        migrations.CreateModel(
            name="CollectionPart",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                ("part_color", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collected_by", to="parts.partcolor")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collection_parts", to="accounts.user")),
            ],
            options={"ordering": ["-added_at"]},
        ),
        migrations.CreateModel(
            name="CollectionMinifig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                ("minifig", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collected_by", to="minifigs.minifig")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collection_minifigs", to="accounts.user")),
            ],
            options={"ordering": ["-added_at"]},
        ),
        migrations.AddConstraint(
            model_name="collectionset",
            constraint=models.UniqueConstraint(fields=("user", "lego_set"), name="unique_user_collection_set"),
        ),
        migrations.AddConstraint(
            model_name="collectionpart",
            constraint=models.UniqueConstraint(fields=("user", "part_color"), name="unique_user_collection_part"),
        ),
        migrations.AddConstraint(
            model_name="collectionminifig",
            constraint=models.UniqueConstraint(fields=("user", "minifig"), name="unique_user_collection_minifig"),
        ),
    ]
