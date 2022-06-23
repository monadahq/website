<script setup lang="ts">
import { track } from "@amplitude/analytics-browser";
import Terminal from "./components/Terminal.vue";

function trackCommandExecuted(command: string) {
  track("commandExecuted", {
    command,
  });
}
</script>

<template>
  <Terminal class="flex-1" @command-executed="trackCommandExecuted" />
</template>
