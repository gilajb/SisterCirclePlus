import os

from django.core.management.base import BaseCommand, CommandError

from api.models import User


class Command(BaseCommand):
    """Creates (or updates) the one privileged admin-override account, reading
    credentials from the environment rather than accepting them as arguments — keeps
    them out of shell history and source control alike.

    Usage: set ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD, then run:
        python manage.py seed_admin
    """

    help = "Creates or updates the seed admin account with is_admin_override=True."

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME")
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        missing = [
            name
            for name, value in (
                ("ADMIN_USERNAME", username),
                ("ADMIN_EMAIL", email),
                ("ADMIN_PASSWORD", password),
            )
            if not value
        ]
        if missing:
            raise CommandError(
                f"Missing required environment variable(s): {', '.join(missing)}. "
                "Set them before running seed_admin (see .env.example)."
            )

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_admin_override = True
        user.set_password(password)
        user.save()

        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} admin-override account '{username}'."))
