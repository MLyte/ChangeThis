"use client";

import { useMemo, useState, useTransition } from "react";
import type { IssueProvider, IssueTarget } from "@changethis/shared";
import type { ChangeThisProject, ProviderIntegrationSummary } from "../../lib/demo-project";

type Props = {
  projects: ChangeThisProject[];
  integrations: ProviderIntegrationSummary[];
};

type ProjectView = ChangeThisProject;

const emptyRepository = "";

export function IssueDestinationSetup({ projects, integrations }: Props) {
  const [projectViews, setProjectViews] = useState<ProjectView[]>(projects);
  const [selectedProjectKey, setSelectedProjectKey] = useState(projects[0]?.publicKey ?? "");
  const [selectedProvider, setSelectedProvider] = useState<IssueProvider>(projects[0]?.issueTarget.provider ?? "github");
  const [repoUrl, setRepoUrl] = useState(repositoryUrl(projects[0]?.issueTarget));
  const [message, setMessage] = useState("Choisissez un site, GitHub ou GitLab, puis liez un repository cible.");
  const [isPending, startTransition] = useTransition();

  const connectedProviders = useMemo(
    () => new Set(integrations.filter((integration) => integration.status === "connected").map((integration) => integration.provider)),
    [integrations]
  );

  const selectedProject = projectViews.find((project) => project.publicKey === selectedProjectKey);
  const missingDestinations = projectViews.filter((project) => !project.issueTarget.namespace || !project.issueTarget.project);

  function selectProject(projectKey: string) {
    const project = projectViews.find((item) => item.publicKey === projectKey);
    setSelectedProjectKey(projectKey);
    setSelectedProvider(project?.issueTarget.provider ?? "github");
    setRepoUrl(repositoryUrl(project?.issueTarget));
  }

  function selectProvider(provider: IssueProvider) {
    setSelectedProvider(provider);
    setRepoUrl(emptyRepository);
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
        setMessage(body.error ?? "Impossible de lier ce repository.");
        return;
      }

      setProjectViews((current) => current.map((project) => project.publicKey === body.project?.publicKey ? body.project : project));
      setMessage(`${body.project.name} enverra ses issues vers ${body.project.issueTarget.provider.toUpperCase()} ${body.project.issueTarget.namespace}/${body.project.issueTarget.project}.`);
    });
  }

  return (
    <>
      <section className="setup-panel" aria-labelledby="destinations-title">
        <div className="setup-heading">
          <div>
            <p className="eyebrow">Routage obligatoire</p>
            <h2 id="destinations-title">Chaque site choisit GitHub ou GitLab avant d&apos;envoyer une issue</h2>
          </div>
          <a className="button secondary-button" href="#site-repos">Configurer</a>
        </div>

        <div className="integration-grid">
          {integrations.map((integration) => (
            <article className="integration-card" key={integration.provider}>
              <div className="integration-topline">
                <span className={`provider-badge ${integration.provider}`}>
                  {integration.provider === "github" ? "GH" : "GL"}
                </span>
                <span className={`status-badge ${integration.status}`}>
                  {integration.status === "connected" ? "Connecte" : "A connecter"}
                </span>
              </div>
              <h3>{integration.name}</h3>
              <p>{integration.accountLabel}</p>
              <div className="integration-actions">
                <a className="button" href={`${integration.connectPath}?returnTo=/projects`}>
                  {integration.status === "connected" ? "Verifier" : `Connecter ${integration.name}`}
                </a>
                {integration.managePath ? (
                  <a className="button secondary-button" href={integration.managePath}>
                    Gerer
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="repo-linker" id="site-repos">
          <div>
            <h3>Lier un site a son repo d&apos;issues</h3>
            <p>
              Cette configuration est sauvegardee cote serveur et pilote la creation reelle des issues depuis l&apos;inbox.
            </p>
          </div>
          <form className="repo-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Site
              <select name="project" value={selectedProjectKey} onChange={(event) => selectProject(event.target.value)}>
                {projectViews.map((project) => (
                  <option key={project.publicKey} value={project.publicKey}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Provider
              <select name="provider" value={selectedProvider} onChange={(event) => selectProvider(event.target.value as IssueProvider)}>
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </label>
            <label className="repo-url-field">
              Repository cible
              <input
                name="repo"
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder={selectedProvider === "github" ? "https://github.com/org/repo" : "https://gitlab.com/group/project"}
                value={repoUrl}
              />
            </label>
            <button className="button" disabled={isPending || !selectedProject} onClick={linkRepo} type="button">
              {isPending ? "Liaison..." : "Sauvegarder"}
            </button>
          </form>
          <p className="form-status" role="status">
            {missingDestinations.length > 0 ? `${missingDestinations.length} site(s) sans destination.` : message}
          </p>
        </div>
      </section>

      <section className="linked-sites" aria-labelledby="linked-sites-title">
        <div className="setup-heading">
          <div>
            <p className="eyebrow">Sites pilotes</p>
            <h2 id="linked-sites-title">Un choix provider explicite par site</h2>
          </div>
        </div>
        <div className="site-repo-list">
          {projectViews.map((project) => {
            const issueTarget = project.issueTarget;
            const providerConnected = connectedProviders.has(issueTarget.provider);
            const isReady = providerConnected && issueTarget.namespace && issueTarget.project;

            return (
              <article className="site-repo-row" key={project.publicKey}>
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.allowedOrigins.filter((origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1")).join(", ")}</p>
                </div>
                <div className="repo-destination">
                  <span className={`provider-badge ${issueTarget.provider}`}>
                    {issueTarget.provider === "github" ? "GH" : "GL"}
                  </span>
                  <div>
                    <strong>{issueTarget.namespace}/{issueTarget.project}</strong>
                    <span>{isReady ? "Pret pour creer des issues" : "Configuration requise"}</span>
                  </div>
                </div>
                {issueTarget.webUrl ? (
                  <a className="button secondary-button" href={issueTarget.webUrl}>Ouvrir</a>
                ) : (
                  <a className="button secondary-button" href="#site-repos">Configurer</a>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function repositoryUrl(issueTarget?: IssueTarget): string {
  return issueTarget?.webUrl ?? emptyRepository;
}
