from django.core.management.base import BaseCommand

from feedback.models import ProviderIssueAttempt
from feedback.providers import run_due_issue_attempt


class Command(BaseCommand):
    help = "Run due synchronous provider jobs stored in PostgreSQL."

    def handle(self, *args, **options):
        attempts = ProviderIssueAttempt.objects.filter(status=ProviderIssueAttempt.Status.DUE).order_by(
            "due_at", "created_at"
        )[:50]
        count = 0
        for attempt in attempts:
            run_due_issue_attempt(attempt)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Processed {count} due job(s)."))
