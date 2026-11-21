import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSitePatterns, matchesSite, normalizeSitePattern } from "../src/utils/siteMatcher.js";

test("normalizes patterns", () => {
  assert.equal(normalizeSitePattern("https://App.test:8080/path"), "app.test:8080");
  assert.equal(normalizeSitePattern("https://*.foo.com/x"), "*.foo.com");
  assert.equal(normalizeSitePattern("bad_host!"), "");
});

test("parses lists; * means all sites", () => {
  assert.deepEqual(parseSitePatterns("a.com, *.b.com\nlocalhost:3000 a.com"), { sites: ["a.com", "*.b.com", "localhost:3000"], invalid: [] });
  assert.deepEqual(parseSitePatterns("a.com *").sites, []);
  assert.deepEqual(parseSitePatterns("ok.com bad!").invalid, ["bad!"]);
});

test("matches sites", () => {
  const sites = ["*.example.com", "localhost:3000", "app.test"];
  assert.ok(matchesSite("https://example.com/", sites));
  assert.ok(matchesSite("https://a.b.example.com/", sites));
  assert.ok(!matchesSite("https://evilexample.com/", sites));
  assert.ok(matchesSite("http://localhost:3000/x", sites));
  assert.ok(!matchesSite("http://localhost:5173/", sites));
  assert.ok(matchesSite("https://app.test:8080/", sites));
  assert.ok(!matchesSite("about:blank", sites));
  assert.ok(matchesSite("https://anything.com", []));
});
