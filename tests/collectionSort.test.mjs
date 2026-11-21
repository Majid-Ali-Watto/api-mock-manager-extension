import { test } from "node:test";
import assert from "node:assert/strict";
import { useCollectionSort } from "../src/popup/composables/useCollectionSort.js";

const cols = [
  { name: "Zeta paused pinned", enabled: false, pinned: true, createdAt: 6 },
  { name: "Beta active", enabled: true, createdAt: 5 },
  { name: "Alpha paused", enabled: false, createdAt: 4 },
  { name: "Delta active pinned", enabled: true, pinned: true, createdAt: 3 },
  { name: "Gamma no flag", createdAt: 2 },
  { name: "Charlie active pinned", enabled: true, pinned: true, createdAt: 1 },
];

test("pinned active first, then active, then pinned paused, then paused (by name)", () => {
  const { sortCollections } = useCollectionSort();
  assert.deepEqual(sortCollections(cols).map((c) => c.name), [
    "Charlie active pinned", "Delta active pinned", "Beta active", "Gamma no flag", "Zeta paused pinned", "Alpha paused",
  ]);
});

test("same grouping when sorting by date (newest first within a group)", () => {
  const { sortCollections, toggleCollectionSort } = useCollectionSort();
  toggleCollectionSort();
  assert.deepEqual(sortCollections(cols).map((c) => c.name), [
    "Delta active pinned", "Charlie active pinned", "Beta active", "Gamma no flag", "Zeta paused pinned", "Alpha paused",
  ]);
});
