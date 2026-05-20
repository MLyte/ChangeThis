<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useSessionStore } from "./stores/session";

const session = useSessionStore();

onMounted(() => {
  void session.load();
});
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand" to="/">ChangeThis CRAW</RouterLink>
    <nav>
      <RouterLink to="/projects">Feedback</RouterLink>
      <RouterLink to="/settings">Paramètres</RouterLink>
      <RouterLink v-if="!session.session.authenticated" to="/login">Connexion</RouterLink>
      <button v-else class="link-button" @click="session.logout()">Déconnexion</button>
    </nav>
  </header>
  <RouterView />
</template>
