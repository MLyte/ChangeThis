import { defineStore } from "pinia";
import { apiFetch, type Session } from "../api";

export const useSessionStore = defineStore("session", {
  state: () => ({
    loaded: false,
    session: { authenticated: false } as Session
  }),
  actions: {
    async load() {
      this.session = await apiFetch<Session>("/api/auth/session");
      this.loaded = true;
    },
    async login(email: string, password: string) {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await this.load();
    },
    async signup(email: string, password: string) {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await this.load();
    },
    async logout() {
      await apiFetch("/api/auth/logout", { method: "POST" });
      this.session = { authenticated: false };
    }
  }
});
