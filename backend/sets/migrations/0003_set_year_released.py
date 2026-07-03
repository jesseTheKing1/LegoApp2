from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("sets", "0002_setpart_step_number")]

    operations = [
        migrations.AddField(
            model_name="set",
            name="year_released",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name="setpart",
            options={"ordering": ["bag_number", "step_number", "instruction_page", "sort_order", "id"]},
        ),
    ]
