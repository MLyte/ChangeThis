import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildIssueDraft, validateIssueTarget } from "@changethis/shared";
import type {
  ExternalIssueRef,
  FeedbackPayload,
  FeedbackReporter,
  FeedbackScreenshotSource,
  FeedbackStatus,
  IssueDraft,
  IssueProvider,
  IssueTarget
} from "@changethis/shared";
import { getInternalApiUrl, getInternalSessionCookieHeader } from "./internal-api";
import { getDataStoreMode } from "./runtime";

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
  browserCaptureAsset?: StoredAsset;
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
  kind?: FeedbackScreenshotSource;
  mimeType: string;
  bytes: number;
  dataUrl?: string;
  thumbnailDataUrl?: string;
  storagePath?: string;
  hash?: string;
  status: "active" | "archived" | "deleted";
  lastUsedAt?: string;
  usageCount: number;
  archivedAt?: string;
  deletedAt?: string;
  createdAt: string;
};

export type ScreenshotCleanupPolicy = {
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  minArchiveBytes?: number;
  now?: Date;
};

export type ScreenshotCleanupResult = {
  archived: number;
  deleted: number;
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
  get(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback | undefined>;
  updateReporter(id: string, reporter: FeedbackReporter | undefined, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  updateIssueDraft(id: string, issueDraft: IssueDraft, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markIssueCreationPending(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  recordIssueAttempt(id: string, result: IssueAttemptResult, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  recordExternalIssueState(id: string, externalIssue: ExternalIssueRef, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markKept(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markResolved(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markIgnored(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  recordBrowserCapture(id: string, dataUrl: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  dueForRetry(filters?: Date | { workspaceId?: string; now?: Date }): Promise<StoredFeedback[]>;
  events(feedbackId: string, filters?: { workspaceId?: string }): Promise<FeedbackEvent[]>;
  clearWorkspace(workspaceId: string): Promise<{ feedbacks: number; events: number }>;
  cleanupScreenshotAssets?(policy?: ScreenshotCleanupPolicy): Promise<ScreenshotCleanupResult>;
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
  repository ??= getDataStoreMode() === "internal" ? new InternalFeedbackRepository() : new FileFeedbackRepository(localDataFile);
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
        ? createScreenshotAsset(id, input.screenshotDataUrl, input.payload.screenshotThumbnailDataUrl, now, input.payload.screenshotSource ?? "client_capture")
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

        return feedback.workspaceId === filters.workspaceId;
      })
      .filter((feedback) => !filters.projectKey || feedback.projectKey === filters.projectKey)
      .filter((feedback) => !filters.status || feedback.status === filters.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback | undefined> {
    const store = await this.read();
    return store.feedbacks.find((feedback) => feedback.id === id && belongsToWorkspace(feedback, filters.workspaceId));
  }

  async updateIssueDraft(id: string, issueDraft: IssueDraft, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      feedback.issueDraft = {
        title: issueDraft.title,
        description: issueDraft.description,
        labels: [...issueDraft.labels]
      };
      feedback.updatedAt = new Date().toISOString();
      return feedback;
    });
  }

  async updateReporter(id: string, reporter: FeedbackReporter | undefined, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const payload = {
        ...feedback.payload,
        reporter
      };
      const issueDraft = buildIssueDraft(payload);

      feedback.payload = payload;
      feedback.issueDraft = issueDraft;
      feedback.updatedAt = new Date().toISOString();
      return feedback;
    });
  }

  async markIssueCreationPending(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "issue_creation_pending";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "issue_creation_pending", "provider_issue_creation_started", feedback.issueTarget.provider, undefined, now));
      return feedback;
    });
  }

  async recordIssueAttempt(id: string, result: IssueAttemptResult, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
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

  async recordExternalIssueState(id: string, externalIssue: ExternalIssueRef, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.externalIssue = externalIssue;
      feedback.status = externalIssue.state === "closed" ? "resolved" : "sent_to_provider";
      feedback.updatedAt = now;
      store.events.unshift(
        createEvent(id, fromStatus, feedback.status, "provider_issue_state_synced", externalIssue.provider, externalIssue.url, now)
      );
      return feedback;
    });
  }

  async markKept(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "kept";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "kept", "kept_without_issue", undefined, undefined, now));
      return feedback;
    });
  }

  async markResolved(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "resolved";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "resolved", "provider_issue_closed", feedback.issueTarget.provider, feedback.externalIssue?.url, now));
      return feedback;
    });
  }

  async markIgnored(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "ignored";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "ignored", "ignored_from_inbox", undefined, undefined, now));
      return feedback;
    });
  }

  async recordBrowserCapture(id: string, dataUrl: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      feedback.browserCaptureAsset = createScreenshotAsset(id, dataUrl, undefined, now, "browser_capture");
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, feedback.status, feedback.status, "browser_capture_created", undefined, undefined, now));
      return feedback;
    });
  }

  async dueForRetry(filters: Date | { workspaceId?: string; now?: Date } = {}): Promise<StoredFeedback[]> {
    const store = await this.read();
    const normalizedFilters = filters instanceof Date ? { now: filters } : filters;
    const now = normalizedFilters.now ?? new Date();
    return store.feedbacks.filter((feedback) => {
      return belongsToWorkspace(feedback, normalizedFilters.workspaceId)
        && feedback.status === "retrying"
        && feedback.nextRetryAt !== undefined
        && Date.parse(feedback.nextRetryAt) <= now.getTime();
    });
  }

  async events(feedbackId: string, filters: { workspaceId?: string } = {}): Promise<FeedbackEvent[]> {
    const store = await this.read();
    const feedback = store.feedbacks.find((item) => item.id === feedbackId && belongsToWorkspace(item, filters.workspaceId));
    if (!feedback) {
      return [];
    }

    return store.events.filter((event) => event.feedbackId === feedbackId);
  }

  async clearWorkspace(workspaceId: string): Promise<{ feedbacks: number; events: number }> {
    return this.update((store) => {
      const feedbackIds = new Set(store.feedbacks.filter((feedback) => feedback.workspaceId === workspaceId).map((feedback) => feedback.id));
      const feedbacks = feedbackIds.size;
      const events = store.events.filter((event) => feedbackIds.has(event.feedbackId)).length;

      store.feedbacks = store.feedbacks.filter((feedback) => feedback.workspaceId !== workspaceId);
      store.events = store.events.filter((event) => !feedbackIds.has(event.feedbackId));

      return { feedbacks, events };
    });
  }

  async cleanupScreenshotAssets(policy: ScreenshotCleanupPolicy = {}): Promise<ScreenshotCleanupResult> {
    const now = policy.now ?? new Date();
    const archiveBefore = now.getTime() - (policy.archiveAfterDays ?? 30) * 24 * 60 * 60 * 1000;
    const deleteBefore = now.getTime() - (policy.deleteAfterDays ?? 90) * 24 * 60 * 60 * 1000;
    const minArchiveBytes = policy.minArchiveBytes ?? 1_000_000;

    return this.update((store) => {
      let archived = 0;
      let deleted = 0;

      for (const feedback of store.feedbacks) {
        const asset = feedback.screenshotAsset;
        if (!asset || !canCleanupFeedbackStatus(feedback.status)) {
          continue;
        }

        if (
          (asset.status ?? "active") === "active"
          && asset.dataUrl
          && asset.bytes > minArchiveBytes
          && Date.parse(asset.lastUsedAt ?? asset.createdAt) <= archiveBefore
        ) {
          asset.status = "archived";
          asset.archivedAt = now.toISOString();
          asset.dataUrl = undefined;
          asset.bytes = asset.thumbnailDataUrl ? estimateDataUrlBytes(asset.thumbnailDataUrl) : 0;
          feedback.updatedAt = now.toISOString();
          archived += 1;
        }

        if (
          asset.status === "archived"
          && Date.parse(asset.archivedAt ?? asset.createdAt) <= deleteBefore
        ) {
          asset.status = "deleted";
          asset.deletedAt = now.toISOString();
          asset.dataUrl = undefined;
          asset.thumbnailDataUrl = undefined;
          asset.bytes = 0;
          feedback.updatedAt = now.toISOString();
          deleted += 1;
        }
      }

      return { archived, deleted };
    });
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

type InternalAssetRow = {
  id?: unknown;
  feedback_id?: unknown;
  kind?: unknown;
  mime_type?: unknown;
  bytes?: unknown;
  data_url?: unknown;
  thumbnail_data_url?: unknown;
  storage_path?: unknown;
  hash?: unknown;
  status?: unknown;
  last_used_at?: unknown;
  usage_count?: unknown;
  archived_at?: unknown;
  deleted_at?: unknown;
  created_at?: unknown;
};

type InternalExternalIssueRow = {
  provider?: unknown;
  id?: unknown;
  iid?: unknown;
  number?: unknown;
  url?: unknown;
  state?: unknown;
};

type InternalIssueTargetRow = {
  provider?: unknown;
  namespace?: unknown;
  project_name?: unknown;
  integration_id?: unknown;
  external_project_id?: unknown;
  web_url?: unknown;
};

type InternalIssueDraftRow = {
  title?: unknown;
  description?: unknown;
  labels?: unknown;
};

type InternalFeedbackRow = {
  id?: unknown;
  project_key?: unknown;
  workspace_id?: unknown;
  project_name?: unknown;
  issue_target?: InternalIssueTargetRow | null;
  payload?: unknown;
  issue_draft?: InternalIssueDraftRow | null;
  status?: unknown;
  screenshot_asset?: InternalAssetRow | null;
  browser_capture_asset?: InternalAssetRow | null;
  external_issue?: InternalExternalIssueRow | null;
  last_error?: unknown;
  retry_count?: unknown;
  next_retry_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type InternalFeedbackEventRow = {
  id?: unknown;
  feedback_id?: unknown;
  from_status?: unknown;
  to_status?: unknown;
  reason?: unknown;
  provider?: unknown;
  external_url?: unknown;
  created_at?: unknown;
};

export class InternalFeedbackRepository implements FeedbackRepository {
  async create(input: CreateFeedbackInput): Promise<StoredFeedback> {
    const origin = input.payload.metadata.origin ?? safeOriginFromUrl(input.payload.metadata.url);
    const row = await internalFeedbackRequest<InternalFeedbackRow>("/public/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {})
      },
      body: JSON.stringify({
        projectKey: input.projectKey,
        type: input.payload.type,
        message: input.payload.message,
        reporter: input.payload.reporter,
        metadata: input.payload.metadata,
        pin: input.payload.pin,
        pins: input.payload.pins,
        captureArea: input.payload.captureArea,
        screenshotDataUrl: input.screenshotDataUrl,
        screenshotThumbnailDataUrl: input.payload.screenshotThumbnailDataUrl,
        screenshotSource: input.payload.screenshotSource,
        issueDraft: input.issueDraft
      })
    });
    return mapInternalFeedback(row);
  }

  async list(filters: { projectKey?: string; status?: FeedbackStatus; workspaceId?: string } = {}): Promise<StoredFeedback[]> {
    const params = new URLSearchParams();
    if (filters.workspaceId) {
      params.set("workspace_id", filters.workspaceId);
    }
    if (filters.projectKey) {
      params.set("project_key", filters.projectKey);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }

    const rows = await internalFeedbackRequest<InternalFeedbackRow[]>(`/feedbacks?${params.toString()}`);
    return rows.map(mapInternalFeedback);
  }

  async get(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback | undefined> {
    const params = new URLSearchParams();
    if (filters.workspaceId) {
      params.set("workspace_id", filters.workspaceId);
    }

    const response = await internalFeedbackFetch(`/feedbacks/${encodeURIComponent(id)}?${params.toString()}`);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(await readInternalFeedbackErrorMessage(response));
    }

    return mapInternalFeedback((await response.json()) as InternalFeedbackRow);
  }

  async updateIssueDraft(id: string, issueDraft: IssueDraft, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const row = await internalFeedbackRequest<InternalFeedbackRow>(`/feedbacks/${encodeURIComponent(id)}/issue-draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: filters.workspaceId,
        title: issueDraft.title,
        description: issueDraft.description,
        labels: issueDraft.labels
      })
    });
    return mapInternalFeedback(row);
  }

  async updateReporter(id: string, reporter: FeedbackReporter | undefined, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const current = await this.requireExisting(id, filters);
    const issueDraft = buildIssueDraft({ ...current.payload, reporter });

    const row = await internalFeedbackRequest<InternalFeedbackRow>(`/feedbacks/${encodeURIComponent(id)}/reporter`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: filters.workspaceId, reporter, issue_draft: issueDraft })
    });
    return mapInternalFeedback(row);
  }

  async markIssueCreationPending(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.postAction(id, "issue-pending", filters.workspaceId);
  }

  async recordIssueAttempt(id: string, result: IssueAttemptResult, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const body = result.ok
      ? { workspace_id: filters.workspaceId, ok: true, external_issue: result.externalIssue }
      : {
          workspace_id: filters.workspaceId,
          ok: false,
          error: result.error,
          retryable: result.retryable,
          next_retry_at: result.nextRetryAt
        };

    const row = await internalFeedbackRequest<InternalFeedbackRow>(`/feedbacks/${encodeURIComponent(id)}/issue-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return mapInternalFeedback(row);
  }

  async recordExternalIssueState(id: string, externalIssue: ExternalIssueRef, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const row = await internalFeedbackRequest<InternalFeedbackRow>(`/feedbacks/${encodeURIComponent(id)}/external-issue-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: filters.workspaceId, ...externalIssue })
    });
    return mapInternalFeedback(row);
  }

  async markKept(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.postAction(id, "keep", filters.workspaceId);
  }

  async markResolved(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.postAction(id, "resolve", filters.workspaceId);
  }

  async markIgnored(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.postAction(id, "ignore", filters.workspaceId);
  }

  async recordBrowserCapture(id: string, dataUrl: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const row = await internalFeedbackRequest<InternalFeedbackRow>(`/feedbacks/${encodeURIComponent(id)}/browser-capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: filters.workspaceId, data_url: dataUrl })
    });
    return mapInternalFeedback(row);
  }

  async dueForRetry(filters: Date | { workspaceId?: string; now?: Date } = {}): Promise<StoredFeedback[]> {
    const normalized = filters instanceof Date ? { now: filters } : filters;
    const params = new URLSearchParams();
    if (normalized.workspaceId) {
      params.set("workspace_id", normalized.workspaceId);
    }
    if (normalized.now) {
      params.set("now", normalized.now.toISOString());
    }

    const rows = await internalFeedbackRequest<InternalFeedbackRow[]>(`/feedbacks/due-for-retry?${params.toString()}`);
    return rows.map(mapInternalFeedback);
  }

  async events(feedbackId: string, filters: { workspaceId?: string } = {}): Promise<FeedbackEvent[]> {
    const params = new URLSearchParams();
    if (filters.workspaceId) {
      params.set("workspace_id", filters.workspaceId);
    }

    const response = await internalFeedbackFetch(`/feedbacks/${encodeURIComponent(feedbackId)}/events?${params.toString()}`);
    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(await readInternalFeedbackErrorMessage(response));
    }

    const rows = (await response.json()) as InternalFeedbackEventRow[];
    return rows.map(mapInternalFeedbackEvent);
  }

  async clearWorkspace(workspaceId: string): Promise<{ feedbacks: number; events: number }> {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    return internalFeedbackRequest<{ feedbacks: number; events: number }>(`/feedbacks?${params.toString()}`, { method: "DELETE" });
  }

  async cleanupScreenshotAssets(policy: ScreenshotCleanupPolicy = {}): Promise<ScreenshotCleanupResult> {
    return internalFeedbackRequest<ScreenshotCleanupResult>("/feedbacks/cleanup-screenshots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CHANGETHIS_CRON_SECRET ?? process.env.CHANGETHIS_SECRET_KEY ?? ""}`
      },
      body: JSON.stringify({
        archive_after_days: policy.archiveAfterDays ?? 30,
        delete_after_days: policy.deleteAfterDays ?? 90,
        min_archive_bytes: policy.minArchiveBytes ?? 1_000_000
      })
    });
  }

  private async postAction(id: string, action: string, workspaceId: string | undefined): Promise<StoredFeedback> {
    const row = await internalFeedbackRequest<InternalFeedbackRow>(`/feedbacks/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId })
    });
    return mapInternalFeedback(row);
  }

  private async requireExisting(id: string, filters: { workspaceId?: string }): Promise<StoredFeedback> {
    const feedback = await this.get(id, filters);
    if (!feedback) {
      throw new Error(`Feedback ${id} was not found`);
    }
    return feedback;
  }
}

async function internalFeedbackFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cookieHeader = await getInternalSessionCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined)
  };

  if (cookieHeader && !headers.Authorization) {
    headers.Cookie = cookieHeader;
  }

  return fetch(`${getInternalApiUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

async function internalFeedbackRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await internalFeedbackFetch(path, init);
  if (!response.ok) {
    throw new Error(await readInternalFeedbackErrorMessage(response));
  }
  return (await response.json()) as T;
}

async function readInternalFeedbackErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // Keep the generic message when the API does not return JSON.
  }
  return `Feedback request failed with status ${response.status}`;
}

