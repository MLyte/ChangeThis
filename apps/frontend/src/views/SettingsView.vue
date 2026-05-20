<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { apiFetch } from "../api";

type IssueTarget = {
  provider: "github" | "gitlab";
  namespace: string;
  projectName: string;
  externalProjectId: string;
  webUrl: string;
  labels: string[];
  createMode: "manual" | "automatic";
};

type Site = {
  publicKey: string;
  name: string;
  status: string;
  allowedOrigins: string[];
  widgetSettings: Record<string, unknown>;
  issueTarget: IssueTarget | null;
};

type ProviderState = {
  connected: boolean;
  provider: string;
  status: string;
};

const sites = ref<Site[]>([]);
const providers = reactive<Record<"github" | "gitlab", ProviderState>>({
  github: { connected: false, provider: "github", status: "missing" },
  gitlab: { connected: false, provider: "gitlab", status: "missing" }
});
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");

const newSite = reactive({
  name: "",
  origin: "",
  provider: "github" as "github" | "gitlab",
  repository: "",
  externalProjectId: "",
  createMode: "manual" as "manual" | "automatic",
  token: "",
  gitlabBaseUrl: "https://gitlab.com"
});

const appBaseUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return String(base).replace(/\/$/, "");
});

onMounted(loadAll);

async function loadAll() {
  loading.value = true;
  error.value = "";
  try {
    const [siteResponse, githubState, gitlabState] = await Promise.all([
      apiFetch<{ sites: Site[] }>("/api/projects/sites"),
      apiFetch<ProviderState>("/api/integrations/github/connection"),
      apiFetch<ProviderState>("/api/integrations/gitlab/connection")
    ]);
    sites.value = siteResponse.sites;
    providers.github = githubState;
    providers.gitlab = gitlabState;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Chargement impossible";
  } finally {
    loading.value = false;
  }
}

async function connectProvider(provider: "github" | "gitlab") {
  const token = newSite.token.trim();
  if (!token) {
    error.value = "Colle un token GitHub ou GitLab avant de connecter le provider.";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    await apiFetch(`/api/integrations/${provider}/connect`, {
      method: "POST",
      body: JSON.stringify({
        token,
        baseUrl: provider === "gitlab" ? newSite.gitlabBaseUrl.trim() : ""
      })
    });
    newSite.token = "";
    notice.value = `${providerLabel(provider)} connecté.`;
    await loadAll();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Connexion impossible";
  } finally {
    saving.value = false;
  }
}

async function createSite() {
  if (!newSite.name.trim() || !newSite.origin.trim()) {
    error.value = "Nom du site et origine sont requis.";
    return;
  }
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const response = await apiFetch<{ site: Site }>("/api/projects/sites", {
      method: "POST",
      body: JSON.stringify({
        name: newSite.name.trim(),
        allowedOrigins: [newSite.origin.trim()],
        widgetSettings: {
          language: "fr",
          buttonPosition: "right",
          reporterFields: "optional"
        }
      })
    });
    if (newSite.repository.trim()) {
      await saveIssueTarget(response.site.publicKey, {
        provider: newSite.provider,
        namespace: newSite.repository.trim(),
        projectName: newSite.repository.trim(),
        externalProjectId: newSite.externalProjectId.trim(),
        webUrl: repositoryUrl(newSite.provider, newSite.repository.trim(), newSite.externalProjectId.trim()),
        labels: ["feedback"],
        createMode: newSite.createMode
      });
    }
    notice.value = "Site connecté créé.";
    newSite.name = "";
    newSite.origin = "";
    newSite.repository = "";
    newSite.externalProjectId = "";
    await loadAll();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Création impossible";
  } finally {
    saving.value = false;
  }
}

async function saveIssueTarget(projectKey: string, target: IssueTarget) {
  await apiFetch("/api/projects/issue-targets", {
    method: "POST",
    body: JSON.stringify({
      projectKey,
      provider: target.provider,
      repository: target.namespace,
      projectName: target.projectName,
      externalProjectId: target.externalProjectId,
      webUrl: target.webUrl,
      labels: target.labels,
      createMode: target.createMode
    })
  });
}

