#!/usr/bin/env node
/**
 * Contract guard: every API path used by the frontend must exist in the Postman collection.
 *
 *   node scripts/api-contract/check-api-contract.mjs            # check, exit 1 on unknown paths
 *   node scripts/api-contract/check-api-contract.mjs --report   # also print the full usage table
 *   node scripts/api-contract/check-api-contract.mjs --json     # machine-readable inventory
 *
 * Reads docs/api-contract.json (built by extract-contract.mjs from the collection) and scans the
 * source of the mobile and admin apps for API path strings. A path is any string or template
 * literal whose first segment is one of the backend's top-level routes. `${...}` segments become
 * path parameters and query strings are ignored, then paths are compared by shape (parameter names
 * do not matter). Paths listed in not-in-collection.json are reported but do not fail the check:
 * they are known gaps that the backend team must add to the collection or remove.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const args = new Set(process.argv.slice(2));

const contract = JSON.parse(fs.readFileSync(path.join(repoRoot, "docs/api-contract.json"), "utf8"));
const allowFile = path.join(here, "not-in-collection.json");
const allowList = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, "utf8")) : [];

export const shape = (p) => p.replace(/:[^/]+/g, ":");
const contractShapes = new Map();
for (const e of contract.endpoints) {
  const key = shape(e.path);
  if (!contractShapes.has(key)) contractShapes.set(key, []);
  contractShapes.get(key).push(e.method);
}

// Top-level route segments of the backend (from the collection). Bare "reels" and "search" are
// only counted when passed directly to an API helper, because the plain words appear elsewhere.
const ROOTS = [...new Set(contract.endpoints.map((e) => e.path.split("/")[0]))];
const BARE_OK_IN_CALL = new Set(contract.endpoints.filter((e) => !e.path.includes("/")).map((e) => e.path));

const APPS = [
  { app: "mobile", dirs: ["apps/gully-fame-mobile/app", "apps/gully-fame-mobile/src"] },
  { app: "admin", dirs: ["apps/gully-fame-admin/app", "apps/gully-fame-admin/lib", "apps/gully-fame-admin/components"] },
];

function listFiles(dir) {
  const abs = path.join(repoRoot, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name.startsWith(".")) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(rel));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Turns a string/template literal body into a normalized API path, or null if it is not one. */
