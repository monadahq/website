<script setup lang="ts">
import {
  computed,
  nextTick,
  reactive,
  ref,
  toRefs,
  watch,
  watchEffect,
} from "vue";
import { useEventListener } from "@vueuse/core";
import { useTerminal } from "../composables/useTerminal";
import { useCommands } from "../composables/commands";

const emit = defineEmits<{
  (event: "commandExecuted", command: string): void;
}>();

const inputElement = ref<HTMLInputElement>();

/**
 * Focus on the input element and make it visible on the view.
 */
function focusOnInput() {
  inputElement.value?.focus();
  inputElement.value?.scrollIntoView();
}

/**
 * Focus on the console input (if there's no selected text).
 *
 * If the user selected text, we won't change the focus so the user can copy contents from the website.
 */
function focusOnInputIfNoSelection() {
  if (getSelection()?.toString() === "") {
    focusOnInput();
  }
}

// Create a terminal object and make it reactive (so all of the references in the terminal are usable in the template without having to access the proxy objects).
const commands = useCommands();
const terminal = reactive(
  useTerminal({
    commands,
    onOutputAppended() {
      // Scroll to the bottom each time output is appended to the console.
      nextTick(() => {
        scrollTo(0, document.body.scrollHeight);
      });
    },
  })
);

/**
 * Handle some terminal-like behavior every time a user presses a key while focus is on the input.
 */
function onKeyDown(event: KeyboardEvent) {
  // Autocomplete suggestions when tab is pressed.
  // Skip the default behavior which changes the focus.
  if (event.code === "Tab") {
    event.preventDefault();
    terminal.autocompleteSuggestion();
  }
  // Autocomplete suggestions when right arrow is pressed (if the cursor is on the last character of the input).
  else if (event.code === "ArrowRight") {
    const { target } = event;
    if (
      target instanceof HTMLInputElement &&
      target.selectionStart === terminal.input.length
    ) {
      terminal.autocompleteSuggestion();
    }
  }
  // Navigate through input history.
  else if (event.code === "ArrowUp") {
    event.preventDefault();
    terminal.navigateToPreviousEntry();
  }
  // Navigate through input history.
  else if (event.code === "ArrowDown") {
    event.preventDefault();
    terminal.navigateToNextEntry();
  }
}

// When the terminal stops running a command, focus on the input again.
// This is necessary because the input disappears upon running a command.
watch(
  () => terminal.isRunning,
  (isRunning) => {
    if (!isRunning) {
      nextTick(() => {
        focusOnInputIfNoSelection();
      });
    }
  }
);

// Add some terminal-like behavior (even if the focus isn't on the input).
useEventListener("keydown", (event) => {
  // Focus on the input when pressing any key.
  if (event.target !== inputElement.value && !event.metaKey) {
    focusOnInput();
  }

  // Stop the current command execution.
  if (event.code === "KeyC" && event.ctrlKey) {
    terminal.haltExecution();
  }
});

// The suggestion that appears in gray behind the input.
// Since we're using monospaced fonts, we can just cut from the beginning of the suggested text as many characters as the current user input. That will allow displaying the suggested text behind
// the user input, without worrying about annoying overlapping artifacts.
//
// So, if the user input is "mon" and the suggested text is "monada", this reference will contain
// the value "   ada".
const suggestionText = computed(() => {
  return terminal.suggestion
    .substring(terminal.input.length)
    .padStart(terminal.suggestion.length, " ");
});

function executeCommand() {
  const command = terminal.input;
  terminal.execute();
  emit("commandExecuted", command);
}
</script>

<template>
  <div
    class="w-full p-4 text-sm font-mono whitespace-pre-wrap"
    @click="focusOnInputIfNoSelection"
  >
    <form @submit.prevent="executeCommand">
      <div
        v-for="message of terminal.messages"
        class="w-full flex items-center px-2 py-1.5"
      >
        <span
          class="pr-2 select-none"
          :class="{ hidden: message.type === 'output' }"
          >$</span
        >
        <div class="w-full" v-if="message.isHtml" v-html="message.text" />
        <span v-else>{{ message.text }}</span>
      </div>

      <div
        v-if="!terminal.isRunning"
        class="w-full flex items-center px-2 py-1.5"
      >
        <span class="pr-2 select-none">$</span>
        <div class="relative flex-1">
          <span
            class="absolute inset-0 w-full text-gray-500 dark:text-gray-400"
          >
            {{ suggestionText }}
          </span>
          <input
            ref="inputElement"
            class="z-10 bg-transparent w-full focus:outline-none"
            v-model="terminal.input"
            @keydown="onKeyDown"
            autocomplete="off"
            autocapitalize="none"
            autofocus
          />
        </div>
      </div>
    </form>
  </div>
</template>
