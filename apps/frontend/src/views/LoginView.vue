<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();
const session = useSessionStore();

async function submit() {
  error.value = "";
  try {
    await session.login(email.value, password.value);
    await router.push("/projects");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Connexion impossible";
  }
}
</script>

<template>
  <main class="page auth-page">
    <form class="panel" @submit.prevent="submit">
      <h1>Connexion</h1>
      <p v-if="error" class="error">{{ error }}</p>
      <label>Email<input v-model="email" type="email" autocomplete="email" required /></label>
      <label>Mot de passe<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <button class="button" type="submit">Se connecter</button>
    </form>
  </main>
</template>
