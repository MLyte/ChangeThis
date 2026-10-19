from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..crypto import decrypt_credential, encrypt_credential
from ..database import get_db
from ..models import ProviderCredential, ProviderIntegration
from ..schemas import (
    CredentialSaveRequest,
    CredentialSaveResponse,
    CredentialValueResponse,
    ProviderIntegrationEnsureRequest,
    ProviderIntegrationResponse,
    ProviderIntegrationStatusUpdateRequest,
)

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/{provider}/repositories")
async def list_repositories(provider: str) -> dict[str, object]:
    return {
        "provider": provider,
        "repositories": [],
        "next": None,
        "detail": "Provider repository listing is wired here for the internal backend migration."
    }


@router.post("/{provider}/ensure", response_model=ProviderIntegrationResponse)
async def ensure_integration(
    provider: str,
    payload: ProviderIntegrationEnsureRequest,
    db: AsyncSession = Depends(get_db),
) -> ProviderIntegrationResponse:
    result = await db.execute(
        select(ProviderIntegration)
        .where(ProviderIntegration.workspace_id == payload.workspace_id)
        .where(ProviderIntegration.provider == provider)
        .limit(1)
    )
    integration = result.scalar_one_or_none()

    if integration is None:
        integration = ProviderIntegration(
            workspace_id=payload.workspace_id,
            provider=provider,
            auth_type=payload.auth_type,
            base_url=payload.base_url,
            status="needs_setup",
        )
        db.add(integration)
        await db.commit()
        await db.refresh(integration)

    return to_integration_response(integration)


@router.get("/{provider}", response_model=ProviderIntegrationResponse)
async def get_integration(
    provider: str,
    integration_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ProviderIntegrationResponse:
    integration = await find_integration_or_404(db, integration_id)
    return to_integration_response(integration)


@router.patch("/{provider}/status", response_model=ProviderIntegrationResponse)
async def update_integration_status(
    provider: str,
    payload: ProviderIntegrationStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> ProviderIntegrationResponse:
    integration = await find_integration_or_404(db, payload.integration_id)

    if payload.status is not None:
        integration.status = payload.status
    if payload.installation_id is not None:
        integration.installation_id = payload.installation_id
    if payload.external_account_id is not None:
        integration.external_account_id = payload.external_account_id
    if payload.base_url is not None:
        integration.base_url = payload.base_url
    integration.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(integration)
    return to_integration_response(integration)


@router.post("/{provider}/credentials", response_model=CredentialSaveResponse)
async def save_credential(
    provider: str,
    payload: CredentialSaveRequest,
    db: AsyncSession = Depends(get_db),
) -> CredentialSaveResponse:
    await find_integration_or_404(db, payload.integration_id)
    ciphertext, iv, tag = encrypt_credential(payload.value)
    storage_reference = f"db:{provider}:{payload.integration_id}:{payload.kind}"

    result = await db.execute(
        select(ProviderCredential)
        .where(ProviderCredential.integration_id == payload.integration_id)
        .where(ProviderCredential.credential_kind == payload.kind)
        .limit(1)
    )
    credential = result.scalar_one_or_none()

    if credential is None:
        credential = ProviderCredential(
            integration_id=payload.integration_id,
            credential_kind=payload.kind,
            storage_reference=storage_reference,
        )
        db.add(credential)

    credential.storage_reference = storage_reference
    credential.scopes = payload.scopes
    credential.expires_at = payload.expires_at
    credential.ciphertext = ciphertext
    credential.iv = iv
    credential.tag = tag
    credential.status = "active"
    credential.rotated_at = datetime.now(UTC)
    credential.updated_at = datetime.now(UTC)

    await db.commit()
    return CredentialSaveResponse(storage_reference=storage_reference)


@router.get("/{provider}/credentials", response_model=CredentialValueResponse)
async def get_credential(
    provider: str,
    integration_id: UUID,
    kind: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
) -> CredentialValueResponse:
    result = await db.execute(
        select(ProviderCredential)
        .where(ProviderCredential.integration_id == integration_id)
        .where(ProviderCredential.credential_kind == kind)
        .limit(1)
    )
    credential = result.scalar_one_or_none()

    if credential is None or not credential.ciphertext or not credential.iv or not credential.tag:
        return CredentialValueResponse(value=None)

    return CredentialValueResponse(value=decrypt_credential(credential.ciphertext, credential.iv, credential.tag))


@router.delete("/{provider}/credentials")
async def delete_credentials(
    provider: str,
    integration_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    result = await db.execute(select(ProviderCredential).where(ProviderCredential.integration_id == integration_id))
    credentials = list(result.scalars().all())

    for credential in credentials:
        await db.delete(credential)

    await db.commit()
    return {"removed": len(credentials)}


async def find_integration_or_404(db: AsyncSession, integration_id: UUID) -> ProviderIntegration:
    result = await db.execute(select(ProviderIntegration).where(ProviderIntegration.id == integration_id).limit(1))
    integration = result.scalar_one_or_none()

    if integration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider integration not found")

    return integration


def to_integration_response(integration: ProviderIntegration) -> ProviderIntegrationResponse:
    return ProviderIntegrationResponse(
        id=integration.id,
        workspace_id=integration.workspace_id,
        provider=integration.provider,
        auth_type=integration.auth_type,
        external_account_id=integration.external_account_id,
        installation_id=integration.installation_id,
        base_url=integration.base_url,
        status=integration.status,
    )
