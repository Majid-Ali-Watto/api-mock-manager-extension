<template>
  <div class="api-detail-page">
    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!api" class="state-msg">
      <Icon name="alert" :size="18" /> API not found.
    </div>

    <template v-else>
      <header class="page-header">
        <div class="page-header-inner">
          <div class="header-info">
            <button @click="closeTab" class="ui-icon-btn" title="Close"><Icon name="arrow-left" /></button>
            <div class="title-block">
              <div class="breadcrumb"><Icon name="folder" :size="12" /> {{ collectionName || "Collection" }}</div>
              <h2 class="api-label">{{ api.label || api.url }}</h2>
            </div>
          </div>
          <div class="header-actions">
            <div class="search-wrap">
              <Icon name="search" :size="13" class="search-icon" />
              <input v-model="searchQuery" placeholder="Search in details" class="ui-input search-input" spellcheck="false" />
            </div>
            <button @click="copyApi" class="ui-icon-btn ui-icon-btn--bordered" title="Copy as JSON"><Icon name="copy" :size="15" /></button>
            <button @click="downloadApi" class="ui-icon-btn ui-icon-btn--bordered" title="Download JSON"><Icon name="download" :size="15" /></button>
            <button @click="deleteApi" class="ui-icon-btn ui-icon-btn--bordered delete-btn" title="Delete"><Icon name="trash" :size="15" /></button>
            <button @click="editApi" class="ui-btn ui-btn--primary"><Icon name="edit" :size="14" /> Edit</button>
          </div>
        </div>
      </header>

      <div class="detail-body">
        <!-- summary -->
        <section class="detail-card summary">
          <div class="summary-line">
            <MethodBadge :method="api.method || 'GET'" />
            <code class="summary-url" v-html="highlight(api.url)"></code>
          </div>
          <div class="chip-row">
            <span :class="['ui-chip', 'ui-chip--mono', statusTone]">{{ effectiveStatus }} {{ statusLabel }}</span>
            <span :class="['ui-chip', api.enabled !== false ? 'ui-chip--success' : '']">
              <Icon :name="api.enabled !== false ? 'check' : 'pause'" :size="11" stroke-width="2.6" />
              {{ api.enabled !== false ? "Enabled" : "Paused" }}
            </span>
            <span v-if="api.delay" class="ui-chip"><Icon name="clock" :size="11" stroke-width="2.4" /> {{ api.delay }} ms</span>
            <span v-if="effectiveMode !== 'mock'" class="ui-chip ui-chip--danger"><Icon name="alert" :size="11" stroke-width="2.4" /> {{ effectiveMode }}</span>
            <span v-if="api.activeVariant" class="ui-chip ui-chip--accent"><Icon name="layers" :size="11" stroke-width="2.4" /> {{ api.activeVariant }}</span>
            <span v-if="api.templated" class="ui-chip ui-chip--accent"><Icon name="zap" :size="11" stroke-width="2.4" /> dynamic</span>
            <span v-if="api.recorded" class="ui-chip"><Icon name="record" :size="9" /> recorded</span>
          </div>
        </section>

        <!-- settings -->
        <section class="detail-card">
          <h4>Settings</h4>
          <dl class="settings-grid">
            <dt>URL match</dt>
            <dd>{{ api.urlMatchType === "regex" ? "Regular expression" : "Auto (exact, contains, wildcard, :params)" }}</dd>
            <dt>Content type</dt>
            <dd><code>{{ typeof api.contentType === "string" ? (api.contentType || "none") : "application/json" }}</code></dd>
            <template v-if="api.matchQuery">
              <dt>Query must have</dt>
              <dd><code>{{ api.matchQuery }}</code></dd>
            </template>
            <template v-if="api.matchBody">
              <dt>Body match</dt>
              <dd>Request body must contain the request payload</dd>
            </template>
            <template v-if="api.templated">
              <dt>Dynamic</dt>
              <dd>Template placeholders are rendered on each request</dd>
            </template>
            <dt>Created</dt>
            <dd>{{ formatDate(api.createdAt) }}</dd>
          </dl>
        </section>

        <!-- variants -->
        <section v-if="api.variants?.length" class="detail-card">
          <h4>Variants</h4>
          <ul class="variant-list">
            <li :class="{ active: !api.activeVariant }">
              <span class="variant-name">Main response</span>
              <span class="ui-chip ui-chip--mono">{{ api.status || 200 }}</span>
              <span v-if="!api.activeVariant" class="active-tag">active</span>
            </li>
            <li v-for="v in api.variants" :key="v.name" :class="{ active: v.name === api.activeVariant }">
              <span class="variant-name">{{ v.name }}</span>
              <span class="ui-chip ui-chip--mono">{{ v.status }}</span>
              <span v-if="v.responseMode && v.responseMode !== 'mock'" class="ui-chip ui-chip--danger">{{ v.responseMode }}</span>
              <span v-if="v.name === api.activeVariant" class="active-tag">active</span>
            </li>
          </ul>
        </section>

        <!-- response headers -->
        <section v-if="api.responseHeaders" class="detail-card">
          <h4>Response headers</h4>
          <pre class="code-block">{{ prettyJson(api.responseHeaders) }}</pre>
        </section>

        <!-- request payload -->
        <section v-if="api.requestPayload && api.method !== 'GET'" class="detail-card"
          :class="{ 'search-match': searchQuery && matchesRequest }">
          <div class="detail-header">
            <h4>Request payload</h4>
            <button @click="downloadPayload('request')" class="ui-btn ui-btn--ghost ui-btn--sm"><Icon name="download" :size="13" /> Download</button>
          </div>
          <pre class="code-block" v-html="highlight(prettyJson(api.requestPayload))"></pre>
        </section>

        <!-- response payload -->
        <section class="detail-card" :class="{ 'search-match': searchQuery && matchesResponse }">
          <div class="detail-header">
            <h4>Response payload</h4>
            <button @click="downloadPayload('response')" class="ui-btn ui-btn--ghost ui-btn--sm"><Icon name="download" :size="13" /> Download</button>
          </div>
          <pre class="code-block" v-html="highlight(prettyJson(api.responsePayload))"></pre>
        </section>

        <div v-if="searchQuery && !hasAnyMatch" class="no-results">
          No results for "{{ searchQuery }}"
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getApiById, deleteApi as deleteApiFromDB } from "../../db/apis.repo";
import { getCollectionById } from "../../db/collections.repo";
import { formatDate, highlightSearchTerm, downloadJson, notifyContentScripts } from "../utils/helpers";
import { toExportApi } from "../utils/apiSchema";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";
import Icon from "./Icon.vue";
import MethodBadge from "./MethodBadge.vue";

