import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

_VALID_SCHEMA_NAME = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


class Command(BaseCommand):
    """Creates the DB_SCHEMA Postgres schema, if configured and not already present.

    Needed when this database is shared with an unrelated project: without a dedicated
    schema, Django's own framework tables (django_migrations, auth_permission,
    django_content_type, ...) collide between the two codebases' migration histories.
    Must run BEFORE `migrate` — search_path falls back silently to `public` for table
    creation if the target schema doesn't exist yet, so this can't be folded into the
    first migration itself.
    """

    help = "Creates the DB_SCHEMA Postgres schema if it doesn't exist yet."

    def handle(self, *args, **options):
        schema = getattr(settings, "DB_SCHEMA", "")
        if not schema:
            self.stdout.write("DB_SCHEMA not set — skipping (tables will use the default schema).")
            return
        if connection.vendor != "postgresql":
            self.stdout.write("Not using Postgres — skipping schema setup.")
            return
        if not _VALID_SCHEMA_NAME.match(schema):
            raise CommandError(f"DB_SCHEMA '{schema}' is not a valid Postgres identifier.")

        with connection.cursor() as cursor:
            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
        self.stdout.write(self.style.SUCCESS(f"Schema '{schema}' ready."))
