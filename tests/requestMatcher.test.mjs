import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesQuery, matchesBody, isSubset } from "../src/utils/requestMatcher.js";

const base = "https://app.test/";

test("query conditions", () => {
  assert.ok(matchesQuery("/a?page=2&x=1", "page=2", base));
  assert.ok(matchesQuery("/a?page=2", "?page=*", base));
  assert.ok(matchesQuery("/a?debug", "debug", base));
  assert.ok(!matchesQuery("/a?page=3", "page=2", base));
  assert.ok(!matchesQuery("/a", "page", base));
  assert.ok(matchesQuery("/a", "", base));
});

test("JSON body subset", () => {
  assert.ok(matchesBody('{"user":{"id":1,"name":"a"},"x":2}', '{"user":{"id":1}}'));
  assert.ok(!matchesBody('{"user":{"id":2}}', '{"user":{"id":1}}'));
  assert.ok(matchesBody({ a: [1, 2] }, '{"a":[1,2]}'));
  assert.ok(!matchesBody({ a: [1, 2, 3] }, '{"a":[1,2]}'));
  assert.ok(matchesBody(undefined, ""));
  assert.ok(!matchesBody(undefined, '{"a":1}'));
});

test("text and form bodies", () => {
  assert.ok(matchesBody("  hello ", "hello"));
  assert.ok(matchesBody("a=1&b=2&c=3", "b=2&a=1"));
  assert.ok(!matchesBody("a=1", "a=2"));
});

test("isSubset primitives", () => {
  assert.ok(isSubset(1, 1));
  assert.ok(!isSubset(1, "1"));
  assert.ok(!isSubset({ a: 1 }, null));
});
