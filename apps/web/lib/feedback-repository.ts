import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateIssueTarget } from "@changethis/shared";
import type {
  ExternalIssueRef,
  FeedbackPayload,
  FeedbackStatus,
  IssueDraft,
  IssueProvider,
  IssueTarget
} from "@changethis/shared";

export type StoredFeedback = {
  id: string;
  projectKey: string;
  workspaceId?: string;
  projectName: string;
  issueTarget: IssueTarget;
  payload: FeedbackPayload;
  issueDraft: IssueDraft;
  status: FeedbackStatus;
  screenshotAsset?: StoredAsset;
  externalIssue?: ExternalIssueRef;
  lastError?: string;
  retryCount: number;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredAsset = {
  id: string;
  feedbackId: string;
  mimeType: string;
  bytes: number;
  dataUrl: string;
  createdAt: string;
};

export type FeedbackEvent = {
  id: string;
  feedbackId: string;
  fromStatus?: FeedbackStatus;
  toStatus: FeedbackStatus;
  reason?: string;
  provider?: IssueProvider;
  externalUrl?: string;
  createdAt: string;
};

type DataStore = {
  feedbacks: StoredFeedback[];
  events: FeedbackEvent[];
};

export type CreateFeedbackInput = {
  projectKey: string;
  projectName: string;
  issueTarget: IssueTarget;
  payload: FeedbackPayload;
  issueDraft: IssueDraft;
  screenshotDataUrl?: string;
  workspaceId?: string;
};

export type IssueAttemptResult =
  | { ok: true; externalIssue: ExternalIssueRef }
  | { ok: false; error: string; retryable: boolean; nextRetryAt?: string };

export type FeedbackRepository = {
  create(input: CreateFeedbackInput): Promise<StoredFeedback>;
  list(filters?: { projectKey?: string; status?: FeedbackStatus; workspaceId?: string }): Promise<StoredFeedback[]>;
  get(id: string): Promise<StoredFeedback | undefined>;
  markIssueCreationPending(id: string): Promise<StoredFeedback>;
  recordIssueAttempt(id: string, result: IssueAttemptResult): Promise<StoredFeedback>;
  markIgnored(id: string): Promise<StoredFeedback>;
  dueForRetry(now?: Date): Promise<StoredFeedback[]>;
  events(feedbackId: string): Promise<FeedbackEvent[]>;
};

const defaultStore: DataStore = {
  feedbacks: [],
  events: []
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const localDataFile = path.join(localDataDir, "feedback-store.json");

let repository: FeedbackRepository | undefined;
let fileLock: Promise<unknown> = Promise.resolve();

export function getFeedbackRepository(): FeedbackRepository {
  repository ??= new FileFeedbackRepository(localDataFile);
  return repository;
}

export class FileFeedbackRepository implements FeedbackRepository {
  constructor(private readonly filePath: string) {}

  async create(input: CreateFeedbackInput): Promise<StoredFeedback> {
    const issueTargetValidation = validateIssueTarget(input.issueTarget);

    if (!issueTargetValidation.ok) {
      throw new Error(`Cannot store feedback without a valid issue target: ${issueTargetValidation.error}`);
    }

    return this.update((store) => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const screenshotAsset = input.screenshotDataUrl
        ? createScreenshotAsset(id, input.screenshotDataUrl, now)
        : undefined;
      const feedback: StoredFeedback = {
        id,
        projectKey: input.projectKey,
        workspaceId: input.workspaceId,
        projectName: input.projectName,
        issueTarget: issueTargetValidation.value,
        payload: {
          ...input.payload,
          screenshotDataUrl: undefined
        },
        issueDraft: input.issueDraft,
        status: "raw",
        screenshotAsset,
        retryCount: 0,
        createdAt: now,
        updatedAt: now
      };

      store.feedbacks.unshift(feedback);
      store.events.unshift(createEvent(id, undefined, "raw", "feedback_received", undefined, undefined, now));
      return feedback;
    });
  }

  async list(filters: { projectKey?: string; status?: FeedbackStatus; workspaceId?: string } = {}): Promise<StoredFeedback[]> {
    const store = await this.read();
    return store.feedbacks
      .filter((feedback) => {
        if (!filters.workspaceId) {
          return true;
        }

        return false;
      })
      .filter((feedback) => !filters.projectKey || feedback.projectKey === filters.projectKey)
      .filter((feedback) => !filters.status || feedback.status === filters.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<StoredFeedback | undefined> {
    const store = await this.read();
    return store.feedbacks.find((feedback) => feedback.id === id);
  }

  async markIssueCreationPending(id: string): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "issue_creation_pending";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "issue_creation_pending", "provider_issue_creation_started", feedback.issueTarget.provider, undefined, now));
      return feedback;
    });
  }

  async recordIssueAttempt(id: string, result: IssueAttemptResult): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      if (result.ok) {
        feedback.status = "sent_to_provider";
        feedback.externalIssue = result.externalIssue;
        feedback.lastError = undefined;
        feedback.nextRetryAt = undefined;
        feedback.updatedAt = now;
        store.events.unshift(
          createEvent(id, fromStatus, "sent_to_provider", "provider_issue_created", result.externalIssue.provider, result.externalIssue.url, now)
        );
        return feedback;
      }

      feedback.retryCount += 1;
      feedback.status = result.retryable ? "retrying" : "failed";
      feedback.lastError = result.error;
      feedback.nextRetryAt = result.nextRetryAt;
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, feedback.status, result.error, feedback.issueTarget.provider, undefined, now));
      return feedback;
    });
  }

  async markIgnored(id: string): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "ignored";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "ignored", "ignored_from_inbox", undefined, undefined, now));
      return feedback;
    });
  }

  async dueForRetry(now = new Date()): Promise<StoredFeedback[]> {
    const store = await this.read();
    return store.feedbacks.filter((feedback) => {
      return feedback.status === "retrying" && feedback.nextRetryAt !== undefined && Date.parse(feedback.nextRetryAt) <= now.getTime();
    });
  }

  async events(feedbackId: string): Promise<FeedbackEvent[]> {
    const store = await this.read();
    return store.events.filter((event) => event.feedbackId === feedbackId);
  }

  private async read(): Promise<DataStore> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as DataStore;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return structuredClone(defaultStore);
      }

      throw error;
    }
  }

  private async update<T>(mutate: (store: DataStore) => T): Promise<T> {
    const next = fileLock.then(async () => {
      const store = await this.read();
      const result = mutate(store);
      await writeStore(this.filePath, store);
      return result;
    });

    fileLock = next.catch(() => undefined);
    return next;
  }
}

