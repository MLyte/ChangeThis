"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  GitBranch,
  Globe2,
  Info,
  Link2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { IssueProvider, WidgetButtonPosition, WidgetButtonVariant, WidgetLocale } from "@changethis/shared";
import type { ChangeThisProject } from "../../lib/demo-project";
import type { ProviderIntegrationSummary } from "../../lib/provider-integrations";
import { T, useLanguage } from "../i18n";
import { ProviderBadge } from "../provider-badge";
import { DemoSeedButton } from "./demo-seed-button";

type Props = {
  projects: ChangeThisProject[];
  integrations: ProviderIntegrationSummary[];
  hasLiveDemo?: boolean;
  section: SettingsSection;
  users?: WorkspaceUserView[];
  workspaceName?: string;
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
export type SettingsSection = "git-connections" | "connected-sites" | "users";
export type WorkspaceUserView = {
  userId: string;
  email: string;
  role: "viewer" | "member" | "admin" | "owner" | string;
  status: string;
  joinedAt?: string;
};

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

const widgetLocaleOptions: Array<{ label: string; value: WidgetLocale }> = [
  { label: "Français", value: "fr" },
  { label: "English", value: "en" }
];

const widgetPositionOptions: Array<{ label: string; value: WidgetButtonPosition }> = [
  { label: "Bas droite", value: "bottom-right" },
  { label: "Bas gauche", value: "bottom-left" },
  { label: "Haut droite", value: "top-right" },
  { label: "Haut gauche", value: "top-left" }
];

const widgetVariantOptions: Array<{ label: string; value: WidgetButtonVariant }> = [
  { label: "Standard", value: "default" },
  { label: "Discret production", value: "subtle" }
];

type InstallCheckResult = {
  ok: boolean;
  message: string;
};

export function IssueDestinationSetup({ projects, integrations, hasLiveDemo = false, section, users = [], workspaceName }: Props) {
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
  const [installChecks, setInstallChecks] = useState<Record<string, InstallCheckResult>>({});

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
    void navigator.clipboard?.writeText(project.installSnippet ?? installSnippet(project))
      .then(() => {
        toast.success("Script copié", {
          description: `${project.name} est prêt à être installé.`
        });
      })
      .catch(() => {
        toast.error("Copie impossible", {
          description: "Sélectionnez le script manuellement."
        });
      });
  }

  function createSite() {
    startTransition(async () => {
      if (!selectedIntegration?.credentialConfigured || !selectedRepository) {
        const errorMessage = "Choisissez une connexion Git active et un dépôt accessible.";
        setMessage(errorMessage);
        toast.error("Site non créé", {
          description: errorMessage
        });
        return;
      }

      try {
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
          const errorMessage = body.error ?? t("destinations.message.error");
          setMessage(errorMessage);
          toast.error("Site non créé", {
            description: errorMessage
          });
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
        toast.success("Site connecté", {
          description: `${body.site.name} est prêt. Copiez le script depuis la liste des sites.`
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t("actions.error.connection");
        setMessage(errorMessage);
        toast.error("Site non créé", {
          description: errorMessage
        });
      }
    });
  }

  function updateWidgetSettings(projectKey: string, update: Partial<Pick<ProjectView, "widgetLocale" | "widgetButtonPosition" | "widgetButtonVariant">>) {
    const project = projectViews.find((item) => item.publicKey === projectKey);
    if (!project) {
      return;
    }

    const nextSettings = {
      widgetLocale: update.widgetLocale ?? project.widgetLocale,
      widgetButtonPosition: update.widgetButtonPosition ?? project.widgetButtonPosition,
      widgetButtonVariant: update.widgetButtonVariant ?? project.widgetButtonVariant
    };

    setProjectViews((current) => current.map((item) => item.publicKey === projectKey
      ? {
          ...item,
          ...nextSettings,
          installSnippet: installSnippet({ ...item, ...nextSettings })
        }
      : item));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/sites/${encodeURIComponent(projectKey)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(nextSettings)
        });
        const body = (await response.json()) as { site?: ProjectView; installSnippet?: string; error?: string };

        if (!response.ok || !body.site) {
          throw new Error(body.error ?? "Impossible d'enregistrer la configuration widget.");
        }

        setProjectViews((current) => current.map((item) => item.publicKey === projectKey
          ? {
              ...item,
              ...body.site,
              installSnippet: body.installSnippet,
              metrics: item.metrics
            }
          : item));
        toast.success("Configuration widget enregistrée", {
          description: "Le script affiché a été mis à jour pour ce site."
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t("actions.error.connection");
        setProjectViews((current) => current.map((item) => item.publicKey === projectKey ? project : item));
        toast.error("Configuration non enregistrée", {
          description: errorMessage
        });
      }
    });
  }

  function deleteSite(projectKey: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/sites/${encodeURIComponent(projectKey)}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const errorMessage = "Impossible de supprimer ce site.";
          setMessage(errorMessage);
          toast.error("Suppression impossible", {
            description: errorMessage
          });
          return;
        }

        setProjectViews((current) => current.filter((project) => project.publicKey !== projectKey));
        setMessage("Site supprimé. Les issues déjà créées dans GitHub ou GitLab ne sont pas modifiées.");
        toast.success("Site supprimé", {
          description: "Les issues déjà créées dans GitHub ou GitLab ne sont pas modifiées."
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t("actions.error.connection");
        setMessage(errorMessage);
        toast.error("Suppression impossible", {
          description: errorMessage
        });
      }
    });
  }

  function testScript(projectKey: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/sites/${encodeURIComponent(projectKey)}/script-test`, {
          method: "POST"
        });
        const body = (await response.json()) as { message?: string; error?: string };
        setInstallChecks((current) => ({
          ...current,
          [projectKey]: {
            ok: response.ok,
            message: body.message ?? body.error ?? "Test terminé."
          }
        }));
        if (response.ok) {
          toast.success("Script détecté", {
            description: body.message ?? "Le widget est installé sur l'URL du site."
          });
        } else {
          toast.error("Script non détecté", {
            description: body.message ?? body.error ?? "Vérifiez que le snippet est installé sur l'URL du site."
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t("actions.error.connection");
        setInstallChecks((current) => ({
          ...current,
          [projectKey]: {
            ok: false,
            message: errorMessage
          }
        }));
        toast.error("Test impossible", {
          description: errorMessage
        });
      }
    });
  }

  return (
    <section className="setup-panel" id="settings" aria-labelledby="destinations-title">
      <div className="setup-heading">
        <div>
          <h2 id="destinations-title"><T k="settings.title" /></h2>
        </div>
        {section === "git-connections" || section === "connected-sites" ? (
          <div className="settings-demo-actions">
            <DemoSeedButton hasLiveDemo={hasLiveDemo} />
          </div>
        ) : null}
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
          <a className={section === "users" ? "is-active" : ""} href="/settings/users">
            <UserRound aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            <T k="settings.sidebar.users" />
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
              onUpdateWidgetSettings={updateWidgetSettings}
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

          {section === "users" ? (
            <UsersSection users={users} workspaceName={workspaceName} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function UsersSection({ users, workspaceName }: { users: WorkspaceUserView[]; workspaceName?: string }) {
  const activeUsers = users.filter((user) => user.status === "active").length;
  const adminUsers = users.filter((user) => user.role === "owner" || user.role === "admin").length;

  return (
    <section className="settings-section users-settings" aria-labelledby="users-settings-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Application</p>
          <h3 id="users-settings-title"><T k="settings.users.title" /></h3>
          <p className="section-lede">
            <T k="settings.users.copy" />
          </p>
        </div>
      </div>

      <div className="users-summary-grid">
        <div className="summary-tile">
          <span>{users.length}</span>
          <small>Utilisateurs</small>
        </div>
        <div className="summary-tile">
          <span>{activeUsers}</span>
          <small>Actifs</small>
        </div>
        <div className="summary-tile">
          <span>{adminUsers}</span>
          <small>Admins</small>
        </div>
      </div>

      <div className="user-management-panel">
        <div className="user-management-heading">
          <div>
            <strong>{workspaceName ?? "Workspace ChangeThis"}</strong>
            <span>Les feedbacks publics restent ouverts. Cette liste ne concerne que l&apos;accès à la console.</span>
          </div>
          <button className="button secondary-button" disabled type="button">
            <Mail aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            Inviter
          </button>
        </div>

        <div className="users-table" role="table" aria-label="Utilisateurs du workspace">
          <div className="users-table-row users-table-head" role="row">
            <span role="columnheader">Utilisateur</span>
            <span role="columnheader">Rôle</span>
            <span role="columnheader">Statut</span>
            <span role="columnheader">Arrivée</span>
          </div>
          {users.map((user) => (
            <div className="users-table-row" role="row" key={user.userId}>
              <span role="cell">
                <span className="user-avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</span>
                <strong>{user.email}</strong>
              </span>
              <span role="cell">
                <ShieldCheck aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
                {roleLabel(user.role)}
              </span>
              <span role="cell">
                <span className={`status-badge ${user.status === "active" ? "connected" : "inactive"}`}>
                  {user.status === "active" ? "Actif" : user.status}
                </span>
              </span>
              <span role="cell">{user.joinedAt ? formatMemberDate(user.joinedAt) : "Session locale"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GitConnectionsSection({ integrations }: { integrations: ProviderIntegrationSummary[] }) {
  const [disabledProviders, setDisabledProviders] = useState<Set<IssueProvider>>(
    () => new Set(integrations.filter((integration) => integration.disabled).map((integration) => integration.provider))
  );
  const [connectionStates, setConnectionStates] = useState<Partial<Record<IssueProvider, ConnectionTestResult>>>(() => (
    Object.fromEntries(integrations.map((integration) => [
      integration.provider,
      integration.credentialConfigured && !integration.disabled
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

  const refreshConnection = useCallback(async (integration: ProviderIntegrationSummary, signal?: AbortSignal, forceEnabled = false) => {
    if ((!integration.credentialConfigured && !forceEnabled) || (!forceEnabled && disabledProviders.has(integration.provider))) {
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
  }, [disabledProviders]);

  const disconnectConnection = useCallback(async (integration: ProviderIntegrationSummary) => {
    setConnectionStates((current) => ({
      ...current,
      [integration.provider]: {
        state: "checking",
        message: `Déconnexion de ${integration.name}...`
      }
    }));

    try {
      const response = await fetch(`/api/integrations/${integration.provider}/connection?integrationId=${encodeURIComponent(integration.id)}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        }
      });
      const body = await response.json().catch(() => undefined) as { error?: string } | undefined;

      if (!response.ok) {
        const errorMessage = body?.error ?? `Impossible de déconnecter ${integration.name}.`;
        setConnectionStates((current) => ({
          ...current,
          [integration.provider]: {
            state: "error",
            message: errorMessage,
            checkedAt: new Date()
          }
        }));
        toast.error("Déconnexion impossible", {
          description: errorMessage
        });
        return;
      }

      setDisabledProviders((current) => new Set(current).add(integration.provider));
      setConnectionStates((current) => ({
        ...current,
        [integration.provider]: {
          state: "inactive",
          message: `${integration.name} est déconnecté dans ChangeThis.`,
          checkedAt: new Date()
        }
      }));
      toast.success(`${integration.name} déconnecté`, {
        description: "ChangeThis n'utilise plus cette connexion Git."
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Impossible de déconnecter ${integration.name}.`;
      setConnectionStates((current) => ({
        ...current,
        [integration.provider]: {
          state: "error",
          message: errorMessage,
          checkedAt: new Date()
        }
      }));
      toast.error("Déconnexion impossible", {
        description: errorMessage
      });
    }
  }, []);

  const enableConnection = useCallback(async (integration: ProviderIntegrationSummary) => {
    setConnectionStates((current) => ({
      ...current,
      [integration.provider]: {
        state: "checking",
        message: `Réactivation de ${integration.name}...`
      }
    }));

    try {
      const response = await fetch(`/api/integrations/${integration.provider}/connection?integrationId=${encodeURIComponent(integration.id)}`, {
        method: "POST",
        headers: {
          Accept: "application/json"
        }
      });
      const body = await response.json().catch(() => undefined) as { error?: string } | undefined;

      if (!response.ok) {
        const errorMessage = body?.error ?? `Impossible de réactiver ${integration.name}.`;
        setConnectionStates((current) => ({
          ...current,
          [integration.provider]: {
            state: "error",
            message: errorMessage,
            checkedAt: new Date()
          }
        }));
        toast.error("Réactivation impossible", {
          description: errorMessage
        });
        return;
      }

      setDisabledProviders((current) => {
        const next = new Set(current);
        next.delete(integration.provider);
        return next;
      });
      await refreshConnection(integration, undefined, true);
      toast.success(`${integration.name} réactivé`, {
        description: "La connexion Git peut à nouveau être utilisée."
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Impossible de réactiver ${integration.name}.`;
      setConnectionStates((current) => ({
        ...current,
        [integration.provider]: {
          state: "error",
          message: errorMessage,
          checkedAt: new Date()
        }
      }));
      toast.error("Réactivation impossible", {
        description: errorMessage
      });
    }
  }, [refreshConnection]);

  useEffect(() => {
    const abortController = new AbortController();

    integrations.forEach((integration) => {
      if (integration.credentialConfigured && !disabledProviders.has(integration.provider)) {
        void refreshConnection(integration, abortController.signal);
      }
    });

    return () => abortController.abort();
  }, [disabledProviders, integrations, refreshConnection]);

  const connectedGitCount = integrations.filter((integration) => (
    integration.credentialConfigured && !disabledProviders.has(integration.provider)
  )).length;
  const showGitTutorial = connectedGitCount === 0;

  return (
    <section className="settings-section" aria-labelledby="git-connections-title">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Connexions</p>
          <h3 id="git-connections-title"><T k="settings.gitConnections.title" /></h3>
          <p className="section-lede">
            Reliez GitHub ou GitLab à ChangeThis pour transformer les feedbacks clients en issues prêtes à traiter.
          </p>
        </div>
      </div>

      {showGitTutorial ? (
        <div className="git-tutorial" aria-label="Tutoriel Connexions Git">
          <div className="git-tutorial-intro">
            <p className="eyebrow">Tutoriel rapide</p>
            <h4>Connectez votre outil Git en 2 minutes</h4>
            <p>
              Choisissez votre outil Git, sélectionnez le dépôt du projet, puis envoyez vos feedbacks clients vers des issues exploitables.
            </p>
            <div className="git-tutorial-actions">
              {integrations.map((integration) => {
                const isLocallyDisabled = disabledProviders.has(integration.provider);

                if (isLocallyDisabled && integration.environmentCredentialConfigured) {
                  return (
                    <button className="button" key={integration.provider} onClick={() => void enableConnection(integration)} type="button">
                      <Link2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                      Réactiver {integration.name}
                    </button>
                  );
                }

                if (integration.connectConfigured && !isLocallyDisabled) {
                  return (
                    <a className="button" href={`${integration.connectPath}?returnTo=/settings/git-connections`} key={integration.provider}>
                      <Link2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                      Connecter {integration.name}
                    </a>
                  );
                }

                return (
                  <span className="button disabled-button" aria-disabled="true" key={integration.provider}>
                    {integration.name} indisponible
                  </span>
                );
              })}
            </div>
          </div>
          <ol className="git-tutorial-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Connecter un compte</strong>
                <p>Autorisez ChangeThis à lire vos dépôts GitHub ou GitLab disponibles.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Choisir un dépôt</strong>
                <p>Dans Sites connectés, associez chaque site au repository qui recevra ses issues.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Créer l’issue</strong>
                <p>Depuis l’inbox, validez un feedback et envoyez-le avec son contexte, son URL et sa capture.</p>
              </div>
            </li>
          </ol>
          <div className="git-tutorial-safety">
            <ShieldCheck aria-hidden="true" className="ui-icon" size={18} strokeWidth={2.2} />
            <p>
              ChangeThis peut créer des issues dans les dépôts choisis, mais ne modifie pas votre code et ne publie rien dans un dépôt non sélectionné.
            </p>
          </div>
        </div>
      ) : null}

      <div className="integration-grid">
        {integrations.map((integration) => {
          const isLocallyDisabled = disabledProviders.has(integration.provider);
          const credentialConfigured = integration.credentialConfigured && !isLocallyDisabled;
          const connectionState = connectionStates[integration.provider] ?? {
            state: credentialConfigured ? "checking" : "inactive",
            message: credentialConfigured ? "Vérification de la connexion active..." : "Ajoutez un token serveur pour activer cette connexion."
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
              <div className="integration-actions">
                {credentialConfigured ? (
                  <button className="button danger-button" disabled={connectionState.state === "checking"} onClick={() => void disconnectConnection(integration)} type="button">
                    <Trash2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    Déconnecter
                  </button>
                ) : isLocallyDisabled && integration.environmentCredentialConfigured ? (
                  <button className="button" disabled={connectionState.state === "checking"} onClick={() => void enableConnection(integration)} type="button">
                    <Link2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    Réactiver
                  </button>
                ) : null}
                {integration.connectConfigured && !credentialConfigured ? (
                  <a className="button" href={`${integration.connectPath}?returnTo=/settings/git-connections`}>
                    <Link2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    {integration.status === "connected" ? <T k="destinations.verify" /> : <><T k="destinations.connect" /> {integration.name}</>}
                  </a>
                ) : !credentialConfigured && !isLocallyDisabled ? (
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

function formatMemberDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function roleLabel(role: WorkspaceUserView["role"]): string {
  if (role === "owner") {
    return "Propriétaire";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "member") {
    return "Membre";
  }

  if (role === "viewer") {
    return "Lecture seule";
  }

  return role;
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
  onUpdateWidgetSettings,
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
  installChecks: Record<string, InstallCheckResult>;
  message: string;
  onCloseModal: () => void;
  onCreateSite: () => void;
  onDeleteSite: (projectKey: string) => void;
  onTestScript: (projectKey: string) => void;
  onCopyInstallSnippet: (project: ProjectView) => void;
  onOpenSiteModal: () => void;
  onSelectProvider: (provider: IssueProvider) => void;
  onUpdateWidgetSettings: (projectKey: string, update: Partial<Pick<ProjectView, "widgetLocale" | "widgetButtonPosition" | "widgetButtonVariant">>) => void;
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
  const shouldShowRepositoryStatus = isSelectedProviderConnected && repositoryLoadState !== "idle";
  const isRepositorySelectDisabled = !isSelectedProviderConnected || repositoryLoadState === "loading" || repositoryOptions.length === 0;
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
                <div className="site-row-main">
                  <div className="site-identity">
                    <div className="site-title-row">
                      <h3>{project.name}</h3>
                      <span className={`status-badge ${isReady ? "connected" : "failed"}`}>
                        {isReady ? "Actif" : "Git déconnecté"}
                      </span>
                    </div>
                    <p>{project.allowedOrigins.join(", ")}</p>
                  </div>
                  <div className="repo-destination">
                    <ProviderBadge provider={issueTarget.provider} />
                    <div>
                      <span>Destination issue</span>
                      <strong>{issueTarget.namespace}/{issueTarget.project}</strong>
                      {issueTarget.webUrl ? (
                        <a href={issueTarget.webUrl}>{issueTarget.webUrl}</a>
                      ) : null}
                    </div>
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
                </div>
                <div className="site-row-meta">
                  <div className="site-metrics">
                    <span><strong>{project.metrics?.feedbacksReceived ?? 0}</strong><small>Retours</small></span>
                    <span><strong>{project.metrics?.issuesCreated ?? 0}</strong><small>Issues</small></span>
                    <span><strong>{project.metrics?.failedIssues ?? 0}</strong><small>Échecs</small></span>
                  </div>
                  <div className="widget-settings">
                    <label>
                      <span>Langue widget</span>
                      <select
                        disabled={isPending}
                        onChange={(event) => onUpdateWidgetSettings(project.publicKey, { widgetLocale: event.target.value as WidgetLocale })}
                        value={project.widgetLocale}
                      >
                        {widgetLocaleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Visibilité</span>
                      <select
                        disabled={isPending}
                        onChange={(event) => onUpdateWidgetSettings(project.publicKey, { widgetButtonVariant: event.target.value as WidgetButtonVariant })}
                        value={project.widgetButtonVariant}
                      >
                        {widgetVariantOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Position bouton</span>
                      <select
                        disabled={isPending}
                        onChange={(event) => onUpdateWidgetSettings(project.publicKey, { widgetButtonPosition: event.target.value as WidgetButtonPosition })}
                        value={project.widgetButtonPosition}
                      >
                        {widgetPositionOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="site-script">
                    <strong>Script widget</strong>
                    <code>{project.installSnippet ?? installSnippet(project)}</code>
                    <div className="site-script-actions">
                      <button className="inline-action" onClick={() => onCopyInstallSnippet(project)} type="button">
                        <Copy aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
                        Copier
                      </button>
                      {installChecks[project.publicKey] ? (
                        <span className={`script-check-result ${installChecks[project.publicKey].ok ? "success" : "error"}`}>
                          {installChecks[project.publicKey].message}
                        </span>
                      ) : null}
                    </div>
                  </div>
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
                  <div>
                    <strong>Aucune connexion Git active</strong>
                    <span>Connectez GitHub ou GitLab avant d&apos;ajouter un site.</span>
                  </div>
                  <Link className="button secondary-button repository-loader-action" href="/settings/git-connections">
                    <GitBranch aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
                    Connexions Git
                  </Link>
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
                  <span className="field-label">
                    URL du site
                    <span
                      className="tooltip-icon"
                      role="img"
                      aria-label="Cette URL limite l'envoi de feedbacks aux pages de ce domaine. Si quelqu'un récupère la clé publique du widget, l'API refusera les retours venant d'un autre site."
                      data-tooltip="Cette URL limite l'envoi de feedbacks aux pages de ce domaine. Si quelqu'un récupère la clé publique du widget, l'API refusera les retours venant d'un autre site."
                      tabIndex={0}
                    >
                      <Info aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.3} />
                    </span>
                  </span>
                  <input name="siteOrigin" onChange={(event) => setSiteOrigin(event.target.value)} placeholder="https://www.exemple.be" value={siteOrigin} />
                </label>
                <label>
                  Service Git
                  <select name="provider" value={selectedProvider} onChange={(event) => onSelectProvider(event.target.value as IssueProvider)}>
                    <option disabled={!connectedProviders.has("github")} value="github">GitHub</option>
                    <option disabled={!connectedProviders.has("gitlab")} value="gitlab">GitLab</option>
                  </select>
                </label>
                <label className="repo-select-field">
                  Repository connecté
                  <select
                    disabled={isRepositorySelectDisabled}
                    name="repositorySelect"
                    value={selectedRepositoryId}
                    onChange={(event) => setSelectedRepositoryId(event.target.value)}
                  >
                    <option value="">{repositorySelectPlaceholder(repositoryLoadState, isSelectedProviderConnected)}</option>
                    {repositoryOptions.map((repository) => (
                      <option key={repository.id} value={repository.id}>
                        {repository.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="form-status site-create-status" role="status">
                  {message}
                </p>
                <div className="site-create-actions">
                  <button className="button" disabled={isPending || !siteOrigin || !selectedRepositoryId || !isSelectedProviderConnected} onClick={onCreateSite} type="button">
                    <Plus aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                    {isPending ? "Création..." : "Créer le site"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
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

function repositorySelectPlaceholder(state: RepositoryLoadState, isProviderConnected: boolean): string {
  if (!isProviderConnected) {
    return "Connexion Git requise";
  }

  if (state === "loading") {
    return "Chargement des dépôts...";
  }

  if (state === "empty") {
    return "Aucun dépôt accessible";
  }

  if (state === "error" || state === "unavailable") {
    return "Liste indisponible";
  }

  return "Choisir un dépôt";
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

function installSnippet(project: Pick<ProjectView, "publicKey" | "widgetLocale" | "widgetButtonPosition" | "widgetButtonVariant">): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const variant = project.widgetButtonVariant !== "default" ? ` data-button-variant="${project.widgetButtonVariant}"` : "";
  return `<script src="${origin}/widget.js" data-project="${project.publicKey}" data-locale="${project.widgetLocale}" data-position="${project.widgetButtonPosition}"${variant}></script>`;
}
