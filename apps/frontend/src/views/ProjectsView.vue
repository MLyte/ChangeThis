<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiFetch } from "../api";

type Feedback = {
  id: string;
  message: string;
  status: string;
  projectName: string;
  projectKey: string;
  pageUrl: string;
  reporterEmail: string;
  screenshotPath: string;
  createdAt: string;
};

const feedbacks = ref<Feedback[]>([]);
const loading = ref(true);
const actingId = ref("");
const error = ref("");
const notice = ref("");
const query = ref("");
const statusFilter = ref("all");
const siteFilter = ref("all");

const filteredFeedbacks = computed(() => {
  const text = query.value.trim().toLowerCase();
  return feedbacks.value.filter((feedback) => {
    const matchesText = !text
      || feedback.message.toLowerCase().includes(text)
      || feedback.pageUrl.toLowerCase().includes(text)
      || feedback.projectName.toLowerCase().includes(text)
      || feedback.reporterEmail.toLowerCase().includes(text);
    const matchesStatus = statusFilter.value === "all" || feedback.status === statusFilter.value;
    const matchesSite = siteFilter.value === "all" || feedback.projectKey === siteFilter.value;
    return matchesText && matchesStatus && matchesSite;
  });
});

const sites = computed(() => {
  const byKey = new Map<string, string>();
  for (const feedback of feedbacks.value) {
    byKey.set(feedback.projectKey, feedback.projectName);
  }
  return [...byKey.entries()].map(([key, name]) => ({ key, name }));
});

const stats = computed(() => {
  const result: Record<string, number> = {};
  for (const feedback of feedbacks.value) {
    result[feedback.status] = (result[feedback.status] ?? 0) + 1;
  }
  return result;
});

onMounted(loadFeedbacks);

async function loadFeedbacks() {
  loading.value = true;
  error.value = "";
  try {
    const response = await apiFetch<{ feedbacks: Feedback[] }>("/api/projects/feedbacks");
    feedbacks.value = response.feedbacks;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Chargement impossible";
  } finally {
    loading.value = false;
  }
}

async function runAction(feedback: Feedback, action: "keep" | "ignore" | "issue" | "sync") {
  actingId.value = feedback.id;
  error.value = "";
  notice.value = "";
  try {
    const response = await apiFetch<{ feedback?: Feedback; issue?: { url: string; number: string } }>(
      `/api/projects/feedbacks/${feedback.id}/${action}`,
      { method: "POST" }
    );
    if (response.feedback) {
      replaceFeedback(response.feedback);
    }
    if (response.issue?.url) {
      notice.value = `Issue créée: ${response.issue.url}`;
    } else {
      notice.value = "Feedback mis à jour.";
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Action impossible";
    await loadFeedbacks();
  } finally {
    actingId.value = "";
  }
}

function replaceFeedback(next: Feedback) {
  const index = feedbacks.value.findIndex((feedback) => feedback.id === next.id);
  if (index >= 0) {
    feedbacks.value[index] = next;
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Nouveau",
    qualified: "Qualifié",
    ignored: "Ignoré",
    cancelled: "Annulé",
    retrying: "À relancer",
    failed: "Échec",
    sent_to_provider: "Issue créée"
  };
  return labels[status] ?? status;
}
</script>

<template>
  <main class="page">
    <div class="page-title">
      <p class="eyebrow">Inbox</p>
      <h1>Issues</h1>
      <p>Trie les feedbacks reçus, qualifie ce qui mérite traitement et crée les issues Git configurées.</p>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <section class="metric-grid">
      <article class="metric-card">
        <strong>{{ feedbacks.length }}</strong>
        <span>feedbacks reçus</span>
      </article>
      <article class="metric-card">
        <strong>{{ stats.new ?? 0 }}</strong>
        <span>nouveaux</span>
      </article>
      <article class="metric-card">
        <strong>{{ stats.sent_to_provider ?? 0 }}</strong>
        <span>issues créées</span>
      </article>
      <article class="metric-card">
        <strong>{{ stats.failed ?? 0 }}</strong>
        <span>échecs Git</span>
      </article>
    </section>

    <section class="panel wide">
      <div class="filters">
        <label>
          Recherche
          <input v-model="query" placeholder="Message, URL, site, reporter..." />
        </label>
        <label>
          Site
          <select v-model="siteFilter">
            <option value="all">Tous les sites</option>
            <option v-for="site in sites" :key="site.key" :value="site.key">{{ site.name }}</option>
          </select>
        </label>
        <label>
          Statut
          <select v-model="statusFilter">
            <option value="all">Tous les statuts</option>
            <option value="new">Nouveau</option>
            <option value="qualified">Qualifié</option>
            <option value="sent_to_provider">Issue créée</option>
            <option value="failed">Échec</option>
            <option value="ignored">Ignoré</option>
          </select>
        </label>
        <button class="button secondary" @click="loadFeedbacks">Rafraîchir</button>
      </div>
    </section>

    <section class="panel wide">
      <p v-if="loading">Chargement...</p>
      <p v-else-if="filteredFeedbacks.length === 0">Aucun feedback ne correspond aux filtres.</p>
      <article v-for="feedback in filteredFeedbacks" :key="feedback.id" class="feedback-row">
        <div>
          <div class="row-title">
            <strong>{{ feedback.projectName }}</strong>
            <span class="status-pill" :class="{ active: feedback.status === 'sent_to_provider' }">
              {{ statusLabel(feedback.status) }}
            </span>
          </div>
          <p>{{ feedback.message || "Sans message" }}</p>
          <small>
            {{ feedback.pageUrl || "URL non fournie" }}
            <span v-if="feedback.reporterEmail"> · {{ feedback.reporterEmail }}</span>
            · {{ new Date(feedback.createdAt).toLocaleString() }}
          </small>
          <small v-if="feedback.screenshotPath">Capture: {{ feedback.screenshotPath }}</small>
        </div>
        <div class="row-actions">
          <button class="button secondary" :disabled="actingId === feedback.id" @click="runAction(feedback, 'keep')">
            Qualifier
          </button>
          <button class="button" :disabled="actingId === feedback.id" @click="runAction(feedback, 'issue')">
            Créer issue
          </button>
          <button class="button secondary" :disabled="actingId === feedback.id" @click="runAction(feedback, 'sync')">
            Relancer
          </button>
          <button class="button danger" :disabled="actingId === feedback.id" @click="runAction(feedback, 'ignore')">
            Ignorer
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
