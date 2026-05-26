<template>
  <div class="api-detail-page">
    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!api" class="state-msg">API not found.</div>

    <div v-else class="api-detail-card">
      <!-- header -->
      <div class="page-header">
        <div class="header-info">
          <span class="collection-tag">{{ collectionName }}</span>
          <h2 class="api-label">{{ api.label }}</h2>
          <div class="header-actions">
            <div class="badges">
              <span :class="['method-badge', api.method?.toLowerCase()]">{{ api.method }}</span>
              <span class="status-code">{{ api.status }}</span>
              <span v-if="api.delay" class="delay-badge" title="Response delay">⏱ {{ api.delay }}ms</span>
              <span :class="['enabled-badge', api.enabled !== false ? 'enabled' : 'disabled']">
                {{ api.enabled !== false ? '✓ Enabled' : '⏸ Disabled' }}
              </span>
            </div>
            <div class="badges">
              <button @click="editApi" class="action-btn edit-btn">✏️ Edit</button>
              <button @click="deleteApi" class="action-btn delete-btn">🗑️ Delete</button>
              <button @click="copyApi" class="action-btn">📋 Copy JSON</button>
              <button @click="downloadApi" class="action-btn">💾 Download</button>
              <input v-model="searchQuery" placeholder="Search in details…" class="search-input" />
            </div>
          </div>

        </div>



      </div>

      <div class="detail-body">
        <!-- basic info -->
        <section class="detail-section">
          <h4>Basic Information</h4>
          <div class="detail-row">
            <span class="detail-label">URL</span>
            <span class="detail-value code" v-html="highlight(api.url)"></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">URL Match</span>
            <span class="detail-value">{{ api.urlMatchType || 'auto' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created</span>
            <span class="detail-value">{{ formatDate(api.createdAt) }}</span>
          </div>
        </section>

        <!-- response headers -->
        <section v-if="api.responseHeaders" class="detail-section">
          <h4>Response Headers</h4>
          <div class="json-container">
            <pre>{{ prettyJson(api.responseHeaders) }}</pre>
          </div>
        </section>

        <!-- request payload -->
        <section v-if="api.requestPayload && api.method !== 'GET'" class="detail-section"
          :class="{ 'search-match': matchesRequest }">
          <div class="detail-header">
            <h4>Request Payload</h4>
            <button @click="downloadPayload('request')" class="action-btn">💾 Download</button>
          </div>
          <div class="json-container">
            <pre v-html="highlight(prettyJson(api.requestPayload))"></pre>
          </div>
        </section>

        <!-- response payload -->
        <section class="detail-section" :class="{ 'search-match': matchesResponse }">
          <div class="detail-header">
            <h4>Response Payload</h4>
            <button @click="downloadPayload('response')" class="action-btn">💾 Download</button>
          </div>
          <div class="json-container">
            <pre v-html="highlight(prettyJson(api.responsePayload))"></pre>
          </div>
        </section>

        <div v-if="searchQuery && !hasAnyMatch" class="no-results">
          No results for "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getApiById, deleteApi as deleteApiFromDB } from "../../db/apis.repo";
import { getCollectionById } from "../../db/collections.repo";
import { formatDate, highlightSearchTerm, downloadJson, notifyContentScripts } from "../utils/helpers";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";

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
  if (!searchQuery.value || !text) return text;
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
  const a = api.value;
  return {
    label: a.label, method: a.method, url: a.url, status: a.status,
    delay: a.delay || 0, urlMatchType: a.urlMatchType || "auto",
    requestPayload: a.requestPayload, responsePayload: a.responsePayload,
    responseHeaders: a.responseHeaders || "", enabled: a.enabled, createdAt: a.createdAt,
  };
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
  min-height: 80dvh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
}

.state-msg {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin-top: 80px;
}

.api-detail-card {
  background: var(--surface-bg);
  border-radius: 14px;
  width: 100%;
  max-width: 900px;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.page-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-muted);
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-direction: column;
  flex-wrap: wrap;
}

.header-info {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.collection-tag {
  display: inline-block;
  background: var(--header-bg);
  color: white;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  align-self: flex-start;
}

.api-label {
  margin-block: 5px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  word-break: break-word;
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.method-badge,
.status-code,
.delay-badge,
.enabled-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  box-sizing: border-box;
}

.method-badge {
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.method-badge.get {
  background: #d4edda;
  color: #155724;
}

.method-badge.post {
  background: #d1ecf1;
  color: #0c5460;
}

.method-badge.put {
  background: #fff3cd;
  color: #856404;
}

.method-badge.patch {
  background: #e7d5f8;
  color: #6f42c1;
}

.method-badge.delete {
  background: #f8d7da;
  color: #721c24;
}

.status-code {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-soft);
  padding: 0 10px;
  border-radius: 6px;
}

.delay-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--surface-soft);
  padding: 0 10px;
  border-radius: 6px;
}

.enabled-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 0 10px;
  border-radius: 6px;
}

.enabled-badge.enabled {
  background: #d4edda;
  color: #155724;
}

.enabled-badge.disabled {
  background: #f8d7da;
  color: #721c24;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.search-input {
  height: 28px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--field-bg);
  color: var(--field-text);
  min-width: 180px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.action-btn {
  height: 28px;
  box-sizing: border-box;
  padding: 0 14px;
  background: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-body);
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  background: var(--surface-soft);
}

.action-btn.edit-btn {
  border-color: var(--primary);
  color: var(--primary);
}

.action-btn.edit-btn:hover {
  background: var(--focus-ring);
}

.action-btn.delete-btn {
  border-color: #dc3545;
  color: #dc3545;
}

.action-btn.delete-btn:hover {
  background: #f8d7da;
}

.detail-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.detail-section {
  background: var(--surface-muted);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.detail-section.search-match {
  background: var(--search-match-bg);
  border: 2px solid var(--search-match-border);
}

.detail-section h4 {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-body);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.detail-header h4 {
  margin: 0;
}

.detail-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-body);
}

.detail-value {
  font-size: 13px;
  color: var(--text-main);
  word-break: break-word;
}

.detail-value.code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  background: var(--field-bg);
  padding: 3px 8px;
  border-radius: 4px;
}

.json-container {
  background: var(--code-bg);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

.json-container pre {
  margin: 0;
  color: var(--code-text);
  font-family: "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.no-results {
  text-align: center;
  padding: 32px;
  color: var(--text-faint);
  font-style: italic;
}
</style>
