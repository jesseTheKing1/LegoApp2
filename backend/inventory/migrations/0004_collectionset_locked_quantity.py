from django.db import migrations, models
from django.db.models import F, Q


def preserve_existing_locks(apps, schema_editor):
    CollectionSet = apps.get_model("inventory", "CollectionSet")
    for row in CollectionSet.objects.filter(is_locked=True):
        row.locked_quantity = row.quantity
        row.save(update_fields=["locked_quantity"])


class Migration(migrations.Migration):
    dependencies = [("inventory", "0003_collectionset_is_locked")]

    operations = [
        migrations.AddField(
            model_name="collectionset",
            name="locked_quantity",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Number of owned copies kept assembled and excluded from build matching.",
            ),
        ),
        migrations.RunPython(preserve_existing_locks, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="collectionset",
            constraint=models.CheckConstraint(
                check=Q(locked_quantity__lte=F("quantity")),
                name="collection_locked_quantity_lte_quantity",
            ),
        ),
    ]
