import { files } from "../files";
import { CommandDefinition } from "./useTerminal";
import { useDark, useToggle } from "@vueuse/core";

export function useCommands(): CommandDefinition[] {
  const dark = useDark({});
  const toggleDark = useToggle(dark);

  const commands: CommandDefinition[] = [
    {
      name: "ls",
      description: "list directory contents",
      handler(args, context) {
        context.appendOutput(
          `<div class="grid grid-cols-4 gap-4">${Object.keys(files)
            .map((file) => `<div>${file}</div>`)
            .join("")}</div>`,
          { isHtml: true }
        );
      },
    },
    {
      name: "help",
      description: "display the available commands",
      handler(args, context) {
        context.appendOutput(
          commands
            .map((command) => `${command.name} - ${command.description}`)
            .sort()
            .join("\n")
        );
      },
    },
    {
      name: "clear",
      description: "clear the terminal screen",
      handler(args, context) {
        context.clearMessages();
      },
    },
    {
      name: "echo",
      description: "write arguments to the standard output",
      handler(values: string[], context) {
        context.appendOutput(values.join(" "));
      },
    },
    {
      name: "cat",
      description: "concatenate files and print on the standard output",
      availableArguments: Object.keys(files),
      handler([file]: string[], context) {
        if (!file) {
          context.appendOutput(
            'You must specify the filename. For example, <code>"cat file"</code>',
            { isHtml: true }
          );
          return;
        }

        const contents = files[file];
        if (!contents) {
          context.appendOutput(`cat: ${file}: No such file or directory`);
          return;
        }

        context.appendOutput(contents, { isHtml: true });
      },
    },
    {
      name: "theme",
      availableArguments: ["dark", "light"],
      description: "toggle the terminal theme",
      handler([theme], context) {
        if (theme === "dark") {
          toggleDark(true);
        } else if (theme === "light") {
          toggleDark(false);
        } else if (!theme) {
          toggleDark();
        } else {
          context.appendOutput(
            `Unrecognised theme "${theme}". Please, use "theme", "theme dark", or "theme light".`
          );
          return;
        }

        if (dark.value) {
          context.appendOutput("Switched to dark theme.");
        } else {
          context.appendOutput("Switched to light theme.");
        }
      },
    },
  ];

  return commands;
}
