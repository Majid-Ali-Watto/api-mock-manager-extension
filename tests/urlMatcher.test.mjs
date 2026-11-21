import { test } from "node:test";
import assert from "node:assert/strict";
import { matchUrl, extractPathParams } from "../src/utils/urlMatcher.js";

const base = "https://app.test/page";
const auto = (req, mock) => matchUrl(req, mock, "auto", base);

test("exact, relative and query-insensitive matches", () => {
  assert.ok(auto("https://api.example.com/users", "https://api.example.com/users"));
  assert.ok(auto("/api/users?page=1", "/api/users"));
  assert.ok(auto("https://other.com/api/users", "/api/users"));
});

test("wildcards", () => {
  assert.ok(auto("https://api.example.com/users/123", "https://api.example.com/users/*"));
  assert.ok(auto("/api/users/5/posts", "*/users/*"));
  assert.ok(!auto("https://api.example.com/users", "https://api.example.com/users/*"));
});

test("empty and root patterns don't match everything", () => {
  assert.ok(!auto("https://bank.com/login", ""));
  assert.ok(!auto("https://bank.com/login", "   "));
  assert.ok(!auto("https://other.com/x", "/"));
  assert.ok(auto("https://app.test/x", "/"));
});

test("regex match type", () => {
  assert.ok(matchUrl("/api/v2/items", "/api/v\\d+/items", "regex", base));
  assert.ok(!matchUrl("/api/items", "([", "regex", base));
});

test("path params", () => {
  assert.ok(auto("/users/42", "/users/:id"));
  assert.ok(!auto("/users", "/users/:id"));
  assert.ok(!auto("/users/42/extra", "/users/:id"));
  assert.deepEqual(extractPathParams("/users/42/posts/7", "/users/:userId/posts/:postId", base), { userId: "42", postId: "7" });
  assert.deepEqual(extractPathParams("https://api.x.com/a/b%20c", "https://api.x.com/a/:name", base), { name: "b c" });
  assert.equal(extractPathParams("https://evil.com/a/1", "https://api.x.com/a/:id", base), null);
  assert.deepEqual(extractPathParams("/plain", "/plain", base), {});
});
