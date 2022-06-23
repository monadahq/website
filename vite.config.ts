import { defineConfig, loadEnv, PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".");

  return {
    plugins: [vue(), htmlPlugin(env)],
  };
});

/**
 * Create a plugin that replaces parts of the `index.html` with environment variables.
 *
 * For example,
 *
 * ```html
 * <html lang="<%=VITE_LANG%>"></html>
 * ```
 *
 * would be replaced as the following (given that there's a `VITE_LANG=en` environment variable):
 *
 * ```html
 * <html lang="en"></html>
 * ```
 */
function htmlPlugin(env: Record<string, string>): PluginOption {
  return {
    name: "html-transform",
    transformIndexHtml: (html) =>
      html.replace(
        /<%=\s*([a-zA-Z_]+)\s*%>/g,
        (_match, variableName) => env[variableName]
      ),
  };
}
