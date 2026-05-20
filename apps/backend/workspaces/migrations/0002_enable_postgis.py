from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS postgis;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