const props = defineProps({
  apiId: { type: Number, required: true },
});

const { showToast } = useToast();
const { showConfirm } = useConfirm();

const api = ref(null);
const collectionName = ref("");
const loading = ref(true);
const searchQuery = ref("");

onMounted(async () => {
  try {
    const loaded = await getApiById(props.apiId);
    if (loaded) {
      api.value = loaded;
      const col = await getCollectionById(loaded.collectionId);
      collectionName.value = col?.name || "";
    }
  } finally {
    loading.value = false;
  }
});

function prettyJson(raw) {
  if (!raw || raw === "None") return "None";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function highlight(text) {
  // Always go through highlightSearchTerm: it escapes HTML for v-html.
  return highlightSearchTerm(text, searchQuery.value);
}

function matches(text) {
  if (!searchQuery.value) return true;
  return text?.toLowerCase().includes(searchQuery.value.toLowerCase());
}

const matchesRequest = computed(() => matches(prettyJson(api.value?.requestPayload)));
const matchesResponse = computed(() => matches(prettyJson(api.value?.responsePayload)));

const hasAnyMatch = computed(() => {
  if (!searchQuery.value || !api.value) return true;
  return (
    matches(api.value.label) ||
    matches(api.value.url) ||
    matchesRequest.value ||
    matchesResponse.value
  );
});

const STATUS_TEXT = { 200: "OK", 201: "Created", 204: "No Content", 301: "Moved", 302: "Found", 304: "Not Modified",
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 422: "Unprocessable",
  429: "Too Many Requests", 500: "Server Error", 502: "Bad Gateway", 503: "Unavailable", 504: "Timeout" };

const activeVariantObj = computed(() =>
  api.value?.activeVariant ? (api.value.variants || []).find((v) => v.name === api.value.activeVariant) : null
);
const effectiveStatus = computed(() => activeVariantObj.value?.status || api.value?.status || 200);
const effectiveMode = computed(() => activeVariantObj.value?.responseMode || api.value?.responseMode || "mock");
const statusLabel = computed(() => STATUS_TEXT[effectiveStatus.value] || "");
const statusTone = computed(() => {
  const code = Number(effectiveStatus.value);
  if (code >= 500) return "ui-chip--danger";
  if (code >= 400) return "ui-chip--warning";
  if (code >= 300) return "ui-chip--info";
  return "ui-chip--success";
});

function closeTab() {
  window.close();
}

function editApi() {
  window.location.href =
    chrome.runtime.getURL("index.html") +
    `?action=api-form&mode=edit&apiId=${props.apiId}&collectionId=${api.value.collectionId}`;
}

async function deleteApi() {
  const ok = await showConfirm("Delete this API? This cannot be undone.", {
    confirmLabel: "Delete",
    dangerous: true,
  });
  if (!ok) return;
  await deleteApiFromDB(props.apiId);
  notifyContentScripts();
  window.close();
}

function buildExportJson() {
  return toExportApi(api.value);
}

async function copyApi() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(buildExportJson(), null, 2));
    showToast("API copied as JSON");
  } catch {
    showToast("Failed to copy to clipboard", "error");
  }
}

