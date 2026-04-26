import type { ExternalIssueRef, IssueDraft, IssueProvider, IssueTarget } from "@changethis/shared";

export type IssueProviderErrorCode =
  | "auth_failed"
  | "permission_denied"
  | "target_not_found"
  | "validation_failed"
  | "rate_limited"
  | "transient_failure";

export class IssueProviderError extends Error {
  readonly code: IssueProviderErrorCode;
  readonly provider: IssueProvider;
  readonly status?: number;

  constructor(provider: IssueProvider, code: IssueProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = "IssueProviderError";
    this.provider = provider;
    this.code = code;
    this.status = status;
  }
}

export type IssueProviderClient = {
  provider: IssueProvider;
  createIssue(target: IssueTarget, draft: IssueDraft): Promise<ExternalIssueRef>;
  getIssue?(target: IssueTarget, ref: ExternalIssueRef): Promise<ExternalIssueRef>;
};

const unsupportedProviderClients: Record<IssueProvider, IssueProviderClient> = {
  github: createUnsupportedProviderClient("github"),
  gitlab: createUnsupportedProviderClient("gitlab")
};

export function getIssueProviderClient(provider: IssueProvider): IssueProviderClient {
  return unsupportedProviderClients[provider];
}

function createUnsupportedProviderClient(provider: IssueProvider): IssueProviderClient {
  return {
    provider,
    async createIssue() {
      throw new IssueProviderError(
        provider,
        "transient_failure",
        `${provider} issue creation is not wired yet.`
      );
    }
  };
}
