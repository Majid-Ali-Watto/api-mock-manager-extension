function escapeRegExp(value) {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
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

export function matchUrl(requestUrl, mockUrl, matchType, baseUrl) {
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

    if (mock.raw.includes("*")) {
      return (
        matchesWildcard(request.full, mock.full) ||
        matchesWildcard(request.path, mock.path) ||
        matchesWildcard(request.raw, mock.raw)
      );
    }

    if (
      request.full.includes(mock.full) ||
      request.path.includes(mock.path) ||
      request.raw.includes(mock.raw)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