function safeOriginFromUrl(value: string): string | undefined {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function mapInternalAsset(row: InternalAssetRow | null | undefined): StoredAsset | undefined {
  if (!row) {
    return undefined;
  }

  return {
    id: String(row.id),
    feedbackId: String(row.feedback_id),
    kind: row.kind as FeedbackScreenshotSource | undefined,
    mimeType: String(row.mime_type),
    bytes: Number(row.bytes ?? 0),
    dataUrl: typeof row.data_url === "string" ? row.data_url : undefined,
    thumbnailDataUrl: typeof row.thumbnail_data_url === "string" ? row.thumbnail_data_url : undefined,
    storagePath: typeof row.storage_path === "string" ? row.storage_path : undefined,
    hash: typeof row.hash === "string" ? row.hash : undefined,
    status: (row.status as StoredAsset["status"] | undefined) ?? "active",
    lastUsedAt: typeof row.last_used_at === "string" ? row.last_used_at : undefined,
    usageCount: Number(row.usage_count ?? 0),
    archivedAt: typeof row.archived_at === "string" ? row.archived_at : undefined,
    deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString()
  };
}

function mapInternalExternalIssue(row: InternalExternalIssueRow | null | undefined): ExternalIssueRef | undefined {
  if (!row) {
    return undefined;
  }

  return {
    provider: row.provider as IssueProvider,
    id: typeof row.id === "string" ? row.id : undefined,
    iid: typeof row.iid === "number" ? row.iid : undefined,
    number: typeof row.number === "number" ? row.number : undefined,
    url: String(row.url),
    state: row.state as "open" | "closed" | undefined
  };
}

function mapInternalFeedback(row: InternalFeedbackRow): StoredFeedback {
  const issueTargetRow = row.issue_target;
  const issueDraftRow = row.issue_draft;

  return {
    id: String(row.id),
    projectKey: String(row.project_key),
    workspaceId: typeof row.workspace_id === "string" ? row.workspace_id : undefined,
    projectName: String(row.project_name),
    issueTarget: {
      provider: (issueTargetRow?.provider as IssueProvider) ?? "github",
      namespace: typeof issueTargetRow?.namespace === "string" ? issueTargetRow.namespace : "",
      project: typeof issueTargetRow?.project_name === "string" ? issueTargetRow.project_name : "",
      integrationId: typeof issueTargetRow?.integration_id === "string" ? issueTargetRow.integration_id : undefined,
      externalProjectId: typeof issueTargetRow?.external_project_id === "string" ? issueTargetRow.external_project_id : undefined,
      webUrl: typeof issueTargetRow?.web_url === "string" ? issueTargetRow.web_url : undefined
    },
    payload: row.payload as FeedbackPayload,
    issueDraft: {
      title: typeof issueDraftRow?.title === "string" ? issueDraftRow.title : "",
      description: typeof issueDraftRow?.description === "string" ? issueDraftRow.description : "",
      labels: Array.isArray(issueDraftRow?.labels) ? issueDraftRow.labels.filter((label): label is string => typeof label === "string") : []
    },
    status: row.status as FeedbackStatus,
    screenshotAsset: mapInternalAsset(row.screenshot_asset),
    browserCaptureAsset: mapInternalAsset(row.browser_capture_asset),
    externalIssue: mapInternalExternalIssue(row.external_issue),
    lastError: typeof row.last_error === "string" ? row.last_error : undefined,
    retryCount: Number(row.retry_count ?? 0),
    nextRetryAt: typeof row.next_retry_at === "string" ? row.next_retry_at : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapInternalFeedbackEvent(row: InternalFeedbackEventRow): FeedbackEvent {
  return {
    id: String(row.id),
    feedbackId: String(row.feedback_id),
    fromStatus: row.from_status as FeedbackStatus | undefined,
    toStatus: row.to_status as FeedbackStatus,
    reason: typeof row.reason === "string" ? row.reason : undefined,
    provider: row.provider as IssueProvider | undefined,
    externalUrl: typeof row.external_url === "string" ? row.external_url : undefined,
    createdAt: String(row.created_at)
  };
}

function canCleanupFeedbackStatus(status: FeedbackStatus): boolean {
  return status === "ignored" || status === "resolved";
}

function createScreenshotAsset(feedbackId: string, dataUrl: string, thumbnailDataUrl: string | undefined, now: string, kind: FeedbackScreenshotSource): StoredAsset {
  return {
    id: crypto.randomUUID(),
    feedbackId,
    kind,
    mimeType: parseDataUrlMimeType(dataUrl),
    bytes: estimateDataUrlBytes(dataUrl),
    dataUrl,
    thumbnailDataUrl,
    hash: hashDataUrl(dataUrl),
    status: "active",
    lastUsedAt: now,
    usageCount: 1,
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

function findFeedback(store: DataStore, id: string, workspaceId?: string): StoredFeedback {
  const feedback = store.feedbacks.find((item) => item.id === id && belongsToWorkspace(item, workspaceId));

  if (!feedback) {
    throw new Error(`Feedback ${id} was not found`);
  }

  return feedback;
}

function belongsToWorkspace(feedback: StoredFeedback, workspaceId?: string): boolean {
  return !workspaceId || feedback.workspaceId === workspaceId;
}

function parseDataUrlMimeType(value: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(value);
  return match?.[1] ?? "application/octet-stream";
}

function estimateDataUrlBytes(value: string): number {
  const commaIndex = value.indexOf(",");
  return commaIndex === -1 ? value.length : Math.ceil((value.length - commaIndex - 1) * 0.75);
}

function hashDataUrl(value: string): string {
  const commaIndex = value.indexOf(",");
  const payload = commaIndex === -1 ? value : value.slice(commaIndex + 1);
  return createHash("sha256").update(payload).digest("hex");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
