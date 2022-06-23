import { createApp } from "vue";
import "./index.css";
import App from "./App.vue";
import { setupAnalytics } from "./analytics";

createApp(App).mount("#app");

setupAnalytics(import.meta.env.VITE_AMPLITUDE_API_KEY);
