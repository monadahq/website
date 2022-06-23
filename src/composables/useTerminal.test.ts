import { describe, expect, test } from "vitest";
import { nextTick } from "vue";
import { useTerminal } from "./useTerminal";

describe("createTerminal", () => {
  test("input is empty", () => {
    const { input } = useTerminal({ commands: [] });

    expect(input.value).toBe("");
  });

  test("input changes", () => {
    const { input, setInput } = useTerminal({ commands: [] });

    setInput("acme");
    expect(input.value).toBe("acme");
  });

  test("suggests commands", () => {
    const { setInput, suggestion } = useTerminal({
      commands: [
        { name: "abc", description: "", handler() {} },
        { name: "dfg", description: "", handler() {} },
      ],
    });

    setInput("a");
    expect(suggestion.value).toBe("abc");

    setInput("d");
    expect(suggestion.value).toBe("dfg");

    setInput("");
    expect(suggestion.value).toBe("");
  });

  test("autocompletes suggestions", () => {
    const { input, setInput, autocompleteSuggestion } = useTerminal({
      commands: [
        { name: "abc", description: "", handler() {} },
        { name: "dfg", description: "", handler() {} },
      ],
    });

    setInput("a");
    autocompleteSuggestion();
    expect(input.value).toBe("abc");

    setInput("d");
    autocompleteSuggestion();
    expect(input.value).toBe("dfg");
  });

  test("executes commands", async () => {
    let abcExecuted = false;
    let dfgExecuted = false;
    const { setInput, execute } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler() {
            abcExecuted = true;
          },
        },
        {
          name: "dfg",
          description: "",
          handler() {
            dfgExecuted = true;
          },
        },
      ],
    });

    setInput("abc");
    await execute();
    await nextTick();
    expect(abcExecuted).toBe(true);
    expect(dfgExecuted).toBe(false);

    setInput("dfg");
    await execute();
    await nextTick();
    expect(dfgExecuted).toBe(true);
  });

  test("appends input commands to the message list", async () => {
    const { setInput, execute, messages } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler(args, context) {
            context.appendOutput("hello world");
          },
        },
      ],
    });

    setInput("abc");
    await execute();
    await nextTick();
    expect(messages.value).toStrictEqual([
      { type: "input", text: "abc", isHtml: false },
      { type: "output", text: "hello world", isHtml: false },
    ]);
  });

  test("navigates through input history", async () => {
    const {
      input,
      setInput,
      execute,
      navigateToNextEntry,
      navigateToPreviousEntry,
    } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler(args, context) {},
        },
      ],
    });

    setInput("abc a");
    await execute();
    setInput("abc b");
    await execute();
    await nextTick();
    expect(input.value).toBe("");

    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc b");

    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc a");

    navigateToNextEntry();
    await nextTick();
    expect(input.value).toBe("abc b");

    navigateToNextEntry();
    await nextTick();
    expect(input.value).toBe("");
  });

  test("history navigation stops at the top", async () => {
    const { input, setInput, execute, navigateToPreviousEntry } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler(args, context) {},
        },
        {
          name: "dfg",
          description: "",
          handler(args, context) {},
        },
      ],
    });

    setInput("abc a");
    await execute();
    setInput("abc b");
    await execute();
    setInput("dfg a");
    await execute();
    setInput("dfg b");
    await execute();

    navigateToPreviousEntry();
    navigateToPreviousEntry();
    navigateToPreviousEntry();
    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc a");

    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc a");

    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc a");
  });

  test("history navigation stops at the bottom", async () => {
    const {
      input,
      setInput,
      execute,
      navigateToPreviousEntry,
      navigateToNextEntry,
    } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler(args, context) {},
        },
        {
          name: "dfg",
          description: "",
          handler(args, context) {},
        },
      ],
    });

    setInput("abc a");
    await execute();
    setInput("abc b");
    await execute();

    navigateToPreviousEntry();
    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc a");

    navigateToNextEntry();
    navigateToNextEntry();
    await nextTick();
    expect(input.value).toBe("");

    navigateToNextEntry();
    await nextTick();
    expect(input.value).toBe("");
  });

  test("history navigation resets when commands are executed", async () => {
    const { input, setInput, execute, navigateToPreviousEntry } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler(args, context) {},
        },
        {
          name: "dfg",
          description: "",
          handler(args, context) {},
        },
      ],
    });

    setInput("abc a");
    await execute();
    setInput("abc b");
    await execute();
    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc b");

    setInput("abc c");
    await execute();
    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc c");
  });

  test("history skips continuous duplicated entries", async () => {
    const { input, setInput, execute, navigateToPreviousEntry } = useTerminal({
      commands: [
        {
          name: "abc",
          description: "",
          handler(args, context) {},
        },
        {
          name: "dfg",
          description: "",
          handler(args, context) {},
        },
      ],
    });

    setInput("abc a");
    await execute();
    setInput("abc b");
    await execute();
    setInput("abc b");
    await execute();

    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc b");

    navigateToPreviousEntry();
    await nextTick();
    expect(input.value).toBe("abc a");
  });
});
