import { MaybeRef } from "@vueuse/core";
import {
  ref,
  computed,
  Ref,
  unref,
  watchEffect,
  watch,
  DeepReadonly,
} from "vue";

/**
 * The context passed to the command handlers.
 */
export interface CommandContext {
  appendOutput(text: string, options?: { isHtml?: boolean }): void;
  clearMessages(): void;
  isHalted: DeepReadonly<Ref<boolean>>;
}

/**
 * The definition of a command.
 */
export interface CommandDefinition {
  name: string;
  description: string;
  availableArguments?: string[];
  handler(args: string[], context: CommandContext): Promise<void> | void;
}

/**
 * The properties that a terminal accepts.
 */
export interface TerminalProps {
  commands: MaybeRef<CommandDefinition[]>;
  onOutputAppended?: () => void;
}

/**
 * Represents a message in the terminal output.
 */
export interface TerminalMessage {
  /**
   * Whether the text comes from the user input or from a command's output.
   */
  type: "input" | "output";

  /**
   * The message text.
   */
  text: string;

  /**
   * Whether the text is HTML or raw text.
   */
  isHtml: boolean;
}

/**
 * The terminal interface.
 */
export interface UseTerminalResponse extends CommandContext {
  /**
   * The user input.
   */
  input: Ref<string>;

  /**
   * The suggested command, based on the current user input.
   */
  suggestion: DeepReadonly<Ref<string>>;

  /**
   * The message list.
   */
  messages: DeepReadonly<Ref<TerminalMessage[]>>;

  /**
   * Helper function that sets the user input.
   */
  setInput(input: string): void;

  /**
   * Autocompletes the user input with the current suggested text.
   */
  autocompleteSuggestion(): void;

  /**
   * Navigates to the previous entry in the history.
   */
  navigateToPreviousEntry(): void;

  /**
   * Navigates to the next entry in the history.
   */
  navigateToNextEntry(): void;

  /**
   * Executes the current user input, and resets the input.
   */
  execute(): Promise<void>;

  /**
   * Stops the current running command.
   */
  haltExecution(): void;

  /**
   * Whether there's a command currently running.
   */
  isRunning: DeepReadonly<Ref<boolean>>;

  historyEntries: DeepReadonly<Ref<string[]>>;
}

/**
 * Retrieve the command and the following arguments from the given text.
 *
 * For example, "cat README.md" would return `{ command: "cat", args: ["README.md"] }`.
 */
function parseInput(text: string) {
  const [command, ...args] = text.split(" ");
  return { command, args };
}

/**
 * Creates a terminal reactive object.
 */
export function useTerminal(props: TerminalProps): UseTerminalResponse {
  // Represents the user input.
  const inputText = ref("");

  // Lists all the possible suggestions based on the name of the commands, and it's possible arguments.
  const suggestions = computed(() => {
    return unref(props.commands)
      .flatMap((command) => [
        command.name,
        ...(command.availableArguments?.map(
          (argument) => `${command.name} ${argument}`
        ) ?? []),
      ])
      .sort();
  });

  // The current suggested text, based on the user input.
  const suggestion = computed(() => {
    const text = inputText.value.trim();
    if (!text) {
      return "";
    }

    const command = suggestions.value.find((command) =>
      command.startsWith(text)
    );
    if (!command) {
      return "";
    }

    return command;
  });

  // The message list.
  const messages = ref<TerminalMessage[]>([]);

  /**
   * Appends a message to the end of the list.
   */
  function appendMessage(
    text: string,
    options: {
      type: "input" | "output";
      isHtml: boolean;
    }
  ) {
    messages.value = [
      ...messages.value,
      {
        type: options.type,
        text,
        isHtml: options.isHtml,
      },
    ];
  }

  // The history of previous user inputs.
  const historyEntries = ref<string[]>([]);

  // The current displayed history entry index.
  //
  // "-1" means no history entry.
  const historyIndex = ref(-1);

  /**
   * Navigates to the previous history entry.
   */
  function navigateToPreviousEntry() {
    if (historyIndex.value < historyEntries.value.length - 1) {
      historyIndex.value += 1;
    }
  }

  /**
   * Navigates to the next history entry.
   */
  function navigateToNextEntry() {
    if (historyIndex.value > -1) {
      historyIndex.value -= 1;
    }
  }

  // Overwrite the user input whenever the history index changes.
  watchEffect(() => {
    inputText.value = historyEntries.value[historyIndex.value] ?? "";
  });

  const isRunning = ref(false);
  const isHalted = ref(false);
  function haltExecution() {
    isHalted.value = true;

    if (!isRunning.value) {
      appendMessage("", { type: "input", isHtml: false });
    }
  }

  // Call the `onOutputAppended` prop whenever the message list changes.
  watch(messages, () => {
    props.onOutputAppended?.();
  });

  const context: CommandContext = {
    appendOutput(text, options) {
      appendMessage(text, {
        type: "output",
        isHtml: options?.isHtml ?? false,
      });
    },
    clearMessages() {
      messages.value = [];
    },
    isHalted,
  };

  return {
    input: inputText,
    suggestion,
    messages,

    setInput(input) {
      inputText.value = input;
    },
    autocompleteSuggestion() {
      if (suggestion.value) {
        inputText.value = suggestion.value;
      }
    },

    navigateToPreviousEntry,
    navigateToNextEntry,

    async execute() {
      if (isRunning.value) {
        return;
      }

      const input = inputText.value.trim();

      appendMessage(input, {
        type: "input",
        isHtml: false,
      });

      inputText.value = "";

      if (input) {
        // Do not save an entry to the history if the last input is exactly the same as the new input.
        if (input !== historyEntries.value[0]) {
          historyEntries.value = [input, ...historyEntries.value];
        }
        historyIndex.value = -1;

        // Execute the command.
        const { command, args } = parseInput(input);
        const commandDefinition = unref(props.commands).find(
          (commandDefinition) => commandDefinition.name === command
        );
        if (!commandDefinition) {
          context.appendOutput(`sh: command not found: ${command}`, {
            isHtml: false,
          });
          return;
        }

        try {
          isRunning.value = true;
          isHalted.value = false;
          await commandDefinition.handler(args, context);
        } finally {
          isRunning.value = false;
        }
      }
    },
    haltExecution,
    isRunning,
    historyEntries,

    ...context,
  };
}
