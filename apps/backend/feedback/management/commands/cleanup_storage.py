from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from feedback.models import Feedback
from feedback.storage import delete_relative_file


class Command(BaseCommand):
    help = "Remove screenshot files that are no longer referenced by feedback rows."

    def handle(self, *args, **options):
        detached = 0
        attached_feedbacks = Feedback.objects.filter(
            screenshot_removed_at__isnull=True,
            external_issue__provider_attachment_markdown__gt="",
        ).exclude(screenshot_path="")
        for feedback in attached_feedbacks:
            if delete_relative_file(feedback.screenshot_path):
                feedback.screenshot_removed_at = timezone.now()
                feedback.save(update_fields=["screenshot_removed_at", "updated_at"])
                detached += 1

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
        self.stdout.write(
            self.style.SUCCESS(
                f"Removed {detached} provider-attached screenshot(s) and {removed} orphaned file(s) from {Path(root)}."
            )
        )
