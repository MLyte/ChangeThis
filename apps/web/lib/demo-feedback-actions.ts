import type { FeedbackRepository, StoredFeedback } from "./feedback-repository";

export type FeedbackActionScope = {
  feedback: StoredFeedback;
  workspaceId?: string;
};

export async function resolveFeedbackForAction(
  repository: FeedbackRepository,
  id: string,
  workspaceId: string
): Promise<FeedbackActionScope | undefined> {
  const scopedFeedback = await repository.get(id, { workspaceId });

  if (scopedFeedback) {
    return { feedback: scopedFeedback, workspaceId };
  }

  if (process.env.VERCEL_ENV === "production") {
    return undefined;
  }

  const demoFeedback = await repository.get(id);

  if (!demoFeedback || !isDemoFeedback(demoFeedback)) {
    return undefined;
  }

  return {
    feedback: demoFeedback,
    workspaceId: demoFeedback.workspaceId
  };
}

export function isDemoFeedback(feedback: StoredFeedback): boolean {
  const testRunId = feedback.payload.metadata.app?.testRunId;

  return testRunId?.startsWith("manual-demo-") === true
    || testRunId?.startsWith("realistic-demo-seed-") === true;
}
