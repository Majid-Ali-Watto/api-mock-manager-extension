// Dynamic response bodies: replaces {{placeholders}} when a mock has `templated: true`.
//   {{params.id}}   path parameter from a "/users/:id" mock URL
//   {{query.page}}  query string value         {{body.user.name}}  JSON request body field
//   {{method}} {{url}} {{path}}                 {{now}} (ISO time) {{timestamp}} (ms)
//   {{uuid}} {{random}} (0-999999)              {{count}} (times this mock answered on the page)
// Imported only by injected.js.

const PLACEHOLDER = /\{\{\s*([A-Za-z_$][\w$]*(?:\.[\w$-]+)*)\s*\}\}/g;

function lookup(path, source) {
  return path.reduce((value, key) => (value == null ? undefined : value[key]), source);
}

function makeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function resolve(name, ctx) {
  const [head, ...rest] = name.split(".");
  switch (head) {
    case "now": return new Date().toISOString();
    case "timestamp": return Date.now();
    case "uuid": return makeUuid();
    case "random": return Math.floor(Math.random() * 1000000);
    case "count": return ctx.count ?? 0;
    case "method": return ctx.method ?? "";
    case "url": return ctx.url ?? "";
    case "path": return ctx.path ?? "";
    case "params": return lookup(rest, ctx.params || {});
    case "query": return lookup(rest, ctx.query || {});
    case "body": return rest.length ? lookup(rest, ctx.body) : ctx.body;
    default: return undefined;
  }
}

// jsonEscape: escape string values so they can sit inside a JSON string literal.
export function renderTemplate(template, ctx = {}, { jsonEscape = false } = {}) {
  if (typeof template !== "string" || !template.includes("{{")) return template;
  return template.replace(PLACEHOLDER, (_, name) => {
    const value = resolve(name, ctx);
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    const text = String(value);
    return jsonEscape ? JSON.stringify(text).slice(1, -1) : text;
  });
}

// Builds the template context for a request.
export function buildTemplateContext({ url, method, baseUrl, params, body, count }) {
  let parsed = null;
  try {
    parsed = new URL(String(url), baseUrl);
  } catch {
    // leave url-derived fields empty
  }
  let parsedBody = body;
  if (typeof body === "string") {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      // "a=1&b=2" form bodies become fields; other text stays as-is.
      parsedBody = /^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(body.trim())
        ? Object.fromEntries(new URLSearchParams(body))
        : body;
    }
  }
  return {
    method: String(method || "GET").toUpperCase(),
    url: parsed ? parsed.href : String(url || ""),
    path: parsed ? parsed.pathname : "",
    query: parsed ? Object.fromEntries(parsed.searchParams) : {},
    params: params || {},
    body: parsedBody,
    count,
  };
}