export function toApiPath(literal) {
  let s = literal.trim();
  // App navigation routes ("/auth/signin", "./termsandconditions") are not API calls: no API path in
  // either app starts with a slash (the clients add the base URL), so skip them.
  if (s.startsWith("/") || s.startsWith("./") || s.startsWith("(")) return null;
  s = s.replace(/^\$\{[^}]*(BASE_URL|API_BASE_URL|baseUrl)[^}]*\}/, "").replace(/^\/+/, "");
  // A `${...}` glued to the end of a word (no slash before it) builds a query string: cut there.
  s = s.replace(/([^/])\$\{.*$/, "$1");
  s = s.split("?")[0].replace(/\/+$/, "");
  if (!s) return null;
  const segments = s.split("/").map((seg) => (/\$\{/.test(seg) ? ":" : seg));
  if (!ROOTS.includes(segments[0])) return null;
  if (segments.some((seg) => seg !== ":" && !/^[A-Za-z0-9_.-]+$/.test(seg))) return null;
  return segments.join("/");
}

const METHOD_HINTS = [
  [/apiGet\s*(<[^>]*>)?\s*\(\s*$/, "GET"],
  [/apiPost\s*(<[^>]*>)?\s*\(\s*$/, "POST"],
  [/apiPut\s*(<[^>]*>)?\s*\(\s*$/, "PUT"],
  [/apiPatch\s*(<[^>]*>)?\s*\(\s*$/, "PATCH"],
  [/apiDelete\s*(<[^>]*>)?\s*\(\s*$/, "DELETE"],
  [/apiClient\.get\s*(<[^>]*>)?\s*\(\s*$/, "GET"],
  [/apiClient\.post\s*(<[^>]*>)?\s*\(\s*$/, "POST"],
  [/apiClient\.put\s*(<[^>]*>)?\s*\(\s*$/, "PUT"],
  [/apiClient\.patch\s*(<[^>]*>)?\s*\(\s*$/, "PATCH"],
  [/apiClient\.delete\s*(<[^>]*>)?\s*\(\s*$/, "DELETE"],
  [/['"](GET|POST|PUT|PATCH|DELETE)['"]\s*,\s*$/, null],
];

const HELPERS = { apiGet: "GET", apiPost: "POST", apiPut: "PUT", apiPatch: "PATCH", apiDelete: "DELETE" };

/** Finds `helper<...multi-line generic...>(` immediately before the literal. */
function helperCallBefore(source, index) {
  const window = source.slice(Math.max(0, index - 600), index);
  const re = /\b(apiGet|apiPost|apiPut|apiPatch|apiDelete|apiClient\.(?:get|post|put|patch|delete)|fetchPage)\b/g;
  let last = null;
  for (const m of window.matchAll(re)) last = m;
  if (!last) return null;
  let i = last.index + last[0].length;
  const text = window;
  while (/\s/.test(text[i] ?? "")) i += 1;
  if (text[i] === "<") {
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "<") depth += 1;
      else if (text[i] === ">" && text[i - 1] !== "=") { depth -= 1; if (depth === 0) { i += 1; break; } }
    }
  }
  while (/\s/.test(text[i] ?? "")) i += 1;
  if (text[i] !== "(") return null;
  if (text.slice(i + 1).trim() !== "") return null;
  const name = last[1];
  if (name === "fetchPage") return "GET";
  if (name.startsWith("apiClient.")) return name.split(".")[1].toUpperCase();
  return HELPERS[name];
}

function methodFor(source, index, literalEnd) {
  const helper = helperCallBefore(source, index);
  if (helper) return helper;
  const before = source.slice(Math.max(0, index - 80), index);
  for (const [re, m] of METHOD_HINTS) {
    const hit = before.match(re);
    if (hit) return m || hit[1];
  }
  // `method: "PUT"` in an options object near the literal (request({ url, method }) or fetch(url, {method})).
  const around = source.slice(Math.max(0, index - 200), Math.min(source.length, literalEnd + 300));
  const opt = around.match(/method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/);
  if (opt) return opt[1];
  // `const endpoint = '...'` followed by helper('METHOD', endpoint)
  const after = source.slice(literalEnd, Math.min(source.length, literalEnd + 400));
  const call = after.match(/\(\s*['"](GET|POST|PUT|PATCH|DELETE)['"]\s*,\s*(endpoint|url|path)\b/);
  if (call) return call[1];
  return "?";
}

const LITERAL = /`((?:\\.|[^`\\])*)`|'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g;

/** Blanks out comments (keeping newlines, so line numbers stay right). */
export function stripComments(source) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += n ?? ""; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; out += c; i += 1; continue; }
    if (c === "/" && n === "/") {
      while (i < source.length && source[i] !== "\n") { out += " "; i += 1; }
      continue;
    }
    if (c === "/" && n === "*") {
      out += "  ";
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) { out += source[i] === "\n" ? "\n" : " "; i += 1; }
      out += "  ";
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Text of the function that contains `index` (from the closest preceding declaration). */
function enclosingFunction(source, index) {
  const decl = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+\w+|(?:^|\n)\s*(?:export\s+)?const\s+\w+\s*=\s*(?:async\s*)?\(/g;
  let start = 0;
  let next = source.length;
  for (const m of source.matchAll(decl)) {
    if (m.index <= index) start = m.index;
    else { next = m.index; break; }
  }
  return source.slice(start, next);
}

/** Top-level keys of the object literal that starts at `open` (index of "{"). */
function objectKeys(text, open) {
  if (text[open] !== "{") return [];
  let depth = 0;
  let end = open;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  const inner = text.slice(open + 1, end);
  const keys = [];
  let d = 0;
  let token = "";
  for (const ch of inner + ",") {
    if ("{[(".includes(ch)) d += 1;
    if ("}])".includes(ch)) d -= 1;
    if (ch === "," && d === 0) {
      const t = token.trim();
      const key = t.match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*:/) || t.match(/^([A-Za-z_$][\w$]*)$/);
      if (key) keys.push(key[1]);
      else if (/^\.\.\./.test(t)) {
        // spread of a conditional object: ...(cond ? { a: 1 } : {})
        for (const inner2 of t.matchAll(/\{\s*([A-Za-z_$][\w$]*)\s*[:,}]/g)) keys.push(inner2[1]);
      }
      token = "";
    } else token += ch;
  }
  return keys;
}

/** Query-param and body field names a call site sends (heuristic, for review). */
export function sentFields(source, literalStart, literalEnd, literalBody) {
  const query = new Set();
  const body = new Set();
  const qs = literalBody.split("?")[1];
  if (qs) for (const part of qs.split("&")) { const k = part.split("=")[0]; if (/^\w+$/.test(k)) query.add(k); }

  const after = source.slice(literalEnd, literalEnd + 600);
  // apiPost(path, { a, b }) / makeRequest(method, endpoint, { a }) -> body object right after the path
  const direct = after.match(/^\s*,\s*\{/);
  // Only the code leading up to this call inside its function (at most ~900 chars back): bodies and
  // appends are built just before the call, and this keeps neighbouring calls from leaking in.
  const whole = enclosingFunction(source, literalStart);
  const fnStart = source.indexOf(whole);
  const fn = source.slice(Math.max(fnStart, literalStart - 900), literalStart);
  const optionsOpen = direct ? literalEnd + after.indexOf("{") : -1;
  if (optionsOpen >= 0) {
    const keys = objectKeys(source, optionsOpen);
    const isOptions = keys.some((k) => ["params", "query", "body", "formData", "headers", "timeout", "auth", "skipAuth"].includes(k));
    if (isOptions) {
      // Only the options object itself (balanced braces), never the code that follows it.
      let depth = 0;
      let close = optionsOpen;
      for (let i = optionsOpen; i < source.length; i++) {
        if (source[i] === "{") depth += 1;
        else if (source[i] === "}") { depth -= 1; if (depth === 0) { close = i; break; } }
      }
      const opts = source.slice(optionsOpen, close + 1);
      const pm = opts.match(/(?:params|query)\s*:\s*\{/);
      if (pm) objectKeys(opts, opts.indexOf("{", pm.index)).forEach((k) => query.add(k));
      const bm = opts.match(/body\s*:\s*\{/);
      if (bm) objectKeys(opts, opts.indexOf("{", bm.index)).forEach((k) => body.add(k));
    } else keys.forEach((k) => body.add(k));
  }
  // A body passed directly as an object literal is the whole body: nothing else to collect.
  const directBody = optionsOpen >= 0 && body.size > 0;
  // `const body = { ... }` / `body.x = ...` in the same function
  const bodyDecl = directBody ? null : fn.match(/const\s+(?:body|requestBody)\s*(?::[^=]+)?=\s*\{/);
  if (bodyDecl) objectKeys(fn, fn.indexOf("{", bodyDecl.index)).forEach((k) => body.add(k));
  if (!directBody) for (const m of fn.matchAll(/\b(?:body|requestBody)\.(\w+)\s*=/g)) body.add(m[1]);
  // URLSearchParams / FormData appends in the same function
  for (const m of fn.matchAll(/(\w+)\.append\(\s*['"](\w+)['"]/g)) {
    if (/form/i.test(m[1])) body.add(m[2]);
    else if (/param|query|search/i.test(m[1])) query.add(m[2]);
  }
  // `{ params: {...} }` options passed later in the same function (e.g. after a multi-line generic)
  if (!query.size) {
    // `{ params: {...} }` given after a multi-line argument list of the same call.
    const tail = source.slice(literalEnd, literalEnd + 300);
    const stop = tail.search(/\)\s*;|\n\s*(?:export\s+)?(?:const|function|async)\b/);
    const own = stop >= 0 ? tail.slice(0, stop) : tail;
    const pm = own.match(/params\s*:\s*\{/);
    if (pm) objectKeys(own, own.indexOf("{", pm.index)).forEach((k) => query.add(k));
  }
  return { query: [...query], body: [...body] };
}

/**
 * Lookup maps of API paths (`const adminPath: Record<K, string> = { audio: 'admin/audio', ... }`),
 * so templates like `${adminPath[kind]}/${id}` can be expanded to every path they can produce.
 */
function pathMaps(source) {
  const maps = new Map();
  for (const m of source.matchAll(/const\s+(\w+)\s*(?::[^=]+)?=\s*\{([^}]*)\}/g)) {
    const values = [...m[2].matchAll(/:\s*['"]([^'"]+)['"]/g)].map((v) => v[1]).filter((v) => toApiPath(v));
    if (values.length) maps.set(m[1], values);
  }
  return maps;
}

export function scanSource(file, rawSource) {
  const source = stripComments(rawSource);
  const maps = pathMaps(source);
  const uses = [];
  for (const m of source.matchAll(/`\$\{(\w+)\[[^\]]+\]\}([^`]*)`/g)) {
    const values = maps.get(m[1]);
    if (!values) continue;
    const method = methodFor(source, m.index, m.index + m[0].length);
    for (const value of values) {
      const p = toApiPath(`${value}${m[2]}`);
      if (p) uses.push({ file, line: source.slice(0, m.index).split("\n").length, method, path: p, sentQuery: [], sentBody: [] });
    }
  }
  for (const m of source.matchAll(LITERAL)) {
    const body = m[1] ?? m[2] ?? m[3] ?? "";
    // Skip import specifiers and route paths of the app itself.
    const before = source.slice(Math.max(0, m.index - 30), m.index);
    if (/(from|import|require\()\s*$/.test(before)) continue;
    const p = toApiPath(body);
    if (!p) continue;
    const method = methodFor(source, m.index, m.index + m[0].length);
    if (!p.includes("/") && !(BARE_OK_IN_CALL.has(p) && method !== "?")) continue;
    const fields = sentFields(source, m.index, m.index + m[0].length, body);
    uses.push({ file, line: source.slice(0, m.index).split("\n").length, method, path: p, sentQuery: fields.query, sentBody: fields.body });
  }
  return uses;
}

const results = [];
for (const { app, dirs } of APPS) {
  for (const dir of dirs) {
    for (const file of listFiles(dir)) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
      for (const use of scanSource(file, source)) results.push({ app, ...use });
    }
  }
}

const contractByKey = new Map(contract.endpoints.map((e) => [`${e.method} ${shape(e.path)}`, e]));
const stripOptional = (k) => k.replace(/ \(optional\)$/, "").replace(/ \(file\)$/, "");
for (const r of results) {
  const e = contractByKey.get(`${r.method} ${shape(r.path)}`);
  if (!e) continue;
  const q = new Set(e.query.map(stripOptional));
  const b = new Set(e.body.fields.map((f) => stripOptional(f).split(".")[0]));
  r.extraQuery = r.sentQuery.filter((k) => !q.has(k));
  r.extraBody = e.bodyOmittedInCollection ? [] : r.sentBody.filter((k) => !b.has(k));
}

const allowShapes = new Map(allowList.map((a) => [`${a.method} ${shape(a.path)}`, a]));
for (const r of results) {
  const methods = contractShapes.get(shape(r.path));
  r.inCollection = !!methods;
  r.methodOk = !methods ? false : r.method === "?" ? null : methods.includes(r.method);
  r.allowed = allowShapes.get(`${r.method} ${shape(r.path)}`) || allowShapes.get(`* ${shape(r.path)}`) || null;
}

const fieldWarnings = results.filter((r) => (r.extraQuery && r.extraQuery.length) || (r.extraBody && r.extraBody.length));
const unknown = results.filter((r) => (!r.inCollection || r.methodOk === false) && !r.allowed);
const known = results.filter((r) => (!r.inCollection || r.methodOk === false) && r.allowed);
const usedShapes = new Set(results.filter((r) => r.inCollection).map((r) => `${r.method} ${shape(r.path)}`));
const usedPathShapes = new Set(results.filter((r) => r.inCollection).map((r) => shape(r.path)));
const unused = contract.endpoints.filter(
  (e) => !usedShapes.has(`${e.method} ${shape(e.path)}`) && !(usedPathShapes.has(shape(e.path)) && results.some((r) => shape(r.path) === shape(e.path) && r.method === "?"))
);

if (args.has("--json")) {
  // writeSync: process.exit() would otherwise cut off a large output piped to another program.
  fs.writeSync(1, `${JSON.stringify({ results, unknown, known, unused }, null, 2)}\n`);
  process.exit(unknown.length ? 1 : 0);
}

if (args.has("--report")) {
  console.log("| App | File:line | Method | Path used | In collection |");
  console.log("|---|---|---|---|---|");
  for (const r of results) {
    const status = r.inCollection ? (r.methodOk === false ? "path yes, METHOD NO" : "yes") : "NO";
    console.log(`| ${r.app} | ${r.file.replace(/^apps\//, "")}:${r.line} | ${r.method} | \`${r.path}\` | ${status}${r.allowed ? " (known gap)" : ""} |`);
  }
  console.log("");
}

const distinct = (rows) => new Set(rows.map((r) => `${r.method} ${shape(r.path)}`)).size;
console.log(`API contract check (${contract.endpoints.length} endpoints in the collection)`);
console.log(`  call sites scanned:            ${results.length}`);
console.log(`  distinct endpoints used:       ${distinct(results)}`);
console.log(`  matching the collection:       ${distinct(results.filter((r) => r.inCollection && r.methodOk !== false))}`);
console.log(`  known gaps (allow-listed):     ${distinct(known)}`);
console.log(`  collection endpoints unused:   ${unused.length}`);
if (fieldWarnings.length) {
  console.log("\nField names sent that the collection does not list (review; not a failure):");
  for (const r of fieldWarnings) {
    const parts = [];
    if (r.extraQuery.length) parts.push(`query: ${r.extraQuery.join(", ")}`);
    if (r.extraBody.length) parts.push(`body: ${r.extraBody.join(", ")}`);
    console.log(`  ${r.method} ${r.path}  ${parts.join(" | ")}  <- ${r.file}:${r.line}`);
  }
}
if (known.length) {
  console.log("\nKnown gaps (in not-in-collection.json):");
  for (const r of known) console.log(`  ${r.method} ${r.path}  <- ${r.file}:${r.line}  (${r.allowed.reason})`);
}
if (unknown.length) {
  console.log("\nFAIL: paths not in the collection:");
  for (const r of unknown) {
    const why = r.inCollection ? `method ${r.method} not in collection for this path` : "path not in collection";
    console.log(`  ${r.method} ${r.path}  <- ${r.file}:${r.line}  (${why})`);
  }
  process.exit(1);
}
console.log("\nOK: every API path used by the apps is in the collection.");
