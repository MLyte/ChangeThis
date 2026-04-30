"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  GitBranch,
  Globe2,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon
} from "lucide-react";
import type { IssueProvider } from "@changethis/shared";
import type { ChangeThisProject } from "../../lib/demo-project";
import type { ProviderIntegrationSummary } from "../../lib/provider-integrations";
import { T, useLanguage } from "../i18n";
import { ProviderBadge } from "../provider-badge";

type Props = {
  projects: ChangeThisProject[];
  integrations: ProviderIntegrationSummary[];
  section: SettingsSection;
};

type ProjectView = ChangeThisProject & {
  installSnippet?: string;
  metrics?: {
    feedbacksReceived: number;
    issuesCreated: number;
    failedIssues: number;
    lastFeedbackAt?: string;
  };
};
export type SettingsSection = "git-connections" | "connected-sites";

type RepositoryOption = {
  id: string;
  label: string;
  namespace: string;
  project: string;
  webUrl: string;
  externalProjectId?: string;
};

type RepositoryLoadState = "idle" | "loading" | "ready" | "empty" | "unavailable" | "error";
type ConnectionHealthState = "inactive" | "checking" | "active" | "error";
type ConnectionTestResult = {
  state: ConnectionHealthState;
  message?: string;
  repositoryCount?: number;
  checkedAt?: Date;
};

