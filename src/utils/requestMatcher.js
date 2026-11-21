// Optional request conditions for a mock: required query params and request body.
// Imported only by injected.js (see the note in siteMatcher.js about shared chunks).

// matchQuery: "page=2&sort=*&debug" — every listed key must be present; a value must
// match exactly unless it is "*" or omitted.
export function matchesQuery(requestUrl, matchQuery, baseUrl) {
  const expected = String(matchQuery || "").trim().replace(/^\?/, "");
  if (!expected) return true;
  let actual;
  try {
    actual = new URL(String(requestUrl), baseUrl).searchParams;
  } catch {
    return false;
  }
  for (const [key, value] of new URLSearchParams(expected)) {
    if (!actual.has(key)) return false;
    if (value !== "" && value !== "*" && !actual.getAll(key).includes(value)) return false;
  }
  return true;
}

function tryParseJson(value) {
  if (typeof value !== "string") return { ok: false };
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

// True when every key/value in `expected` is present in `actual` (recursively).
// Arrays must have the same length and match element by element.
export function isSubset(expected, actual) {
  if (expected === actual) return true;
  if (expected === null || actual === null || typeof expected !== "object" || typeof actual !== "object") {
    return false;
  }
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && expected.length === actual.length &&
      expected.every((item, i) => isSubset(item, actual[i]));
  }
  return Object.keys(expected).every((key) => key in actual && isSubset(expected[key], actual[key]));
}

// requestBody: string | object (already normalised by the caller) | undefined.
export function matchesBody(requestBody, expectedBody) {
  const expectedText = typeof expectedBody === "string" ? expectedBody.trim() : "";
  if (!expectedText) return true;
  if (requestBody === undefined || requestBody === null) return false;

  const expected = tryParseJson(expectedText);
  const actual = typeof requestBody === "string" ? tryParseJson(requestBody) : { ok: true, value: requestBody };
  if (expected.ok && actual.ok) return isSubset(expected.value, actual.value);

  if (typeof requestBody === "string") {
    if (requestBody.trim() === expectedText) return true;
    // Form bodies: "a=1&b=2" matches when all expected pairs are present.
    if (expectedText.includes("=") && !expectedText.includes("{")) {
      const want = new URLSearchParams(expectedText);
      const got = new URLSearchParams(requestBody);
      return [...want].every(([k, v]) => got.getAll(k).includes(v));
    }
  }
  return false;
}
