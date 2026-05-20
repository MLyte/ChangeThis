from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from changethis_craw.views import current_workspace


@require_GET
def members(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse({"error": "authentication required"}, status=401)
    member = current_workspace(request.user)
    if member is None:
        return JsonResponse({"members": []})
    rows = member.organization.members.select_related("user").order_by("created_at")
    return JsonResponse(
        {
            "members": [
                {
                    "id": str(row.id),
                    "email": row.user.email,
                    "role": row.role,
                    "status": row.status,
                    "createdAt": row.created_at.isoformat(),
                }
                for row in rows
            ]
        }
    )
