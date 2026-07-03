from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("inventory", "0002_collection_models")]

    operations = [
        migrations.AddField(
            model_name="collectionset",
            name="is_locked",
            field=models.BooleanField(
                default=False,
                help_text="Keep this set assembled and do not use its pieces for build matching.",
            ),
        ),
    ]
