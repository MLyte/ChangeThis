import type { FeedbackPayload, FeedbackStatus, IssueDraft } from "@changethis/shared";
import type { ChangeThisProject } from "./demo-project";

export type StoredFeedback = {
  id: string;
  receivedAt: string;
  status: FeedbackStatus;
  project: {
    publicKey: string;
    name: string;
  };
  payload: FeedbackPayload;
  issueDraft: IssueDraft;
};

const maxStoredFeedbacks = 100;

type FeedbackStoreState = {
  feedbacks: StoredFeedback[];
};

const globalStore = globalThis as typeof globalThis & {
  __changeThisFeedbackStore?: FeedbackStoreState;
};

const store = globalStore.__changeThisFeedbackStore ?? { feedbacks: [] };
globalStore.__changeThisFeedbackStore = store;

export function recordFeedback(params: {
  id: string;
  project: ChangeThisProject;
  payload: FeedbackPayload;
  issueDraft: IssueDraft;
}): StoredFeedback {
  const feedback: StoredFeedback = {
    id: params.id,
    receivedAt: new Date().toISOString(),
    status: "issue_creation_pending",
    project: {
      publicKey: params.project.publicKey,
      name: params.project.name
    },
    payload: params.payload,
    issueDraft: params.issueDraft
  };

  store.feedbacks = [feedback, ...store.feedbacks].slice(0, maxStoredFeedbacks);
  return feedback;
}

export function listFeedbacks(projectKey?: string): StoredFeedback[] {
  const feedbacks = projectKey
    ? store.feedbacks.filter((feedback) => feedback.project.publicKey === projectKey)
    : store.feedbacks;

  return feedbacks.map((feedback) => ({
    ...feedback,
    project: { ...feedback.project },
    payload: {
      ...feedback.payload,
      metadata: {
        ...feedback.payload.metadata,
        viewport: { ...feedback.payload.metadata.viewport }
      },
      pin: feedback.payload.pin ? { ...feedback.payload.pin } : undefined
    },
    issueDraft: {
      ...feedback.issueDraft,
      labels: [...feedback.issueDraft.labels]
    }
  }));
}
