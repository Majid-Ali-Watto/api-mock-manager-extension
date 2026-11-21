<template>
  <div v-if="isOpen" class="ui-overlay" @click="emit('close')">
    <aside class="ui-sheet log-panel" @click.stop>
      <div class="ui-sheet-header">
        <h3><Icon name="log" /> Request log</h3>
        <div class="log-header-actions">
          <button @click="clearLog" class="ui-btn ui-btn--sm ui-btn--ghost" title="Clear log" :disabled="!entries.length">
            <Icon name="broom" :size="13" /> Clear
          </button>
          <button @click="emit('close')" class="ui-icon-btn" title="Close"><Icon name="x" /></button>
        </div>
      </div>
      <div class="log-toolbar">
        <div class="filter-wrap">
          <Icon name="filter" :size="13" class="filter-icon" />
          <input v-model="filter" class="ui-input log-filter" placeholder="Filter by URL, label or collection" spellcheck="false" />
        </div>
        <span class="log-count">{{ filtered.length }} / {{ entries.length }}</span>
      </div>
      <p class="log-note">Mocked requests from all tabs, newest first · memory only (last 200)</p>

      <div v-if="filtered.length === 0" class="log-empty">
        <span class="empty-icon"><Icon name="log" :size="20" /></span>
        <strong>{{ entries.length ? "No matches" : "No mocked requests yet" }}</strong>
        <span>{{ entries.length ? "Try a different filter." : "Enable a mock and use the page — requests it answers show up here." }}</span>
      </div>
      <ul v-else class="log-list">
        <li v-for="(entry, i) in filtered" :key="entry.time + '-' + i" class="log-entry">
          <div class="log-line">
            <span class="log-time">{{ formatTime(entry.time) }}</span>
            <MethodBadge :method="entry.method || 'GET'" />
            <span :class="['ui-chip', 'ui-chip--mono', statusClass(entry)]">{{ statusLabel(entry) }}</span>
            <span class="log-url" :title="entry.url">{{ entry.url }}</span>
          </div>
          <div class="log-meta">
            <span class="log-label">{{ entry.label }}</span>
            <template v-if="entry.collectionName"><span class="sep">·</span>{{ entry.collectionName }}</template>
            <template v-if="entry.variant"><span class="sep">·</span><Icon name="layers" :size="10" /> {{ entry.variant }}</template>
          </div>
        </li>
      </ul>
    </aside>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import MethodBadge from "./MethodBadge.vue";
import Icon from "./Icon.vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const LIMIT = 200;
const entries = ref([]);
const filter = ref("");
const hasExtensionApi = typeof chrome !== "undefined" && !!chrome?.runtime?.sendMessage;

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  const list = [...entries.value].reverse();
  if (!q) return list;
  return list.filter((e) =>
    [e.url, e.label, e.collectionName, e.method].some((v) => String(v || "").toLowerCase().includes(q))
  );
});

function formatTime(time) {
  return new Date(time).toLocaleTimeString();
}

function statusLabel(entry) {
  if (entry.mode && entry.mode !== "mock") return entry.mode;
  return entry.status || "—";
}

function statusClass(entry) {
  if (entry.mode && entry.mode !== "mock") return "ui-chip--danger";
  if (entry.status >= 500) return "ui-chip--danger";
  if (entry.status >= 400) return "ui-chip--warning";
  if (entry.status >= 300) return "ui-chip--info";
  return "ui-chip--success";
}

async function loadLog() {
  if (!hasExtensionApi) return;
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_REQUEST_LOG" });
    entries.value = Array.isArray(response?.log) ? response.log : [];
  } catch {
    entries.value = [];
  }
}

async function clearLog() {
  entries.value = [];
  if (hasExtensionApi) {
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_REQUEST_LOG" });
    } catch {
      // ignore
    }
  }
}

function onMessage(message) {
  if (message.type === "REQUEST_LOGGED" && message.entry) {
    entries.value.push(message.entry);
    if (entries.value.length > LIMIT) entries.value.splice(0, entries.value.length - LIMIT);
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!hasExtensionApi) return;
    if (open) {
      loadLog();
      chrome.runtime.onMessage.addListener(onMessage);
    } else {
      chrome.runtime.onMessage.removeListener(onMessage);
    }
  }
);

onUnmounted(() => {
  if (hasExtensionApi) chrome.runtime.onMessage.removeListener(onMessage);
});
</script>

<style scoped>
.log-panel {
  width: min(460px, 100%);
}

.log-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.log-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 0;
}

.filter-wrap {
  position: relative;
  flex: 1;
}

.filter-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}

.log-filter {
  height: 30px;
  padding-left: 30px;
  font-size: 12.5px;
}

.log-count,
.log-note {
  color: var(--text-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.log-note {
  margin: 6px 14px 6px;
}

.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-2);
  font-size: 12.5px;
}

.log-empty strong {
  color: var(--text);
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: 4px;
  border-radius: 11px;
  background: var(--surface-3);
  color: var(--text-3);
}

.log-list {
  margin: 0;
  padding: 0 0 12px;
  list-style: none;
}

.log-entry {
  padding: 9px 14px;
  border-top: 1px solid var(--border);
}

.log-entry:hover {
  background: var(--surface-2);
}

.log-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.log-time {
  flex-shrink: 0;
  color: var(--text-3);
  font-family: var(--font-mono);
  font-size: 11px;
}

.log-url {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding-left: 2px;
  color: var(--text-3);
  font-size: 11px;
}

.log-label {
  color: var(--text-2);
  font-weight: 600;
}

.sep {
  margin: 0 2px;
}
</style>
