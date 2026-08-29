from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0003_catalogitem_bricklink_reference_price_and_more")]

    operations = [
        migrations.CreateModel(
            name="CatalogPricingSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("overall_markup_percent", models.DecimalField(decimal_places=2, default=Decimal("25.00"), max_digits=7)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