function createScreenshotAsset(feedbackId: string, dataUrl: string, now: string): StoredAsset {
  return {
    id: crypto.randomUUID(),
    feedbackId,
    mimeType: parseDataUrlMimeType(dataUrl),
    bytes: estimateDataUrlBytes(dataUrl),
    dataUrl,
    createdAt: now
  };
}

function createEvent(
  feedbackId: string,
  fromStatus: FeedbackStatus | undefined,
  toStatus: FeedbackStatus,
  reason: string,
  provider?: IssueProvider,
  externalUrl?: string,
  now = new Date().toISOString()
): FeedbackEvent {
  return {
    id: crypto.randomUUID(),
    feedbackId,
    fromStatus,
    toStatus,
    reason,
    provider,
    externalUrl,
    createdAt: now
  };
}

async function writeStore(filePath: string, store: DataStore): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

function findFeedback(store: DataStore, id: string): StoredFeedback {
  const feedback = store.feedbacks.find((item) => item.id === id);

  if (!feedback) {
    throw new Error(`Feedback ${id} was not found`);
  }

  return feedback;
}

function parseDataUrlMimeType(value: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(value);
  return match?.[1] ?? "application/octet-stream";
}

function estimateDataUrlBytes(value: string): number {
  const commaIndex = value.indexOf(",");
  return commaIndex === -1 ? value.length : Math.ceil((value.length - commaIndex - 1) * 0.75);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
