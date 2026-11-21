import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTemplate, buildTemplateContext } from "../src/utils/template.js";

const ctx = buildTemplateContext({
  url: "/users/42?page=3", method: "post", baseUrl: "https://app.test/",
  params: { id: "42" }, body: '{"user":{"name":"Ann \\"A\\""}}', count: 5,
});

test("context fields", () => {
  assert.equal(renderTemplate("{{method}} {{path}} {{query.page}} {{params.id}} {{count}}", ctx), "POST /users/42 3 42 5");
  assert.equal(renderTemplate('{"id": {{params.id}}}', ctx), '{"id": 42}');
});

test("json escaping keeps output valid JSON", () => {
  const out = renderTemplate('{"name":"{{body.user.name}}"}', ctx, { jsonEscape: true });
  assert.deepEqual(JSON.parse(out), { name: 'Ann "A"' });
});

test("objects, unknowns and generators", () => {
  assert.equal(renderTemplate("{{body.user}}", ctx), '{"name":"Ann \\"A\\""}');
  assert.equal(renderTemplate("[{{nope}}][{{query.missing}}]", ctx), "[][]");
  assert.match(renderTemplate("{{uuid}}", ctx), /^[0-9a-f-]{36}$/);
  assert.match(renderTemplate("{{now}}", ctx), /^\d{4}-\d\d-\d\dT/);
  assert.equal(renderTemplate("no placeholders", ctx), "no placeholders");
});

test("plain text bodies stay text", () => {
  const textCtx = buildTemplateContext({ url: "/x", body: "ping" });
  assert.equal(renderTemplate('{"echo":"{{body}}"}', textCtx, { jsonEscape: true }), '{"echo":"ping"}');
});

test("form bodies become fields", () => {
  const formCtx = buildTemplateContext({ url: "/x", body: "a=1&b=two" });
  assert.equal(renderTemplate("{{body.b}}", formCtx), "two");
});
