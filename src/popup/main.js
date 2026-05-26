import { createApp } from "vue";
import App from "./App.vue";

const action = new URLSearchParams(window.location.search).get("action");
if (action === "collection" || action === "api-view" || action === "api-form") {
  document.body.style.overflow = "auto";
}

createApp(App).mount("#app");
