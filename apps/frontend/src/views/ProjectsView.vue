<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiFetch } from "../api";

type Feedback = {
  id: string;
  message: string;
  status: string;
  projectName: string;
  createdAt: string;
};

const feedbacks = ref<Feedback[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    const response = await apiFetch<{ feedbacks: Feedback[] }>("/api/projects/feedbacks");
    feedbacks.value = response.feedbacks;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Chargement impossible";
  }
});
</script>

<template>
  <main class="page">
    <h1>Feedback</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
      <p v-if="feedbacks.length === 0">Aucun feedback pour le moment.</p>
      <article v-for="feedback in feedbacks" :key="feedback.id" class="list-row">
        <strong>{{ feedback.projectName }}</strong>
        <span>{{ feedback.message || "Sans message" }}</span>
        <small>{{ feedback.status }} · {{ new Date(feedback.createdAt).toLocaleString() }}</small>
      </article>
    </section>
  </main>
</template>
