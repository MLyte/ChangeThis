from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """CRA-W local user account.

    The existing product signs users in with email/password. Keeping username
    populated with the email preserves Django admin compatibility while making
    email the user-facing identifier.
    """

    email = models.EmailField(unique=True)
    REQUIRED_FIELDS = ["email"]
