// Kept separate from urlMatcher.js on purpose: injected.js (a classic content script)
// imports urlMatcher.js, and sharing a module with other entries would make Rollup
// split it into a chunk that injected.js would have to `import` (not allowed there).
// ---- Site scoping -------------------------------------------------------
// A collection's `sites` list limits which pages its mocks are sent to.
// Patterns: "*" (all sites), "example.com", "*.example.com" (domain + subdomains),
// "localhost:3000" (specific port). Full URLs are reduced to their host.

export function normalizeSitePattern(input) {
  let value = String(input || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "*") return "*";
  if (value.includes("://")) {
    try {
      value = new URL(value.replace("://*.", "://wildcard-placeholder.")).host
        .replace("wildcard-placeholder.", "*.");
    } catch {
      return "";
    }
  }
  value = value.split(/[/?#]/)[0];
  return /^(\*\.)?[a-z0-9.-]+(:\d{1,5})?$/.test(value) ? value : "";
}

// Parses user input ("a.com, *.b.com\nlocalhost:3000") into a clean, de-duplicated list.
// Returns { sites, invalid } where an empty `sites` array means "all sites".
export function parseSitePatterns(input) {
  const sites = [];
  const invalid = [];
  for (const part of String(input || "").split(/[\s,]+/)) {
    if (!part) continue;
    const pattern = normalizeSitePattern(part);
    if (!pattern) invalid.push(part);
    else if (!sites.includes(pattern)) sites.push(pattern);
  }
  return { sites: sites.includes("*") ? [] : sites, invalid };
}

export function matchesSite(pageUrl, sites) {
  if (!Array.isArray(sites) || sites.length === 0) return true;
  let page;
  try {
    page = new URL(pageUrl);
  } catch {
    return false;
  }
  const hostname = page.hostname.toLowerCase();
  return sites.some((pattern) => {
    if (pattern === "*") return true;
    const [patternHost, patternPort] = String(pattern).split(":");
    if (patternPort && patternPort !== page.port) return false;
    if (patternHost.startsWith("*.")) {
      const base = patternHost.slice(2);
      return hostname === base || hostname.endsWith(`.${base}`);
    }
    return hostname === patternHost;
  });
}
