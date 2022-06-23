import { createApp } from "vue";
import "./index.css";
import App from "./App.vue";
import { setupAnalytics } from "./analytics";

createApp(App).mount("#app");

setupAnalytics("0dd9d988f0137cbb9d3bd337a00fe257");
