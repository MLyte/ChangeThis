import type { ExternalIssueRef, IssueProvider, IssueTarget } from "@changethis/shared";
import type { ProviderRepository } from "./issue-providers";

export const demoProviderTokens: Record<IssueProvider, string> = {
  github: "changethis-demo-github-token",
  gitlab: "changethis-demo-gitlab-token"
};

export function isDemoProviderToken(provider: IssueProvider, token: string | undefined): boolean {
  return token === demoProviderTokens[provider];
}

export function demoRepositoriesForProvider(provider: IssueProvider): ProviderRepository[] {
  if (provider === "github") {
    return [
      {
        provider,
        id: "atelier-nova/portal-staging",
        name: "portal-staging",
        fullName: "atelier-nova/portal-staging",
        namespace: "atelier-nova",
        project: "portal-staging",
        webUrl: "https://github.com/atelier-nova/portal-staging",
        private: true,
        defaultBranch: "main"
      },
      {
        provider,
        id: "cabinet-orion/booking-portal",
        name: "booking-portal",
        fullName: "cabinet-orion/booking-portal",
        namespace: "cabinet-orion",
        project: "booking-portal",
        webUrl: "https://github.com/cabinet-orion/booking-portal",
        private: true,
        defaultBranch: "main"
      }
    ];
  }

  return [
    {
      provider,
      id: "studio-lumen/shopfront",
      name: "shopfront",
      fullName: "studio-lumen/shopfront",
      namespace: "studio-lumen",
      project: "shopfront",
      webUrl: "https://gitlab.com/studio-lumen/shopfront",
      private: true,
      defaultBranch: "main",
      externalProjectId: "studio-lumen/shopfront"
    }
  ];
}

export function createDemoExternalIssueRef(provider: IssueProvider, target: IssueTarget, title: string): ExternalIssueRef {
  const issueNumber = Math.max(100, checksum(`${target.webUrl}:${title}`) % 9000);
  const issuePath = provider === "gitlab" ? "/-/issues/" : "/issues/";

  return {
    provider,
    id: `demo-${issueNumber}`,
    number: provider === "github" ? issueNumber : undefined,
    iid: provider === "gitlab" ? issueNumber : undefined,
    url: `${target.webUrl}${issuePath}${issueNumber}`,
    state: "open"
  };
}

function checksum(value: string): number {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}