export function IssueDestinationSetup({ projects, integrations, section }: Props) {
  const { t } = useLanguage();
  const [projectViews, setProjectViews] = useState<ProjectView[]>(projects);
  const firstConnectedProvider = integrations.find((integration) => integration.status === "connected")?.provider ?? "github";
  const [selectedProvider, setSelectedProvider] = useState<IssueProvider>(firstConnectedProvider);
  const [message, setMessage] = useState(t("destinations.message.initial"));
  const [isPending, startTransition] = useTransition();
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [repositoryOptions, setRepositoryOptions] = useState<RepositoryOption[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteOrigin, setSiteOrigin] = useState("");
  const [repositoryLoadState, setRepositoryLoadState] = useState<RepositoryLoadState>("idle");
  const [repositoryLoadMessage, setRepositoryLoadMessage] = useState("");
  const [installChecks, setInstallChecks] = useState<Record<string, string>>({});

  const connectedProviders = useMemo(
    () => new Set(integrations.filter((integration) => integration.status === "connected").map((integration) => integration.provider)),
    [integrations]
  );

  const selectedIntegration = integrations.find((integration) => integration.provider === selectedProvider);
  const selectedRepository = repositoryOptions.find((repository) => repository.id === selectedRepositoryId);

  useEffect(() => {
    if (!isSiteModalOpen || !connectedProviders.has(selectedProvider)) {
      return;
    }

    const abortController = new AbortController();

    async function loadRepositories() {
      setRepositoryLoadState("loading");
      setRepositoryLoadMessage("");

      try {
        const integrationId = selectedIntegration?.id;
        const response = await fetch(`/api/integrations/${selectedProvider}/repositories${integrationId ? `?integrationId=${encodeURIComponent(integrationId)}` : ""}`, {
          headers: {
            Accept: "application/json"
          },
          signal: abortController.signal
        });

        if (response.status === 404) {
          setRepositoryOptions([]);
          setRepositoryLoadState("unavailable");
          setRepositoryLoadMessage("Liste des dépôts indisponible. Vous pouvez renseigner l'URL du dépôt cible.");
          return;
        }

        const body = await response.json() as unknown;

        if (!response.ok) {
          setRepositoryOptions([]);
          setRepositoryLoadState("error");
          setRepositoryLoadMessage(repositoryErrorMessage(body) ?? "Impossible de charger les dépôts. La saisie par URL reste disponible.");
          return;
        }

        const repositories = parseRepositoryOptions(body, selectedProvider);

        setRepositoryOptions(repositories);
        setRepositoryLoadState(repositories.length > 0 ? "ready" : "empty");
        setRepositoryLoadMessage(repositories.length > 0 ? "" : "Aucun dépôt accessible pour cette connexion. Utilisez l'URL du dépôt cible.");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setRepositoryOptions([]);
        setRepositoryLoadState("error");
        setRepositoryLoadMessage(error instanceof Error ? error.message : "Impossible de charger les dépôts. La saisie par URL reste disponible.");
      }
    }

    void loadRepositories();

    return () => abortController.abort();
  }, [connectedProviders, isSiteModalOpen, selectedIntegration?.id, selectedProvider]);

  function selectProvider(provider: IssueProvider) {
    setSelectedProvider(provider);
    setSelectedRepositoryId("");
    setRepositoryOptions([]);
    setRepositoryLoadState("idle");
    setRepositoryLoadMessage("");
  }

  function openSiteModal() {
    setIsSiteModalOpen(true);
  }

  function copyInstallSnippet(project: ProjectView) {
    void navigator.clipboard?.writeText(installSnippet(project.publicKey));
  }

  function createSite() {
    startTransition(async () => {
      if (!selectedIntegration?.credentialConfigured || !selectedRepository) {
        setMessage("Choisissez une connexion Git active et un dépôt accessible.");
        return;
      }

      const response = await fetch("/api/projects/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: siteName,
          allowedOrigin: siteOrigin,
          provider: selectedProvider,
          integrationId: selectedIntegration.id,
          repositoryId: selectedRepository.id
        })
      });

      const body = (await response.json()) as { site?: ProjectView; installSnippet?: string; metrics?: ProjectView["metrics"]; error?: string };

      if (!response.ok || !body.site) {
        setMessage(body.error ?? t("destinations.message.error"));
        return;
      }

      const nextSite = {
        ...body.site,
        installSnippet: body.installSnippet,
        metrics: body.metrics
      };

      setProjectViews((current) => [nextSite, ...current]);
      setMessage(`${body.site.name} est prêt. Placez le script sur ${body.site.allowedOrigins[0]}.`);
      setSelectedRepositoryId("");
      setSiteName("");
      setSiteOrigin("");
      setIsSiteModalOpen(false);
    });
  }

  function deleteSite(projectKey: string) {
    startTransition(async () => {
      const response = await fetch(`/api/projects/sites/${encodeURIComponent(projectKey)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        setMessage("Impossible de supprimer ce site.");
        return;
      }

      setProjectViews((current) => current.filter((project) => project.publicKey !== projectKey));
      setMessage("Site supprimé. Les issues déjà créées dans GitHub ou GitLab ne sont pas modifiées.");
    });
  }

  function testScript(projectKey: string) {
    startTransition(async () => {
      const response = await fetch(`/api/projects/sites/${encodeURIComponent(projectKey)}/script-test`, {
        method: "POST"
      });
      const body = (await response.json()) as { message?: string; error?: string };
      setInstallChecks((current) => ({
        ...current,
        [projectKey]: body.message ?? body.error ?? "Test terminé."
      }));
    });
  }

  return (
    <section className="setup-panel" id="settings" aria-labelledby="destinations-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow"><T k="settings.eyebrow" /></p>
          <h2 id="destinations-title"><T k="settings.title" /></h2>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar" aria-label={t("settings.sidebar.label")}>
          <a className={section === "git-connections" ? "is-active" : ""} href="/settings/git-connections">
            <GitBranch aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            <T k="settings.sidebar.gitConnections" />
          </a>
          <a className={section === "connected-sites" ? "is-active" : ""} href="/settings/connected-sites">
            <Globe2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            <T k="settings.sidebar.connectedSites" />
          </a>
        </aside>

        <div className="settings-content">
          {section === "git-connections" ? (
            <GitConnectionsSection integrations={integrations} />
          ) : null}

          {section === "connected-sites" ? (
            <ConnectedSitesSection
              connectedProviders={connectedProviders}
              isPending={isPending}
              isSiteModalOpen={isSiteModalOpen}
              installChecks={installChecks}
              message={message}
              onCloseModal={() => setIsSiteModalOpen(false)}
              onCreateSite={createSite}
              onDeleteSite={deleteSite}
              onTestScript={testScript}
              onCopyInstallSnippet={copyInstallSnippet}
              onOpenSiteModal={openSiteModal}
              onSelectProvider={selectProvider}
              projects={projectViews}
              repositoryLoadMessage={repositoryLoadMessage}
              repositoryLoadState={repositoryLoadState}
              repositoryOptions={repositoryOptions}
              selectedProvider={selectedProvider}
              selectedRepositoryId={selectedRepositoryId}
              setSelectedRepositoryId={setSelectedRepositoryId}
              setSiteName={setSiteName}
              setSiteOrigin={setSiteOrigin}
              siteName={siteName}
              siteOrigin={siteOrigin}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GitConnectionsSection({ integrations }: { integrations: ProviderIntegrationSummary[] }) {
  const [connectionStates, setConnectionStates] = useState<Partial<Record<IssueProvider, ConnectionTestResult>>>(() => (
    Object.fromEntries(integrations.map((integration) => [
      integration.provider,
      integration.credentialConfigured
        ? {
            state: "checking",
            message: "Vérification de la connexion active..."
          }
        : {
            state: "inactive",
            message: "Ajoutez un token serveur pour activer cette connexion."
          }
    ])) as Partial<Record<IssueProvider, ConnectionTestResult>>
  ));

  const refreshConnection = useCallback(async (integration: ProviderIntegrationSummary, signal?: AbortSignal) => {
    if (!integration.credentialConfigured) {
      setConnectionStates((current) => ({
        ...current,
        [integration.provider]: {
          state: "inactive",
          message: "Ajoutez un token serveur pour activer cette connexion."
        }
      }));
      return;
    }

    setConnectionStates((current) => ({
      ...current,
      [integration.provider]: {
        ...current[integration.provider],
        state: "checking",
        message: "Vérification de la connexion active..."
      }
    }));

    try {
      const response = await fetch(`/api/integrations/${integration.provider}/repositories?integrationId=${encodeURIComponent(integration.id)}`, {
        headers: {
          Accept: "application/json"
        },
        signal
      });
      const body = await response.json() as unknown;

      if (!response.ok) {
        setConnectionStates((current) => ({
          ...current,
          [integration.provider]: {
            state: "error",
            message: repositoryErrorMessage(body) ?? "Connexion impossible. Vérifiez le token ou les permissions.",
            checkedAt: new Date()
          }
        }));
        return;
      }

      const repositories = parseRepositoryOptions(body, integration.provider);
      setConnectionStates((current) => ({
        ...current,
        [integration.provider]: {
          state: "active",
          repositoryCount: repositories.length,
          checkedAt: new Date(),
          message: repositories.length > 0
            ? `${repositories.length} dépôt(s) accessible(s).`
            : "Connexion active, mais aucun dépôt accessible avec ce token."
        }
      }));
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setConnectionStates((current) => ({
        ...current,
        [integration.provider]: {
          state: "error",
          message: error instanceof Error ? error.message : "Connexion impossible.",
          checkedAt: new Date()
        }
      }));
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    integrations.forEach((integration) => {
      if (integration.credentialConfigured) {
        void refreshConnection(integration, abortController.signal);
      }
    });

    return () => abortController.abort();
  }, [integrations, refreshConnection]);

  return (
    <section className="settings-section" aria-labelledby="git-connections-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Connexions</p>
          <h3 id="git-connections-title"><T k="settings.gitConnections.title" /></h3>
        </div>
      </div>

      <div className="integration-grid">
        {integrations.map((integration) => {
          const connectionState = connectionStates[integration.provider] ?? {
            state: integration.credentialConfigured ? "checking" : "inactive",
            message: integration.credentialConfigured ? "Vérification de la connexion active..." : "Ajoutez un token serveur pour activer cette connexion."
          };
          const isConnectionActive = connectionState.state === "active" || connectionState.state === "checking";

          return (
            <article className={`integration-card ${isConnectionActive ? "is-active" : ""}`} key={integration.provider}>
              <div className="integration-topline">
                <ProviderBadge provider={integration.provider} />
                <span className={`status-badge ${connectionState.state}`}>
                  {connectionBadgeLabel(connectionState.state)}
                </span>
              </div>
              <h3>{integration.name}</h3>
              <p>{connectionAccountLabel(integration)}</p>
              <div className={`connection-health ${connectionState.state}`} role="status">
                <div>
                  <strong>{connectionHealthTitle(connectionState.state)}</strong>
                  <span>{connectionState.message}</span>
                </div>
                {typeof connectionState.repositoryCount === "number" ? (
                  <span className="connection-metric">
                    {connectionState.repositoryCount}
                    <small>dépôts</small>
                  </span>
                ) : null}
              </div>
              {connectionState.checkedAt ? (
                <p className="connection-last-check">Dernier contrôle: {formatConnectionCheckDate(connectionState.checkedAt)}</p>
              ) : null}
              <div className="integration-checklist" aria-label={`${integration.name} setup`}>
                {!integration.credentialConfigured ? (
                  <IntegrationCheck
                    isReady={integration.connectConfigured}
                    labelKey="destinations.integration.connectFlow"
                    value={integration.connectConfigured ? "destinations.integration.ready" : providerConnectionHelpKey(integration.provider)}
                  />
                ) : null}
                <IntegrationCheck
                  isReady={integration.credentialConfigured}
                  labelKey="destinations.integration.credentials"
                  value={integration.credentialConfigured ? "destinations.integration.ready" : providerCredentialHelpKey(integration.provider)}
                />
              </div>
              <div className="integration-config">
                <strong><T k="destinations.integration.localTest" /></strong>
                <code>{integration.credentialConfigKeys.join(" / ")}</code>
                <span><T k={providerLocalHelpKey(integration.provider)} /></span>
              </div>
              <div className="integration-actions">
                {integration.credentialConfigured ? (
                  <button className="button" disabled={connectionState.state === "checking"} onClick={() => void refreshConnection(integration)} type="button">
                    <RefreshCw aria-hidden="true" className={`ui-icon ${connectionState.state === "checking" ? "spin-icon" : ""}`} size={16} strokeWidth={2.2} />
                    {connectionState.state === "checking" ? "Vérification..." : "Actualiser"}
                  </button>
                ) : null}
                {integration.connectConfigured ? (
                  <a className="button" href={`${integration.connectPath}?returnTo=/settings/git-connections`}>
                    <Link2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    {integration.status === "connected" ? <T k="destinations.verify" /> : <><T k="destinations.connect" /> {integration.name}</>}
                  </a>
                ) : !integration.credentialConfigured ? (
                  <span className="button disabled-button" aria-disabled="true">
                    <T k="destinations.integration.connectUnavailable" />
                  </span>
                ) : null}
                {integration.managePath ? (
                  <a className="button secondary-button" href={integration.managePath}>
                    <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    <T k="destinations.manage" />
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function connectionBadgeLabel(state: ConnectionHealthState): string {
  if (state === "active") {
    return "Actif";
  }

  if (state === "checking") {
    return "Vérification";
  }

  if (state === "error") {
    return "À vérifier";
  }

  return "À connecter";
}

function connectionHealthTitle(state: ConnectionHealthState): string {
  if (state === "active") {
    return "Connexion active";
  }

  if (state === "checking") {
    return "Connexion active";
  }

  if (state === "error") {
    return "Connexion non validée";
  }

  return "Connexion inactive";
}

function connectionAccountLabel(integration: ProviderIntegrationSummary): string {
  if (integration.credentialConfigured) {
    return `${integration.name} est prêt à l'emploi pour lister les dépôts et créer des issues.`;
  }

  return integration.accountLabel;
}

function formatConnectionCheckDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-BE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function ConnectedSitesSection({
  connectedProviders,
  isPending,
  isSiteModalOpen,
  installChecks,
  message,
  onCloseModal,
  onCreateSite,
  onDeleteSite,
  onTestScript,
  onCopyInstallSnippet,
  onOpenSiteModal,
  onSelectProvider,
  projects,
  repositoryLoadMessage,
  repositoryLoadState,
  repositoryOptions,
  selectedProvider,
  selectedRepositoryId,
  setSelectedRepositoryId,
  setSiteName,
  setSiteOrigin,
  siteName,
  siteOrigin
}: {
  connectedProviders: Set<IssueProvider>;
  isPending: boolean;
  isSiteModalOpen: boolean;
  installChecks: Record<string, string>;
  message: string;
  onCloseModal: () => void;
  onCreateSite: () => void;
  onDeleteSite: (projectKey: string) => void;
  onTestScript: (projectKey: string) => void;
  onCopyInstallSnippet: (project: ProjectView) => void;
  onOpenSiteModal: () => void;
  onSelectProvider: (provider: IssueProvider) => void;
  projects: ProjectView[];
  repositoryLoadMessage: string;
  repositoryLoadState: RepositoryLoadState;
  repositoryOptions: RepositoryOption[];
  selectedProvider: IssueProvider;
  selectedRepositoryId: string;
  setSelectedRepositoryId: (repositoryId: string) => void;
  setSiteName: (name: string) => void;
  setSiteOrigin: (origin: string) => void;
  siteName: string;
  siteOrigin: string;
}) {
  const isSelectedProviderConnected = connectedProviders.has(selectedProvider);
  const shouldShowRepositorySelect = isSelectedProviderConnected && repositoryLoadState === "ready" && repositoryOptions.length > 0;
  const shouldShowRepositoryStatus = isSelectedProviderConnected && repositoryLoadState !== "idle";
  const connectedIntegrations = Array.from(connectedProviders);

  return (
    <section className="settings-section linked-sites" aria-labelledby="linked-sites-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Pages connectées</p>
          <h2 id="linked-sites-title">Sites connectés</h2>
        </div>
        <button className="button" onClick={() => onOpenSiteModal()} type="button">
          <Plus aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          Ajouter un nouveau site
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state connected-sites-empty">
          <h2>Aucun site connecté</h2>
          <p>Ajoutez un site pour générer sa clé publique, installer le widget et router les retours vers un dépôt Git réel.</p>
          <button className="button" onClick={() => onOpenSiteModal()} type="button">
            <Plus aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            Ajouter un nouveau site
          </button>
        </div>
      ) : (
        <div className="site-repo-list">
          {projects.map((project) => {
            const issueTarget = project.issueTarget;
            const providerConnected = connectedProviders.has(issueTarget.provider);
            const isReady = providerConnected && issueTarget.namespace && issueTarget.project;

            return (
              <article className="site-repo-row connected-site-row" key={project.publicKey}>
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.allowedOrigins.join(", ")}</p>
                  <span className={`status-badge ${isReady ? "connected" : "failed"}`}>
                    {isReady ? "Actif" : "Git déconnecté"}
                  </span>
                </div>
                <div className="repo-destination">
                  <ProviderBadge provider={issueTarget.provider} />
                  <div>
                    <strong>{issueTarget.namespace}/{issueTarget.project}</strong>
                    <span>{issueTarget.webUrl}</span>
                  </div>
                </div>
                <div className="site-metrics">
                  <span><strong>{project.metrics?.feedbacksReceived ?? 0}</strong> retours</span>
                  <span><strong>{project.metrics?.issuesCreated ?? 0}</strong> issues créées</span>
                  <span><strong>{project.metrics?.failedIssues ?? 0}</strong> échecs</span>
                </div>
                <div className="site-script">
                  <strong>Script</strong>
                  <code>{project.installSnippet ?? installSnippet(project.publicKey)}</code>
                  <button className="inline-action" onClick={() => onCopyInstallSnippet(project)} type="button">
                    <Copy aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
                    Copier
                  </button>
                  {installChecks[project.publicKey] ? <span className="script-check-result">{installChecks[project.publicKey]}</span> : null}
                </div>
                <div className="site-row-actions">
                  {issueTarget.webUrl ? (
                    <a className="button secondary-button" href={issueTarget.webUrl}>
                      <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                      <T k="destinations.open" />
                    </a>
                  ) : null}
                  <button className="button secondary-button" onClick={() => onTestScript(project.publicKey)} type="button">
                    <RefreshCw aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    Tester le script
                  </button>
                  <button className="button danger-button" disabled={isPending} onClick={() => onDeleteSite(project.publicKey)} type="button">
                    <Trash2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isSiteModalOpen ? (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="site-modal-title">
          <button className="settings-modal-backdrop" aria-label="Fermer" onClick={onCloseModal} type="button" />
          <div className="settings-modal-panel">
            <div className="settings-modal-header">
              <div>
                <p className="eyebrow">Pages connectées</p>
                <h2 id="site-modal-title">Ajouter un nouveau site</h2>
              </div>
              <button className="icon-button" aria-label="Fermer" onClick={onCloseModal} type="button">
                <X aria-hidden="true" className="ui-icon" size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className="modal-copy">
              <strong>Un site, une clé publique, un dépôt Git.</strong>
              <span>Choisissez un provider actif, sélectionnez un dépôt accessible, puis placez le script généré sur le domaine autorisé.</span>
            </div>

            <div className="repo-linker in-modal" id="site-repos">
              <div>
                <h3>Choisir la destination des issues</h3>
                <p>Seuls les providers connectés et les dépôts accessibles par le token sont proposés.</p>
              </div>
              {connectedIntegrations.length === 0 ? (
                <div className="repository-loader unavailable" role="status">
                  <strong>Aucune connexion Git active</strong>
                  <span>Connectez GitHub ou GitLab avant d&apos;ajouter un site.</span>
                </div>
              ) : null}
              {shouldShowRepositoryStatus ? (
                <div className={`repository-loader ${repositoryLoadState}`} role="status">
                  <strong>{repositoryStatusTitle(repositoryLoadState)}</strong>
                  <span>{repositoryStatusText(repositoryLoadState, repositoryLoadMessage)}</span>
                </div>
              ) : null}
              <form className="repo-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Nom du site
                  <input name="siteName" onChange={(event) => setSiteName(event.target.value)} placeholder="Site vitrine" value={siteName} />
                </label>
                <label>
                  Domaine autorisé
                  <input name="siteOrigin" onChange={(event) => setSiteOrigin(event.target.value)} placeholder="https://www.exemple.be" value={siteOrigin} />
                </label>
                <label>
                  Service Git
                  <select name="provider" value={selectedProvider} onChange={(event) => onSelectProvider(event.target.value as IssueProvider)}>
                    <option disabled={!connectedProviders.has("github")} value="github">GitHub</option>
                    <option disabled={!connectedProviders.has("gitlab")} value="gitlab">GitLab</option>
                  </select>
                </label>
                {shouldShowRepositorySelect ? (
                  <label className="repo-select-field">
                    Repository connecté
                    <select name="repositorySelect" value={selectedRepositoryId} onChange={(event) => setSelectedRepositoryId(event.target.value)}>
                      <option value="">Choisir un dépôt</option>
                      {repositoryOptions.map((repository) => (
                        <option key={repository.id} value={repository.id}>
                          {repository.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button className="button" disabled={isPending || !siteOrigin || !selectedRepositoryId || !isSelectedProviderConnected} onClick={onCreateSite} type="button">
                  <Plus aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                  {isPending ? "Création..." : "Créer le site"}
                </button>
              </form>
              <p className="form-status" role="status">
                {message}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function IntegrationCheck({ isReady, labelKey, value }: { isReady: boolean; labelKey: string; value: string }) {
  const Icon: LucideIcon = isReady ? CheckCircle2 : TriangleAlert;

  return (
    <div className="integration-check">
      <Icon aria-hidden="true" className={`ui-icon status-icon ${isReady ? "connected" : "needs_setup"}`} size={16} strokeWidth={2.4} />
      <div>
        <strong><T k={labelKey} /></strong>
        <span><T k={value} /></span>
      </div>
    </div>
  );
}

function providerConnectionHelpKey(provider: IssueProvider): string {
  return provider === "github" ? "destinations.integration.githubConnectionHelp" : "destinations.integration.gitlabConnectionHelp";
}

function providerCredentialHelpKey(provider: IssueProvider): string {
  return provider === "github" ? "destinations.integration.githubCredentialHelp" : "destinations.integration.gitlabCredentialHelp";
}

function providerLocalHelpKey(provider: IssueProvider): string {
  return provider === "github" ? "destinations.integration.githubLocalHelp" : "destinations.integration.gitlabLocalHelp";
}

function repositoryStatusTitle(state: RepositoryLoadState): string {
  if (state === "loading") {
    return "Chargement des dépôts";
  }

  if (state === "ready") {
    return "Dépôts disponibles";
  }

  if (state === "empty") {
    return "Aucun dépôt trouvé";
  }

  if (state === "unavailable") {
    return "Liste indisponible";
  }

  if (state === "error") {
    return "Chargement impossible";
  }

    return "Dépôts";
}

function repositoryStatusText(state: RepositoryLoadState, message: string): string {
  if (message) {
    return message;
  }

  if (state === "loading") {
    return "Recherche des dépôts accessibles pour cette connexion Git.";
  }

  if (state === "ready") {
    return "Choisissez un dépôt dans la liste ou ajustez l'URL manuellement.";
  }

  return "Le champ URL reste disponible.";
}

function parseRepositoryOptions(value: unknown, provider: IssueProvider): RepositoryOption[] {
  const repositories = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.repositories)
      ? value.repositories
      : isRecord(value) && Array.isArray(value.repos)
        ? value.repos
        : [];

  return repositories.flatMap((repository) => parseRepositoryOption(repository, provider));
}

function parseRepositoryOption(value: unknown, provider: IssueProvider): RepositoryOption[] {
  if (!isRecord(value)) {
    return [];
  }

  const webUrl = stringValue(value.webUrl) ?? stringValue(value.url) ?? stringValue(value.html_url) ?? stringValue(value.web_url);
  const fullName = stringValue(value.fullName) ?? stringValue(value.full_name) ?? stringValue(value.path_with_namespace);
  const namespace = stringValue(value.namespace) ?? namespacePath(value.namespace) ?? ownerLogin(value.owner) ?? splitFullName(fullName)?.namespace;
  const project = stringValue(value.project) ?? stringValue(value.name) ?? splitFullName(fullName)?.project;

  if (!webUrl || !namespace || !project) {
    return [];
  }

  return [{
    id: stringValue(value.id) ?? `${provider}:${namespace}/${project}`,
    label: fullName ?? `${namespace}/${project}`,
    namespace,
    project,
    webUrl,
    externalProjectId: stringValue(value.externalProjectId) ?? stringValue(value.external_project_id)
  }];
}

function repositoryErrorMessage(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.error === "string") {
    return value.error;
  }

  return undefined;
}

function splitFullName(value?: string): { namespace: string; project: string } | undefined {
  const parts = value?.split("/").filter(Boolean);

  if (!parts || parts.length < 2) {
    return undefined;
  }

  return {
    namespace: parts.slice(0, -1).join("/"),
    project: parts.at(-1) ?? ""
  };
}

function ownerLogin(value: unknown): string | undefined {
  return isRecord(value) ? stringValue(value.login) ?? stringValue(value.name) : undefined;
}

function namespacePath(value: unknown): string | undefined {
  return isRecord(value) ? stringValue(value.full_path) ?? stringValue(value.path) ?? stringValue(value.name) : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function installSnippet(projectKey: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `<script src="${origin}/widget.js" data-project="${projectKey}"></script>`;
}