function downloadApi() {
  const a = api.value;
  downloadJson(
    buildExportJson(),
    `${a.label.replace(/[^a-z0-9]/gi, "_")}_${a.method}_${new Date().toISOString().split("T")[0]}.json`
  );
  showToast("API downloaded as JSON");
}

function downloadPayload(type) {
  const payload = type === "request" ? api.value.requestPayload : api.value.responsePayload;
  if (!payload || payload === "None") {
    showToast(`No ${type} payload to download`, "error");
    return;
  }
  const safeLabel = api.value.label.replace(/[^a-z0-9]/gi, "_");
  const date = new Date().toISOString().split("T")[0];
  try {
    downloadJson(JSON.parse(payload), `${safeLabel}_${type}_${date}.json`);
  } catch {
    const blob = new Blob([payload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${safeLabel}_${type}_${date}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  showToast(`${type} payload downloaded`);
}
</script>

<style scoped>
.api-detail-page {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
}

.state-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 60dvh;
  color: var(--text-2);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.page-header-inner,
.detail-body {
  max-width: 920px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.page-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  padding-bottom: 12px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title-block {
  min-width: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  font-size: 11.5px;
  font-weight: 600;
}

.api-label {
  margin: 1px 0 0;
  overflow: hidden;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.search-wrap {
  position: relative;
  width: 200px;
  margin-right: 4px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}

.search-input {
  height: 30px;
  padding-left: 29px;
  font-size: 12.5px;
}

.delete-btn:hover {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: var(--danger);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 20px;
  padding-bottom: 48px;
}

.detail-card {
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.detail-card.search-match {
  border-color: var(--warning);
  box-shadow: 0 0 0 3px var(--warning-soft);
}

.detail-card h4 {
  margin: 0 0 12px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.summary-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.summary-url {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13.5px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 10px 16px;
  margin: 0;
  font-size: 12.5px;
}

.settings-grid dt {
  color: var(--text-3);
  font-weight: 600;
}

.settings-grid dd {
  margin: 0;
  color: var(--text);
}

.settings-grid code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--surface-3);
  font-size: 12px;
}

.variant-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.variant-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
}

.variant-list li + li {
  border-top: 1px solid var(--border);
}

.variant-list li.active {
  background: var(--accent-soft);
}

.variant-name {
  flex: 1;
  font-weight: 600;
}

.active-tag {
  color: var(--accent-text);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.detail-header h4 {
  margin: 0;
}

.code-block {
  margin: 0;
  padding: 14px 16px;
  max-height: 480px;
  overflow: auto;
  border-radius: var(--radius);
  background: var(--code-bg);
  color: var(--code-text);
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.no-results {
  padding: 24px;
  color: var(--text-3);
  text-align: center;
}
</style>
