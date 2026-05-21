from fastapi import APIRouter

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/{provider}/repositories")
async def list_repositories(provider: str) -> dict[str, object]:
    return {
        "provider": provider,
        "repositories": [],
        "next": None,
        "detail": "Provider repository listing is wired here for the internal backend migration."
    }
