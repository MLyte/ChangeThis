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
    await session.signup(email.value, password.value);
    await router.push("/settings");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Inscription impossible";
  }
}
</script>

<template>
  <main class="page auth-page">
    <form class="panel" @submit.prevent="submit">
      <h1>Créer un accès</h1>
      <p v-if="error" class="error">{{ error }}</p>
      <label>Email<input v-model="email" type="email" autocomplete="email" required /></label>
      <label>Mot de passe<input v-model="password" type="password" autocomplete="new-password" minlength="8" required /></label>
      <button class="button" type="submit">Créer l'espace</button>
    </form>
  </main>
</template>