async function updateSite(site: Site) {
  saving.value = true;
  error.value = "";
  try {
    await apiFetch(`/api/projects/sites/${site.publicKey}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: site.name,
        allowedOrigins: site.allowedOrigins,
        widgetSettings: site.widgetSettings
      })
    });
    if (site.issueTarget) {
      await saveIssueTarget(site.publicKey, site.issueTarget);
    }
    notice.value = "Site mis à jour.";
    await loadAll();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Sauvegarde impossible";
  } finally {
    saving.value = false;
  }
}

async function disableSite(site: Site) {
  if (!confirm(`Désactiver ${site.name} ?`)) {
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    await apiFetch(`/api/projects/sites/${site.publicKey}`, { method: "DELETE" });
    notice.value = "Site désactivé.";
    await loadAll();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Désactivation impossible";
  } finally {
    saving.value = false;
  }
}

async function sendTestFeedback(site: Site) {
  saving.value = true;
  error.value = "";
  try {
    await apiFetch("/api/public/feedback", {
      method: "POST",
      body: JSON.stringify({
        project: site.publicKey,
        message: `Feedback test CRA-W pour ${site.name}`,
        pageUrl: site.allowedOrigins[0] || appBaseUrl.value,
        metadata: {
          source: "settings-test",
          createdFrom: "CRAW dashboard"
        }
      })
    });
    notice.value = "Feedback test envoyé. Il doit apparaître dans Issues.";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Test impossible";
  } finally {
    saving.value = false;
  }
}

async function copyScript(site: Site) {
  await navigator.clipboard.writeText(scriptSnippet(site));
  notice.value = "Script copié.";
}

function ensureTarget(site: Site) {
  if (!site.issueTarget) {
    site.issueTarget = {
      provider: "github",
      namespace: "",
      projectName: "",
      externalProjectId: "",
      webUrl: "",
      labels: ["feedback"],
      createMode: "manual"
    };
  }
}

function scriptSnippet(site: Site) {
  return `<script src="${appBaseUrl.value}/widget.js" data-project="${site.publicKey}"></` + "script>";
}

function providerLabel(provider: "github" | "gitlab" | string) {
  return provider === "gitlab" ? "GitLab" : "GitHub";
}

function repositoryUrl(provider: "github" | "gitlab", repository: string, externalProjectId: string) {
  if (!repository) {
    return "";
  }
  if (provider === "github") {
    return `https://github.com/${repository}`;
  }
  if (repository.startsWith("http")) {
    return repository;
  }
  if (externalProjectId) {
    return `${newSite.gitlabBaseUrl.replace(/\/$/, "")}/${repository}`;
  }
  return "";
}
</script>

<template>
  <main class="page">
    <div class="page-title">
      <p class="eyebrow">Installation CRAW</p>
      <h1>Paramètres</h1>
      <p>Connecte un provider, crée un site, copie le script, puis envoie un feedback test.</p>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <section class="panel wide">
      <h2>Connexions Git</h2>
      <div class="provider-grid">
        <article class="provider-card">
          <strong>GitHub</strong>
          <span class="status-pill" :class="{ active: providers.github.connected }">
            {{ providers.github.connected ? "Connecté" : "Non connecté" }}
          </span>
          <button class="button secondary" :disabled="saving" @click="connectProvider('github')">Connecter GitHub</button>
        </article>
        <article class="provider-card">
          <strong>GitLab</strong>
          <span class="status-pill" :class="{ active: providers.gitlab.connected }">
            {{ providers.gitlab.connected ? "Connecté" : "Non connecté" }}
          </span>
          <button class="button secondary" :disabled="saving" @click="connectProvider('gitlab')">Connecter GitLab</button>
        </article>
      </div>
      <div class="form-grid">
        <label>
          Token provider
          <input v-model="newSite.token" type="password" autocomplete="off" placeholder="github_pat... ou glpat..." />
        </label>
        <label>
          URL GitLab self-hosted
          <input v-model="newSite.gitlabBaseUrl" placeholder="https://gitlab.com" />
        </label>
      </div>
    </section>

    <section class="panel wide">
      <h2>Créer un site connecté</h2>
      <form class="site-form" @submit.prevent="createSite">
        <div class="form-grid">
          <label>
            Nom du site
            <input v-model="newSite.name" placeholder="Portail communal" />
          </label>
          <label>
            Origine autorisée
            <input v-model="newSite.origin" placeholder="https://example.be" />
          </label>
          <label>
            Provider issue
            <select v-model="newSite.provider">
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
          </label>
          <label>
            Repository / namespace
            <input v-model="newSite.repository" placeholder="organisation/repository" />
          </label>
          <label>
            ID projet GitLab
            <input v-model="newSite.externalProjectId" placeholder="optionnel, recommandé pour GitLab" />
          </label>
          <label>
            Création issue
            <select v-model="newSite.createMode">
              <option value="manual">Manuelle</option>
              <option value="automatic">Automatique</option>
            </select>
          </label>
        </div>
        <button class="button" :disabled="saving">Créer le site</button>
      </form>
    </section>

    <section class="panel wide">
      <h2>Sites connectés</h2>
      <p v-if="loading">Chargement...</p>
      <p v-else-if="sites.length === 0">Aucun site connecté.</p>
      <article v-for="site in sites" :key="site.publicKey" class="site-card">
        <div class="site-card-header">
          <div>
            <input v-model="site.name" class="inline-title" />
            <p class="muted">{{ site.publicKey }} · {{ site.status }}</p>
          </div>
          <div class="actions">
            <button class="button secondary" :disabled="saving" @click="sendTestFeedback(site)">Feedback test</button>
            <button class="button secondary" :disabled="saving" @click="copyScript(site)">Copier script</button>
            <button class="button danger" :disabled="saving" @click="disableSite(site)">Désactiver</button>
          </div>
        </div>

        <label>
          Origines autorisées
          <input
            :value="site.allowedOrigins.join(', ')"
            @input="site.allowedOrigins = ($event.target as HTMLInputElement).value.split(',').map((origin) => origin.trim()).filter(Boolean)"
          />
        </label>

        <pre class="snippet">{{ scriptSnippet(site) }}</pre>

        <div class="issue-box">
          <div class="issue-box-header">
            <h3>Destination issue</h3>
            <button class="link-button" @click="ensureTarget(site)">Configurer</button>
          </div>
          <div v-if="site.issueTarget" class="form-grid">
            <label>
              Provider
              <select v-model="site.issueTarget.provider">
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </label>
            <label>
              Repository / namespace
              <input v-model="site.issueTarget.namespace" placeholder="organisation/repository" />
            </label>
            <label>
              ID projet GitLab
              <input v-model="site.issueTarget.externalProjectId" placeholder="optionnel" />
            </label>
            <label>
              Mode
              <select v-model="site.issueTarget.createMode">
                <option value="manual">Manuelle</option>
                <option value="automatic">Automatique</option>
              </select>
            </label>
          </div>
        </div>

        <button class="button" :disabled="saving" @click="updateSite(site)">Sauvegarder</button>
      </article>
    </section>
  </main>
</template>
