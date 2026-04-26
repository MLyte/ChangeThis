"use client";

import { useMemo, useState } from "react";
import type { IssueProvider, IssueTarget } from "@changethis/shared";
import type { ChangeThisProject, ProviderIntegrationSummary } from "../../lib/demo-project";

type Props = {
  projects: ChangeThisProject[];
  integrations: ProviderIntegrationSummary[];
};

type LinkedTarget = {
  projectKey: string;
  issueTarget: IssueTarget;
};

const storageKey = "changethis.issueTargets";

export function IssueDestinationSetup({ projects, integrations }: Props) {
  const [selectedProjectKey, setSelectedProjectKey] = useState(projects[0]?.publicKey ?? "");
  const [selectedProvider, setSelectedProvider] = useState<IssueProvider>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [message, setMessage] = useState("Collez une URL GitHub ou GitLab pour verifier le repo.");
  const [linkedTargets, setLinkedTargets] = useState<LinkedTarget[]>(() => {
    const defaultTargets = projects.map((project) => ({
      projectKey: project.publicKey,
      issueTarget: project.issueTarget
    }));

    if (typeof window === "undefined") {
      return defaultTargets;
    }

    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return defaultTargets;
    }

    try {
      return JSON.parse(stored) as LinkedTarget[];
    } catch {
      window.localStorage.removeItem(storageKey);
      return defaultTargets;
    }
  });

  const connectedProviders = useMemo(
    () => new Set(integrations.filter((integration) => integration.status === "connected").map((integration) => integration.provider)),
    [integrations]
  );

  function linkRepo() {
    const parsedTarget = parseRepoUrl(repoUrl, selectedProvider);

    if (!parsedTarget) {
      setMessage("URL invalide pour ce provider. Exemple: https://github.com/org/repo ou https://gitlab.com/group/project.");
      return;
    }

    const nextTargets = [
      ...linkedTargets.filter((target) => target.projectKey !== selectedProjectKey),
      {
        projectKey: selectedProjectKey,
        issueTarget: parsedTarget
      }
    ];

    setLinkedTargets(nextTargets);
    window.localStorage.setItem(storageKey, JSON.stringify(nextTargets));
    setMessage(`${parsedTarget.namespace}/${parsedTarget.project} lie au site selectionne.`);
  }

  function getLinkedTarget(project: ChangeThisProject): IssueTarget {
    return linkedTargets.find((target) => target.projectKey === project.publicKey)?.issueTarget ?? project.issueTarget;
  }

  return (
    <>
      <section className="setup-panel" aria-labelledby="destinations-title">
        <div className="setup-heading">
          <div>
            <p className="eyebrow">Destinations d&apos;issues</p>
            <h2 id="destinations-title">Connecter un compte, puis lier chaque site a un repo</h2>
          </div>
          <a className="button secondary-button" href="#site-repos">Lier un site</a>
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
                  {integration.status === "connected" ? "Reconnecter" : `Connecter ${integration.name}`}
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
            <h3>Ajouter un lien site vers repo</h3>
            <p>
              Choisissez le provider, collez l&apos;URL du repo, puis ChangeThis saura ou creer les issues de ce site.
            </p>
          </div>
          <form className="repo-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Site
              <select name="project" value={selectedProjectKey} onChange={(event) => setSelectedProjectKey(event.target.value)}>
                {projects.map((project) => (
                  <option key={project.publicKey} value={project.publicKey}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Provider
              <select name="provider" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as IssueProvider)}>
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </label>
            <label className="repo-url-field">
              Repo d&apos;issues
              <input
                name="repo"
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder="https://github.com/org/repo ou https://gitlab.com/group/project"
                value={repoUrl}
              />
            </label>
            <button className="button" onClick={linkRepo} type="button">Verifier et lier</button>
          </form>
          <p className="form-status" role="status">{message}</p>
        </div>
      </section>

      <section className="linked-sites" aria-labelledby="linked-sites-title">
        <div className="setup-heading">
          <div>
            <p className="eyebrow">Sites lies</p>
            <h2 id="linked-sites-title">Un repo d&apos;issues par site</h2>
          </div>
        </div>
        <div className="site-repo-list">
          {projects.map((project) => {
            const issueTarget = getLinkedTarget(project);
            const providerConnected = connectedProviders.has(issueTarget.provider);

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
                    <span>{providerConnected ? "Pret pour les issues" : "Connexion requise"}</span>
                  </div>
                </div>
                {issueTarget.webUrl ? (
                  <a className="button secondary-button" href={issueTarget.webUrl}>Ouvrir le repo</a>
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

function parseRepoUrl(value: string, provider: IssueProvider): IssueTarget | undefined {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split("/").filter(Boolean);

    if (provider === "github" && url.hostname === "github.com" && parts.length >= 2) {
      return {
        provider,
        namespace: parts[0],
        project: parts[1],
        webUrl: `https://github.com/${parts[0]}/${parts[1]}`
      };
    }

    if (provider === "gitlab" && url.hostname.includes("gitlab") && parts.length >= 2) {
      return {
        provider,
        namespace: parts.slice(0, -1).join("/"),
        project: parts.at(-1) ?? "",
        webUrl: `${url.origin}/${parts.join("/")}`
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}
