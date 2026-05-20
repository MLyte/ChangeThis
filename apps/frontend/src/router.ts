import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import ProjectsView from "./views/ProjectsView.vue";
import SettingsView from "./views/SettingsView.vue";
import SignupView from "./views/SignupView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    { path: "/login", component: LoginView },
    { path: "/signup", component: SignupView },
    { path: "/projects", component: ProjectsView },
    { path: "/settings/:section?", component: SettingsView }
  ]
});
