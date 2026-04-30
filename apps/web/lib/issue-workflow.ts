import { validateIssueTarget } from "@changethis/shared";
import type { IssueDraft } from "@changethis/shared";
import type { StoredFeedback } from "./feedback-repository";
import { getFeedbackRepository } from "./feedback-repository";
import { getIssueProviderClient, IssueProviderError } from "./issue-providers";
import { logError, logInfo, logWarn } from "./logger";

const retryBaseDelayMs = 30_000;
const retryMaxDelayMs = 15 * 60_000;

export async function createIssueForFeedback(
  feedback: StoredFeedback,
  requestId: string,
  options: { issueDraft?: IssueDraft; workspaceId?: string } = {}
): Promise<StoredFeedback> {
  if (feedback.externalIssue && feedback.status === "sent_to_provider") {
    return feedback;
  }

  const repository = getFeedbackRepository();
  if (options.issueDraft) {
    await repository.updateIssueDraft(feedback.id, options.issueDraft, options);
  }

  const issueTargetValidation = validateIssueTarget(feedback.issueTarget);

  if (!issueTargetValidation.ok) {
    const updated = await repository.recordIssueAttempt(feedback.id, {
      ok: false,
      error: `Issue destination is invalid: ${issueTargetValidation.error}`,
      retryable: false
    }, options);

    logWarn("provider_issue_create_rejected_invalid_target", {
      request_id: requestId,
      project_id: feedback.projectKey,
      feedback_id: feedback.id,
      error: issueTargetValidation.error
    });

    return updated;
  }

  const pendingFeedback = await repository.markIssueCreationPending(feedback.id, options);
  const client = getIssueProviderClient(feedback.issueTarget.provider, {
    integrationId: feedback.issueTarget.integrationId
  });
  const idempotencyKey = `changethis:${pendingFeedback.id}`;

  logInfo("provider_issue_create_started", {
    request_id: requestId,
    project_id: pendingFeedback.projectKey,
    feedback_id: pendingFeedback.id,
    provider: pendingFeedback.issueTarget.provider
  });

  try {
    const externalIssue = await client.createIssue(pendingFeedback.issueTarget, pendingFeedback.issueDraft, { idempotencyKey });
    const updated = await repository.recordIssueAttempt(pendingFeedback.id, { ok: true, externalIssue }, options);

    logInfo("provider_issue_create_succeeded", {
      request_id: requestId,
      project_id: pendingFeedback.projectKey,
      feedback_id: pendingFeedback.id,
      provider: externalIssue.provider,
      external_url: externalIssue.url
    });

    return updated;
  } catch (error) {
    const retryable = isRetryable(error);
    const message = error instanceof Error ? error.message : "Unknown provider error";
    const nextRetryAt = retryable ? nextRetryDate(pendingFeedback.retryCount).toISOString() : undefined;
    const updated = await repository.recordIssueAttempt(pendingFeedback.id, {
      ok: false,
      error: message,
      retryable,
      nextRetryAt
    }, options);

    const log = retryable ? logWarn : logError;
    log("provider_issue_create_failed", {
      request_id: requestId,
      project_id: pendingFeedback.projectKey,
      feedback_id: pendingFeedback.id,
      provider: pendingFeedback.issueTarget.provider,
      retryable,
      next_retry_at: nextRetryAt,
      error: message
    });

    return updated;
  }
}

export async function processDueIssueRetries(requestId: string, options: { workspaceId?: string } = {}): Promise<StoredFeedback[]> {
  const repository = getFeedbackRepository();
  const dueFeedbacks = await repository.dueForRetry(options);
  const results: StoredFeedback[] = [];

  for (const feedback of dueFeedbacks) {
    results.push(await createIssueForFeedback(feedback, requestId, options));
  }

  return results;
}

export async function syncFeedbackIssueState(
  feedback: StoredFeedback,
  requestId: string,
  options: { workspaceId?: string } = {}
): Promise<StoredFeedback> {
  if (!feedback.externalIssue) {
    return feedback;
  }

  const client = getIssueProviderClient(feedback.issueTarget.provider, {
    integrationId: feedback.issueTarget.integrationId
  });

  if (!client.getIssue) {
    return feedback;
  }

  const externalIssue = await client.getIssue(feedback.issueTarget, feedback.externalIssue);
  const updated = await getFeedbackRepository().recordExternalIssueState(feedback.id, externalIssue, options);

  logInfo("provider_issue_state_synced", {
    request_id: requestId,
    project_id: updated.projectKey,
    feedback_id: updated.id,
    provider: externalIssue.provider,
    state: externalIssue.state
  });

  return updated;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof IssueProviderError) {
    return error.code === "rate_limited" || error.code === "transient_failure" || (error.status !== undefined && error.status >= 500);
  }

  return true;
}

function nextRetryDate(retryCount: number): Date {
  const delay = Math.min(retryBaseDelayMs * 2 ** retryCount, retryMaxDelayMs);
  return new Date(Date.now() + delay);
}
