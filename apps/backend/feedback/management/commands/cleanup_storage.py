from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from feedback.models import Feedback


class Command(BaseCommand):
    help = "Remove screenshot files that are no longer referenced by feedback rows."

    def handle(self, *args, **options):
        referenced = set(Feedback.objects.exclude(screenshot_path="").values_list("screenshot_path", flat=True))
        removed = 0
        root = settings.FILES_ROOT
        if root.exists():
            for path in root.rglob("*"):
                if not path.is_file():
                    continue
                relative = path.relative_to(root).as_posix()
                if relative not in referenced:
                    path.unlink()
                    removed += 1
        self.stdout.write(self.style.SUCCESS(f"Removed {removed} orphaned file(s) from {Path(root)}."))
