#!/usr/bin/env node
/**
 * Builds a SANITIZED API contract from the Postman collection.
 *
 *   node scripts/api-contract/extract-contract.mjs "<path to collection.json>"
 *
 * Writes docs/api-contract.json (read by check-api-contract.mjs) and docs/api-contract.md.
 * Only structure is kept: folder, method, path, query/body field NAMES and the auth level.
 * No values are ever copied: no tokens, passwords, ids, example bodies or header values.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const collectionPath = process.argv[2];
if (!collectionPath || !fs.existsSync(collectionPath)) {
  console.error("Usage: node scripts/api-contract/extract-contract.mjs <collection.json>");
  process.exit(2);
}

const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

const camel = (s) => s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
// A literal id baked into an example request (e.g. user/abc123/follow or a Mongo ObjectId).
const looksLikeLiteralId = (seg) =>
  /^[0-9a-f]{24}$/i.test(seg) || /^(?=.*\d)(?=.*[a-z])[a-z0-9]{4,}$/i.test(seg) || /^\d+$/.test(seg);

function normalisePath(rawUrl, variables) {
  let raw = String(rawUrl || "").replace(/^\{\{\s*BASE_URL\s*\}\}/, "");
  raw = raw.replace(/^https?:\/\/[^/]+\/v1\/api\//, "");
  const [pathPart] = raw.split("?");
  let literalId = false;
  const segments = pathPart
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      const variable = seg.match(/^\{\{\s*([A-Za-z0-9_]+)\s*\}\}$/);
      if (variable) return `:${camel(variable[1])}`;
      if (seg.startsWith(":")) return seg;
      if (looksLikeLiteralId(seg)) {
        literalId = true;
        return ":id";
      }
      return seg;
    });
  return { path: segments.join("/"), literalId, variables };
}

function bodyFields(body) {
  if (!body || !body.mode) return { kind: "none", fields: [] };
  if (body.mode === "formdata" || body.mode === "urlencoded") {
    return {
      kind: body.mode,
      // Disabled fields are alternatives the request can send (e.g. `logo` vs `splash`): keep them, marked optional.
      fields: (body[body.mode] || []).map(
        (f) => `${f.key}${f.type === "file" ? " (file)" : ""}${f.disabled ? " (optional)" : ""}`
      ),
    };
  }
  if (body.mode === "raw") {
    const text = String(body.raw || "").trim();
    if (!text) return { kind: "raw", fields: [] };
    const jsonish = text.replace(/"\{\{[^}]+\}\}"/g, '"x"').replace(/\{\{[^}]+\}\}/g, "0");
    try {
      const parsed = JSON.parse(jsonish);
      const keys = (obj, prefix = "") =>
        obj && typeof obj === "object" && !Array.isArray(obj)
          ? Object.keys(obj).flatMap((k) => {
              const v = obj[k];
              const name = prefix + k;
              return v && typeof v === "object" && !Array.isArray(v) ? [name, ...keys(v, `${name}.`)] : [name];
            })
          : [];
      return { kind: "json", fields: keys(parsed) };
    } catch {
      return { kind: "raw", fields: [...new Set([...text.matchAll(/"([A-Za-z_][\w]*)"\s*:/g)].map((m) => m[1]))] };
    }
  }
  return { kind: body.mode, fields: [] };
}

function authLevel(request, folderPath) {
  const bearer = request.auth && request.auth.type === "bearer" ? request.auth.bearer || [] : [];
  const tokenRef = bearer.map((b) => String(b.value || "")).join(" ");
  const header = (request.header || []).find((h) => String(h.key).toLowerCase() === "authorization");
  const ref = `${tokenRef} ${header ? String(header.value || "") : ""}`;
  if (/ADMIN_TOKEN/.test(ref)) return "admin";
  if (/USER_TOKEN/.test(ref)) return "user";
  if (request.auth && request.auth.type === "bearer") {
    // A literal token was pasted in: ignore it and infer from the folder.
    return folderPath[0] && /admin/i.test(folderPath[0]) ? "admin" : "user";
  }
  if (request.auth && request.auth.type === "noauth") return "none";
  return "none";
}

// Names only from a saved example response: top-level keys and the keys of `data`.
function responseShape(item) {
  const ok = (item.response || []).find((r) => Number(r.code) >= 200 && Number(r.code) < 300);
  if (!ok || !ok.body) return null;
  try {
    const parsed = JSON.parse(ok.body);
    const data = parsed && parsed.data;
    const sample = Array.isArray(data) ? data[0] : data;
    return {
      top: parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
      dataIsArray: Array.isArray(data),
      dataKeys: sample && typeof sample === "object" ? Object.keys(sample).slice(0, 40) : [],
    };
  } catch {
    return null;
  }
}

const entries = [];
function walk(items, folderPath) {
  for (const item of items) {
    if (item.item) {
      walk(item.item, [...folderPath, item.name]);
      continue;
    }
    const req = item.request || {};
    const url = typeof req.url === "string" ? { raw: req.url } : req.url || {};
    const { path: p, literalId } = normalisePath(url.raw);
    entries.push({
      folder: folderPath.join(" / "),
      name: item.name,
      method: String(req.method || "GET").toUpperCase(),
      path: p,
      query: (url.query || []).map((q) => (q.disabled ? `${q.key} (optional)` : q.key)),
      body: bodyFields(req.body),
      auth: authLevel(req, folderPath),
      literalId,
      response: responseShape(item),
    });
  }
}
walk(collection.item, []);

// Collapse duplicates: same method + same path SHAPE (path-parameter names do not matter, so
// user/:myUserId/follow and user/:otherUserId/follow are one endpoint). Merge field names.
export const pathShape = (p) => p.replace(/:[^/]+/g, ":");
const byKey = new Map();
for (const e of entries) {
  const key = `${e.method} ${pathShape(e.path)}`;
  const prev = byKey.get(key);
  if (!prev) {
    byKey.set(key, { ...e, variants: 1 });
    continue;
  }
  // Keep the most descriptive parameter names (a named variable beats a literal-id example).
  if (prev.literalId && !e.literalId) prev.path = e.path;
  prev.variants += 1;
  prev.query = [...new Set([...prev.query, ...e.query])];
  prev.body = { kind: prev.body.kind !== "none" ? prev.body.kind : e.body.kind, fields: [...new Set([...prev.body.fields, ...e.body.fields])] };
  prev.literalId = prev.literalId && e.literalId;
  prev.response = prev.response || e.response;
}
// Requests that act for a signed-in account but carry no token in the collection: flagged, not changed.
const PUBLIC_PREFIXES = ["public/", "auth/", "payments/razorpay/webhook"];
const PUBLIC_ADMIN = new Set(["admin/login", "admin/register", "admin/forgotPassword", "admin/verifyOtp", "admin/resendOtp"]);
for (const e of byKey.values()) {
  const isPublicRead =
    e.method === "GET" && /^admin\/(aboutUs|privacyPolicy|termAndCondition|competitionRules|contactUs|faqs)/.test(e.path);
  e.authOmitted =
    e.auth === "none" && !PUBLIC_PREFIXES.some((pre) => e.path.startsWith(pre)) && !PUBLIC_ADMIN.has(e.path) && !isPublicRead;
  e.bodyOmitted = ["POST", "PUT", "PATCH"].includes(e.method) && e.body.kind === "none" && /profile$/.test(e.path);
}
const contract = [...byKey.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

fs.mkdirSync(path.join(repoRoot, "docs"), { recursive: true });
fs.writeFileSync(
  path.join(repoRoot, "docs/api-contract.json"),
  JSON.stringify(
    {
      source: path.basename(collectionPath),
      generatedFrom: "Postman collection (structure only; no values)",
      requestsInCollection: entries.length,
      endpoints: contract.map(({ folder, name, method, path: p, query, body, auth, literalId, variants, response, authOmitted, bodyOmitted }) => ({
        folder, name, method, path: p, query, body, auth, authOmittedInCollection: !!authOmitted, bodyOmittedInCollection: !!bodyOmitted, fromLiteralIdExample: literalId, variants, response,
      })),
    },
    null,
    2
  ) + "\n"
);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const lines = [
  "# API contract (from the Postman collection)",
  "",
  `Generated by \`scripts/api-contract/extract-contract.mjs\` from \`${path.basename(collectionPath)}\`.`,
  `${entries.length} requests in the collection, ${contract.length} unique endpoints after collapsing duplicates.`,
  "Paths are relative to `API_BASE_URL` (production: `https://api.gullyfame.com/v1/api/`).",
  "`:name` marks a path parameter. Only field NAMES are listed; no values, tokens or ids are copied.",
  "",
  "| Folder | Method | Path | Query params | Body fields | Auth | Notes |",
  "|---|---|---|---|---|---|---|",
  ...contract.map((e) => {
    const notes = [];
    if (e.variants > 1) notes.push(`${e.variants} requests collapsed`);
    if (e.fromLiteralIdExample) notes.push("only seen with a hard-coded id");
    if (e.body.kind === "formdata") notes.push("multipart");
    if (e.path.startsWith("payments/razorpay/webhook")) notes.push("server-to-server: never call from a client");
    if (e.authOmitted) notes.push("collection sends no token here although the route acts for a signed-in user/admin");
    if (e.bodyOmitted) notes.push("collection has no example body, so body fields cannot be checked");
    return `| ${esc(e.folder)} | ${e.method} | \`${esc(e.path)}\` | ${esc(e.query.join(", ")) || "-"} | ${esc(e.body.fields.join(", ")) || "-"} | ${e.auth} | ${esc(notes.join("; ")) || ""} |`;
  }),
  "",
];
fs.writeFileSync(path.join(repoRoot, "docs/api-contract.md"), lines.join("\n"));
console.log(`requests: ${entries.length}  unique endpoints: ${contract.length}  (admin ${contract.filter((e) => e.auth === "admin").length}, user ${contract.filter((e) => e.auth === "user").length}, none ${contract.filter((e) => e.auth === "none").length})`);
