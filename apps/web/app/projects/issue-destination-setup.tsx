"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  GitBranch,
  Globe2,
  Link2,
  Plus,
  Save,
  Settings2,
  TriangleAlert,
  X,
  type LucideIcon
} from "lucide-react";
import type { IssueProvider, IssueTarget } from "@changethis/shared";
import type { ChangeThisProject } from "../../lib/demo-project";
import type { ProviderIntegrationSummary } from "../../lib/provider-integrations";
import { T, useLanguage } from "../i18n";

type Props = {
  projects: ChangeThisProject[];
  integrations: ProviderIntegrationSummary[];
  section: SettingsSection;
};

type ProjectView = ChangeThisProject;
export type SettingsSection = "git-connections" | "connected-sites";

const emptyRepository = "";

type RepositoryOption = {
  id: string;
  label: string;
  namespace: string;
  project: string;
  webUrl: string;
};

type RepositoryLoadState = "idle" | "loading" | "ready" | "empty" | "unavailable" | "error";

export function IssueDestinationSetup({ projects, integrations, section }: Props) {
  const { t } = useLanguage();
  const [projectViews, setProjectViews] = useState<ProjectView[]>(projects);
  const [selectedProjectKey, setSelectedProjectKey] = useState(projects[0]?.publicKey ?? "");
  const [selectedProvider, setSelectedProvider] = useState<IssueProvider>(projects[0]?.issueTarget.provider ?? "github");
  const [repoUrl, setRepoUrl] = useState(repositoryUrl(projects[0]?.issueTarget));
  const [message, setMessage] = useState(t("destinations.message.initial"));
  const [isPending, startTransition] = useTransition();
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [repositoryOptions, setRepositoryOptions] = useState<RepositoryOption[]>([]);
  const [repositoryLoadState, setRepositoryLoadState] = useState<RepositoryLoadState>("idle");
  const [repositoryLoadMessage, setRepositoryLoadMessage] = useState("");

  const connectedProviders = useMemo(
    () => new Set(integrations.filter((integration) => integration.status === "connected").map((integration) => integration.provider)),
    [integrations]
  );

  const selectedProject = projectViews.find((project) => project.publicKey === selectedProjectKey);
  const missingDestinations = projectViews.filter((project) => !project.issueTarget.namespace || !project.issueTarget.project);

  useEffect(() => {
    if (!isSiteModalOpen || !connectedProviders.has(selectedProvider)) {
      return;
    }

    const abortController = new AbortController();

    async function loadRepositories() {
      setRepositoryLoadState("loading");
      setRepositoryLoadMessage("");

      try {
        const response = await fetch(`/api/integrations/${selectedProvider}/repositories`, {
          headers: {
            Accept: "application/json"
          },
          signal: abortController.signal
        });

        if (response.status === 404) {
          setRepositoryOptions([]);
          setRepositoryLoadState("unavailable");
          setRepositoryLoadMessage("Liste des repositories indisponible. Vous pouvez renseigner l'URL du repo cible.");
          return;
        }

        const body = await response.json() as unknown;

        if (!response.ok) {
          setRepositoryOptions([]);
          setRepositoryLoadState("error");
          setRepositoryLoadMessage(repositoryErrorMessage(body) ?? "Impossible de charger les repositories. La saisie par URL reste disponible.");
          return;
        }

        const repositories = parseRepositoryOptions(body, selectedProvider);

        setRepositoryOptions(repositories);
        setRepositoryLoadState(repositories.length > 0 ? "ready" : "empty");
        setRepositoryLoadMessage(repositories.length > 0 ? "" : "Aucun repository accessible pour cette connexion. Utilisez l'URL du repo cible.");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setRepositoryOptions([]);
        setRepositoryLoadState("error");
        setRepositoryLoadMessage(error instanceof Error ? error.message : "Impossible de charger les repositories. La saisie par URL reste disponible.");
      }
    }

    void loadRepositories();

    return () => abortController.abort();
  }, [connectedProviders, isSiteModalOpen, selectedProvider]);

  function selectProject(projectKey: string) {
    const project = projectViews.find((item) => item.publicKey === projectKey);
    setSelectedProjectKey(projectKey);
    setSelectedProvider(project?.issueTarget.provider ?? "github");
    setRepoUrl(repositoryUrl(project?.issueTarget));
    setRepositoryOptions([]);
    setRepositoryLoadState("idle");
    setRepositoryLoadMessage("");
  }

  function selectProvider(provider: IssueProvider) {
    setSelectedProvider(provider);
    setRepoUrl(emptyRepository);
    setRepositoryOptions([]);
    setRepositoryLoadState("idle");
    setRepositoryLoadMessage("");
  }

  function openSiteModal(projectKey?: string) {
    if (projectKey) {
      selectProject(projectKey);
    }

    setIsSiteModalOpen(true);
  }

  function copyInstallSnippet(project: ProjectView) {
    void navigator.clipboard?.writeText(installSnippet(project.publicKey));
  }

  function linkRepo() {
    startTransition(async () => {
      const response = await fetch("/api/projects/issue-targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectKey: selectedProjectKey,
          provider: selectedProvider,
          repositoryUrl: repoUrl
        })
      });

      const body = (await response.json()) as { project?: ChangeThisProject; error?: string };

      if (!response.ok || !body.project) {
        setMessage(body.error ?? t("destinations.message.error"));
        return;
      }

      setProjectViews((current) => current.map((project) => project.publicKey === body.project?.publicKey ? body.project : project));
      setMessage(`${body.project.name} enverra ses issues vers ${body.project.issueTarget.provider.toUpperCase()} ${body.project.issueTarget.namespace}/${body.project.issueTarget.project}.`);
      setIsSiteModalOpen(false);
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
              message={message}
              missingDestinations={missingDestinations}
              onCloseModal={() => setIsSiteModalOpen(false)}
              onCopyInstallSnippet={copyInstallSnippet}
              onLinkRepo={linkRepo}
              onOpenSiteModal={openSiteModal}
              onSelectProject={selectProject}
              onSelectProvider={selectProvider}
              projects={projectViews}
              repoUrl={repoUrl}
              repositoryLoadMessage={repositoryLoadMessage}
              repositoryLoadState={repositoryLoadState}
              repositoryOptions={repositoryOptions}
              selectedProject={selectedProject}
              selectedProjectKey={selectedProjectKey}
              selectedProvider={selectedProvider}
              setRepoUrl={setRepoUrl}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GitConnectionsSection({ integrations }: { integrations: ProviderIntegrationSummary[] }) {
  return (
    <section className="settings-section" aria-labelledby="git-connections-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Connexions</p>
          <h3 id="git-connections-title"><T k="settings.gitConnections.title" /></h3>
        </div>
      </div>

      <div className="integration-grid">
        {integrations.map((integration) => (
          <article className="integration-card" key={integration.provider}>
            <div className="integration-topline">
              <span className={`provider-badge ${integration.provider}`}>
                {integration.provider === "github" ? "GH" : "GL"}
              </span>
              <span className={`status-badge ${integration.status}`}>
                <T k={integration.status === "connected" ? "destinations.connected" : "destinations.toConnect"} />
              </span>
            </div>
            <h3>{integration.name}</h3>
            <p>{integration.accountLabel}</p>
            <div className="integration-checklist" aria-label={`${integration.name} setup`}>
              <IntegrationCheck
                isReady={integration.connectConfigured}
                labelKey="destinations.integration.connectFlow"
                value={integration.connectConfigured ? "destinations.integration.ready" : providerConnectionHelpKey(integration.provider)}
              />
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
              {integration.connectConfigured ? (
                <a className="button" href={`${integration.connectPath}?returnTo=/settings/git-connections`}>
                  <Link2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                  {integration.status === "connected" ? <T k="destinations.verify" /> : <><T k="destinations.connect" /> {integration.name}</>}
                </a>
              ) : (
                <span className="button disabled-button" aria-disabled="true">
                  <T k="destinations.integration.connectUnavailable" />
                </span>
              )}
              {integration.managePath ? (
                <a className="button secondary-button" href={integration.managePath}>
                  <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                  <T k="destinations.manage" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConnectedSitesSection({
  connectedProviders,
  isPending,
  isSiteModalOpen,
  message,
  missingDestinations,
  onCloseModal,
  onCopyInstallSnippet,
  onLinkRepo,
  onOpenSiteModal,
  onSelectProject,
  onSelectProvider,
  projects,
  repoUrl,
  repositoryLoadMessage,
  repositoryLoadState,
  repositoryOptions,
  selectedProject,
  selectedProjectKey,
  selectedProvider,
  setRepoUrl
}: {
  connectedProviders: Set<IssueProvider>;
  isPending: boolean;
  isSiteModalOpen: boolean;
  message: string;
  missingDestinations: ProjectView[];
  onCloseModal: () => void;
  onCopyInstallSnippet: (project: ProjectView) => void;
  onLinkRepo: () => void;
  onOpenSiteModal: (projectKey?: string) => void;
  onSelectProject: (projectKey: string) => void;
  onSelectProvider: (provider: IssueProvider) => void;
  projects: ProjectView[];
  repoUrl: string;
  repositoryLoadMessage: string;
  repositoryLoadState: RepositoryLoadState;
  repositoryOptions: RepositoryOption[];
  selectedProject?: ProjectView;
  selectedProjectKey: string;
  selectedProvider: IssueProvider;
  setRepoUrl: (repoUrl: string) => void;
}) {
  const { t } = useLanguage();
  const isSelectedProviderConnected = connectedProviders.has(selectedProvider);
  const shouldShowRepositorySelect = isSelectedProviderConnected && repositoryLoadState === "ready" && repositoryOptions.length > 0;
  const shouldShowRepositoryStatus = isSelectedProviderConnected && repositoryLoadState !== "idle";

  return (
    <section className="settings-section linked-sites" aria-labelledby="linked-sites-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Pages connectees</p>
          <h2 id="linked-sites-title">Sites connectes</h2>
        </div>
        <button className="button" onClick={() => onOpenSiteModal()} type="button">
          <Plus aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          Ajouter un nouveau site
        </button>
      </div>

      <div className="site-repo-list">
        {projects.map((project) => {
          const issueTarget = project.issueTarget;
          const providerConnected = connectedProviders.has(issueTarget.provider);
          const isReady = providerConnected && issueTarget.namespace && issueTarget.project;

          return (
            <article className="site-repo-row" key={project.publicKey}>
              <div>
                <h3>{project.name}</h3>
                <p>{publicOrigins(project).join(", ") || "Origines locales uniquement"}</p>
              </div>
              <div className="site-script">
                <strong>Script d&apos;installation</strong>
                <code>{installSnippet(project.publicKey)}</code>
                <button className="inline-action" onClick={() => onCopyInstallSnippet(project)} type="button">
                  <Copy aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
                  Copier
                </button>
              </div>
              <div className="repo-destination">
                <span className={`provider-badge ${issueTarget.provider}`}>
                  {issueTarget.provider === "github" ? "GH" : "GL"}
                </span>
                <div>
                  <strong>{issueTarget.namespace}/{issueTarget.project}</strong>
                  <span><T k={isReady ? "destinations.ready" : "destinations.required"} /></span>
                </div>
              </div>
              <div className="site-row-actions">
                {issueTarget.webUrl ? (
                  <a className="button secondary-button" href={issueTarget.webUrl}>
                    <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    <T k="destinations.open" />
                  </a>
                ) : null}
                <button className="button secondary-button" onClick={() => onOpenSiteModal(project.publicKey)} type="button">
                  <Settings2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                  Modifier
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {isSiteModalOpen ? (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="site-modal-title">
          <button className="settings-modal-backdrop" aria-label="Fermer" onClick={onCloseModal} type="button" />
          <div className="settings-modal-panel">
            <div className="settings-modal-header">
              <div>
                <p className="eyebrow">Pages connectees</p>
                <h2 id="site-modal-title">Ajouter un nouveau site</h2>
              </div>
              <button className="icon-button" aria-label="Fermer" onClick={onCloseModal} type="button">
                <X aria-hidden="true" className="ui-icon" size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className="modal-copy">
              <strong>Script unique, cle par site.</strong>
              <span>Le bundle reste commun. La clé publique permet à ChangeThis d&apos;identifier le site et sa destination d&apos;issues.</span>
            </div>

            <div className="repo-linker in-modal" id="site-repos">
              <div>
                <h3>Choisir la destination des issues</h3>
                <p>Sélectionnez un repository connecté quand la liste est disponible, ou renseignez directement l&apos;URL du repo cible.</p>
              </div>
              {shouldShowRepositoryStatus ? (
                <div className={`repository-loader ${repositoryLoadState}`} role="status">
                  <strong>{repositoryStatusTitle(repositoryLoadState)}</strong>
                  <span>{repositoryStatusText(repositoryLoadState, repositoryLoadMessage)}</span>
                </div>
              ) : null}
              <form className="repo-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Site
                  <select name="project" value={selectedProjectKey} onChange={(event) => onSelectProject(event.target.value)}>
                    {projects.map((project) => (
                      <option key={project.publicKey} value={project.publicKey}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Service Git
                  <select name="provider" value={selectedProvider} onChange={(event) => onSelectProvider(event.target.value as IssueProvider)}>
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                  </select>
                </label>
                {shouldShowRepositorySelect ? (
                  <label className="repo-select-field">
                    Repository connecté
                    <select name="repositorySelect" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)}>
                      <option value="">Choisir un repository</option>
                      {repositoryOptions.map((repository) => (
                        <option key={repository.id} value={repository.webUrl}>
                          {repository.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="repo-url-field">
                  {shouldShowRepositorySelect ? "URL du repo sélectionné" : "URL du repo d'issues"}
                  <input
                    name="repo"
                    onChange={(event) => setRepoUrl(event.target.value)}
                    placeholder={selectedProvider === "github" ? "https://github.com/org/repo" : "https://gitlab.com/group/project"}
                    value={repoUrl}
                  />
                </label>
                <button className="button" disabled={isPending || !selectedProject} onClick={onLinkRepo} type="button">
                  <Save aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                  {isPending ? <T k="destinations.linking" /> : <T k="destinations.save" />}
                </button>
              </form>
              <p className="form-status" role="status">
                {missingDestinations.length > 0 ? `${missingDestinations.length} ${t("destinations.message.missing")}` : message}
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
    return "Chargement des repositories";
  }

  if (state === "ready") {
    return "Repositories disponibles";
  }

  if (state === "empty") {
    return "Aucun repository trouve";
  }

  if (state === "unavailable") {
    return "Liste indisponible";
  }

  if (state === "error") {
    return "Chargement impossible";
  }

  return "Repositories";
}

function repositoryStatusText(state: RepositoryLoadState, message: string): string {
  if (message) {
    return message;
  }

  if (state === "loading") {
    return "Recherche des repositories accessibles pour cette connexion Git.";
  }

  if (state === "ready") {
    return "Choisissez un repo dans la liste ou ajustez l'URL manuellement.";
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
    webUrl
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

function publicOrigins(project: ProjectView): string[] {
  return project.allowedOrigins.filter((origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1"));
}

function installSnippet(projectKey: string): string {
  return `<script src="https://app.changethis.dev/widget.js" data-project="${projectKey}"></script>`;
}

function repositoryUrl(issueTarget?: IssueTarget): string {
  return issueTarget?.webUrl ?? emptyRepository;
}
