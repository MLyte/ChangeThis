<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiFetch } from "../api";

type Site = {
  publicKey: string;
  name: string;
  allowedOrigins: string[];
};

const sites = ref<Site[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    const response = await apiFetch<{ sites: Site[] }>("/api/projects/sites");
    sites.value = response.sites;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Chargement impossible";
  }
});
</script>

<template>
  <main class="page">
    <h1>Paramètres</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
      <h2>Sites connectés</h2>
      <p v-if="sites.length === 0">Aucun site connecté.</p>
      <article v-for="site in sites" :key="site.publicKey" class="list-row">
        <strong>{{ site.name }}</strong>
        <code>{{ site.publicKey }}</code>
        <small>{{ site.allowedOrigins.join(", ") }}</small>
      </article>
    </section>
  </main>
</template>
