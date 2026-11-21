function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUrlForMatch(url, baseUrl) {
  const urlString = String(url || "").trim();
  const raw = urlString.split("?")[0];
  try {
    const resolved = baseUrl ? new URL(urlString, baseUrl) : new URL(urlString);
    return {
      full: `${resolved.origin}${resolved.pathname}`,
      path: resolved.pathname,
      raw,
    };
  } catch {
    return {
      full: raw,
      path: raw.startsWith("/") ? raw : `/${raw}`,
      raw,
    };
  }
}

function matchesWildcard(value, pattern) {
  const regex = new RegExp(`^${escapeRegExp(pattern).replace(/\\\*/g, ".*")}$`);
  return regex.test(value);
}

// Path parameters: "/users/:id" matches "/users/42" and captures { id: "42" }.
const PATH_PARAM = /\/:([A-Za-z_][A-Za-z0-9_]*)/g;

function hasPathParams(path) {
  return /\/:[A-Za-z_]/.test(path);
}

function compileParamPattern(value) {
  const names = [];
  let source = "";
  let last = 0;
  for (const match of value.matchAll(PATH_PARAM)) {
    source += escapeRegExp(value.slice(last, match.index)) + "/([^/]+)";
    names.push(match[1]);
    last = match.index + match[0].length;
  }
  source += escapeRegExp(value.slice(last));
  return { regex: new RegExp(`^${source.replace(/\\\*/g, ".*")}/?$`), names };
}

function isAbsoluteUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(String(value || "").trim());
}

// Returns captured params ({} when the mock has none) or null when it doesn't match.
export function extractPathParams(requestUrl, mockUrl, baseUrl) {
  try {
    const request = normalizeUrlForMatch(requestUrl, baseUrl);
    const mock = normalizeUrlForMatch(mockUrl, baseUrl);
    if (!hasPathParams(mock.path)) return {};
    const absolute = isAbsoluteUrl(mockUrl);
    const { regex, names } = compileParamPattern(absolute ? mock.full : mock.path);
    const found = regex.exec(absolute ? request.full : request.path);
    if (!found) return null;
    return Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(found[i + 1])]));
  } catch {
    return null;
  }
}

export function matchUrl(requestUrl, mockUrl, matchType, baseUrl) {
  // An empty pattern would otherwise "contain"-match every request on every site.
  if (!String(mockUrl || "").trim()) return false;

  if (matchType === "regex") {
    try {
      return new RegExp(mockUrl).test(requestUrl);
    } catch {
      return false;
    }
  }

  try {
    const request = normalizeUrlForMatch(requestUrl, baseUrl);
    const mock = normalizeUrlForMatch(mockUrl, baseUrl);

    if (
      request.full === mock.full ||
      request.path === mock.path ||
      request.raw === mock.raw
    ) {
      return true;
    }

    if (hasPathParams(mock.path)) {
      return extractPathParams(requestUrl, mockUrl, baseUrl) !== null;
    }

    if (mock.raw.includes("*")) {
      return (
        matchesWildcard(request.full, mock.full) ||
        matchesWildcard(request.path, mock.path) ||
        matchesWildcard(request.raw, mock.raw)
      );
    }

    // A root path ("/") is a substring of every path, so only match it by full
    // URL (scoped to its origin), never by bare path/raw substring.
    const isRootPath = mock.path === "/";
    if (
      request.full.includes(mock.full) ||
      (!isRootPath && request.path.includes(mock.path)) ||
      (!isRootPath && request.raw.includes(mock.raw))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

