// Single source for the shape of an API mock when exported or imported.
import { HttpMethods, ResponseModes, ContentTypes } from "../../types/models";

const MODE_VALUES = ResponseModes.map((m) => m.value);
const TYPE_VALUES = ContentTypes.map((t) => t.value);

function asText(value) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function sanitizeVariants(variants) {
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((v) => v && typeof v === "object" && String(v.name || "").trim())
    .map((v) => {
      const status = Number(v.status);
      return {
        name: String(v.name).trim(),
        status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : 200,
        responsePayload: asText(v.responsePayload),
        ...(TYPE_VALUES.includes(v.contentType) ? { contentType: v.contentType } : {}),
        ...(MODE_VALUES.includes(v.responseMode) ? { responseMode: v.responseMode } : {}),
      };
    });
}

export function toExportApi(api) {
  return {
    label: api.label,
    method: api.method,
    url: api.url,
    status: api.status,
    requestPayload: api.requestPayload,
    responsePayload: api.responsePayload,
    responseHeaders: api.responseHeaders || "",
    delay: api.delay || 0,
    urlMatchType: api.urlMatchType || "auto",
    matchQuery: api.matchQuery || "",
    matchBody: api.matchBody === true,
    responseMode: api.responseMode || "mock",
    contentType: typeof api.contentType === "string" ? api.contentType : "application/json",
    templated: api.templated === true,
    variants: Array.isArray(api.variants) ? api.variants : [],
    activeVariant: api.activeVariant || "",
    enabled: api.enabled,
    createdAt: api.createdAt,
    ...(api.description ? { description: api.description } : {}),
  };
}

// Whitelists imported API fields so foreign keys (e.g. `id`) can't collide with
// existing records and payloads stay stored as JSON strings. Returns null if invalid.
export function sanitizeImportedApi(apiData) {
  if (!apiData || typeof apiData !== "object") return null;
  const url = typeof apiData.url === "string" ? apiData.url.trim() : "";
  const method = String(apiData.method || "").toUpperCase();
  if (!url || !HttpMethods.includes(method)) return null;
  const status = Number(apiData.status);
  const delay = Number(apiData.delay);
  const variants = sanitizeVariants(apiData.variants);
  const activeVariant = variants.some((v) => v.name === apiData.activeVariant) ? apiData.activeVariant : "";
  return {
    label: asText(apiData.label) || url,
    method,
    url,
    status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : 200,
    requestPayload: asText(apiData.requestPayload),
    responsePayload: asText(apiData.responsePayload),
    responseHeaders: asText(apiData.responseHeaders),
    delay: Number.isFinite(delay) && delay > 0 ? delay : 0,
    urlMatchType: ["auto", "regex"].includes(apiData.urlMatchType) ? apiData.urlMatchType : "auto",
    matchQuery: typeof apiData.matchQuery === "string" ? apiData.matchQuery.trim() : "",
    matchBody: apiData.matchBody === true,
    responseMode: MODE_VALUES.includes(apiData.responseMode) ? apiData.responseMode : "mock",
    contentType: TYPE_VALUES.includes(apiData.contentType) ? apiData.contentType : "application/json",
    templated: apiData.templated === true,
    variants,
    activeVariant,
    enabled: apiData.enabled !== false,
    createdAt: Number(apiData.createdAt) || Date.now(),
    ...(apiData.description ? { description: asText(apiData.description) } : {}),
  };
}
