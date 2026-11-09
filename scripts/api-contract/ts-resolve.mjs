/**
 * Lets `node --test` run the admin's TypeScript sources directly (Node strips the types itself).
 * The admin code imports siblings without an extension ("./config"); this hook adds ".ts".
 *
 *   node --test --import ./scripts/api-contract/ts-resolve.mjs apps/gully-fame-admin/lib/__tests__/*.test.mts
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]sx?$/.test(specifier) &&
      context.parentURL
    ) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});
