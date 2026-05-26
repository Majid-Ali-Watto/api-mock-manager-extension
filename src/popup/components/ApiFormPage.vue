<template>
  <div class="api-form-page">
    <div class="api-form-card">
      <div class="page-header">
        <div class="header-info">
          <span v-if="collectionName" class="collection-tag">{{ collectionName }}</span>
          <h2 class="page-title">{{ isEdit ? "✏️ Edit API" : "➕ Add New API" }}</h2>
        </div>
        <button @click="handleCancel" class="cancel-btn" title="Cancel">✕ Cancel</button>
      </div>

      <div class="form-body">
        <!-- URL + match type -->
        <div class="field-group">
          <div class="url-row">
            <div class="field-col">
              <label class="field-label">URL</label>
              <input v-model="url" placeholder="https://api.example.com/endpoint" class="input-field" />
            </div>
            <div class="field-col match-col">
              <label class="field-label">Match</label>
              <select v-model="urlMatchType" class="match-type-select" title="URL match strategy">
                <option value="auto">Auto</option>
                <option value="regex">Regex</option>
              </select>
            </div>
          </div>
        </div>

        <!-- method / status / delay / label -->
        <div class="inline-group">
          <div class="field-col">
            <label class="field-label">Method</label>
            <select v-model="method" class="select-field">
              <option v-for="m in methods" :key="m">{{ m }}</option>
            </select>
          </div>
          <div class="field-col">
            <label class="field-label">Status</label>
            <input v-model.number="status" placeholder="200" class="input-field" type="number" />
          </div>
          <div class="field-col">
            <label class="field-label">Delay (ms)</label>
            <input v-model.number="delay" placeholder="0" class="input-field" type="number" min="0" />
          </div>
          <div class="field-col">
            <label class="field-label">Label</label>
            <input v-model="label" placeholder="My API" class="input-field" />
          </div>
        </div>

        <!-- payload + headers tabs -->
        <div class="payload-tabs">
          <div class="tab-headers">
            <button :class="['tab-btn', { active: activeTab === 'response' }]" @click="activeTab = 'response'" type="button">📤 Response</button>
            <button v-if="method !== 'GET'" :class="['tab-btn', { active: activeTab === 'request' }]" @click="activeTab = 'request'" type="button">📥 Request</button>
            <button :class="['tab-btn', { active: activeTab === 'headers' }]" @click="activeTab = 'headers'" type="button">
              🔧 Headers
              <span v-if="activeHeaderCount > 0" class="header-badge">{{ activeHeaderCount }}</span>
            </button>
          </div>

          <div class="tab-content">
            <!-- Response tab -->
            <div v-if="activeTab === 'response'" class="payload-section">
              <div class="payload-actions">
                <button @click="importPayload('response')" class="action-btn import-btn" type="button">📤 Import</button>
                <button @click="prettifyPayload('response')" class="action-btn prettify-btn" type="button">✨ Prettify</button>
                <button @click="copyPayload('response')" class="action-btn copy-btn" type="button">📋 Copy</button>
                <button @click="downloadPayload('response')" class="action-btn download-btn" type="button">📥 Download</button>
              </div>
              <div class="textarea-wrapper">
                <div class="line-numbers" ref="responseLineNumbersRef">{{ responseLineNumbers }}</div>
                <textarea
                  spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off"
                  ref="responseTextareaRef"
                  v-model="responsePayload"
                  @input="validateJson('response')"
                  @blur="validateJson('response')"
                  @scroll="syncScroll('response')"
                  placeholder="Enter Response JSON (optional)"
                  :class="['textarea-field', 'with-line-numbers', { error: responseValidationError }]"
                />
              </div>
              <div v-if="responseValidationError" class="validation-error">
                <span class="error-icon">⚠️</span>
                <span class="error-message">{{ responseValidationError }}</span>
              </div>
            </div>

            <!-- Request tab -->
            <div v-if="activeTab === 'request'" class="payload-section">
              <div class="payload-actions">
                <button @click="importPayload('request')" class="action-btn import-btn" type="button">📤 Import</button>
                <button @click="prettifyPayload('request')" class="action-btn prettify-btn" type="button">✨ Prettify</button>
                <button @click="copyPayload('request')" class="action-btn copy-btn" type="button">📋 Copy</button>
                <button @click="downloadPayload('request')" class="action-btn download-btn" type="button">📥 Download</button>
              </div>
              <div class="textarea-wrapper">
                <div class="line-numbers" ref="requestLineNumbersRef">{{ requestLineNumbers }}</div>
                <textarea
                  spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off"
                  ref="requestTextareaRef"
                  v-model="requestPayload"
                  @input="validateJson('request')"
                  @blur="validateJson('request')"
                  @scroll="syncScroll('request')"
                  placeholder="Enter Request JSON (optional)"
                  :class="['textarea-field', 'with-line-numbers', { error: requestValidationError }]"
                />
              </div>
              <div v-if="requestValidationError" class="validation-error">
                <span class="error-icon">⚠️</span>
                <span class="error-message">{{ requestValidationError }}</span>
              </div>
            </div>

            <!-- Headers tab -->
            <div v-if="activeTab === 'headers'" class="headers-panel">
              <div class="headers-toolbar">
                <span class="headers-hint">Unchecked headers are saved but not sent in responses.</span>
                <button @click="addHeaderRow" class="add-header-btn" type="button">+ Add Header</button>
              </div>

              <div class="headers-table">
                <div class="headers-table-head">
                  <span class="col-check"></span>
                  <span class="col-key">Key</span>
                  <span class="col-value">Value</span>
                  <span class="col-del"></span>
                </div>

                <div
                  v-for="(row, index) in headerRows"
                  :key="index"
                  class="header-row"
                  :class="{ 'row-disabled': !row.enabled }"
                >
                  <input
                    type="checkbox"
                    v-model="row.enabled"
                    class="header-checkbox"
                    title="Include this header in responses"
                  />
                  <input
                    v-model="row.key"
                    placeholder="Header name"
                    class="header-key-input"
                    spellcheck="false"
                    :disabled="!row.enabled"
                  />
                  <input
                    v-model="row.value"
                    placeholder="Header value"
                    class="header-value-input"
                    spellcheck="false"
                    :disabled="!row.enabled"
                  />
                  <button
                    @click="removeHeaderRow(index)"
                    class="remove-row-btn"
                    type="button"
                    title="Remove header"
                  >✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="saveError" class="save-error">
          <span class="error-icon">⚠️</span>
          <span class="error-message">{{ saveError }}</span>
        </div>

        <button @click="save" class="save-btn" :disabled="!isFormValid">
          {{ isEdit ? "💾 Update API" : "💾 Save API" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { getApiById } from "../../db/apis.repo";
import { getCollectionById } from "../../db/collections.repo";
import { useApiForm } from "../scripts/useApiForm";

const params = new URLSearchParams(window.location.search);
const isEdit = params.get("mode") === "edit";
const collectionIdParam = Number(params.get("collectionId")) || 0;
const apiIdParam = Number(params.get("apiId")) || 0;
const collectionNameParam = params.get("collectionName") || "";

const collectionName = ref(collectionNameParam);

const fakeProps = { collectionId: collectionIdParam };

const {
  label, url, method, status, delay, urlMatchType,
  requestPayload, responsePayload,
  headerRows, addHeaderRow, removeHeaderRow,
  activeTab, requestValidationError, responseValidationError,
  saveError, methods,
  requestLineNumbers, responseLineNumbers,
  requestTextareaRef, responseTextareaRef,
  requestLineNumbersRef, responseLineNumbersRef,
  isFormValid,
  initEdit, importPayload, syncScroll,
  validateJson, prettifyPayload, copyPayload, downloadPayload, save,
} = useApiForm(fakeProps, () => {}, { onSaved: () => window.close() });

const activeHeaderCount = computed(
  () => headerRows.value.filter((r) => r.enabled && r.key.trim()).length
);

onMounted(async () => {
  if (isEdit && apiIdParam) {
    const api = await getApiById(apiIdParam);
    if (api) {
      if (!fakeProps.collectionId) fakeProps.collectionId = api.collectionId;
      await initEdit(api);
      if (!collectionName.value) {
        const col = await getCollectionById(api.collectionId);
        collectionName.value = col?.name || "";
      }
    }
  }
});

function handleCancel() {
  window.close();
}

watch([url, method, requestPayload, responsePayload], () => {
  saveError.value = "";
});

watch([requestPayload, responsePayload], async () => {
  await nextTick();
  if (requestPayload.value) validateJson("request");
  if (responsePayload.value) validateJson("response");
}, { flush: "post" });
</script>

<style scoped>
.api-form-page {
  min-height: 80dvh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
}

.api-form-card {
  background: var(--surface-bg);
  border-radius: 14px;
  width: 100%;
  max-width: 900px;
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
  justify-content: space-between;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.cancel-btn {
  padding: 7px 14px;
  background: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-body);
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.cancel-btn:hover {
  background: #f8d7da;
  border-color: #dc3545;
  color: #721c24;
}

.form-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
}

.field-col {
  display: flex;
  flex-direction: column;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.url-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.url-row .field-col {
  flex: 1;
}

.match-col {
  flex: 0 0 90px !important;
}

.input-field {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--field-bg);
  color: var(--field-text);
  transition: border-color 0.2s;
}

.input-field:focus,
.select-field:focus,
.match-type-select:focus,
.textarea-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.match-type-select {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--field-bg);
  color: var(--field-text);
  cursor: pointer;
}

.inline-group {
  display: grid;
  grid-template-columns: 14% 14% 18% 1fr;
  gap: 10px;
}

.select-field {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--field-bg);
  color: var(--field-text);
  cursor: pointer;
}

/* ── Tabs ─────────────────────────────────── */
.payload-tabs {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-bg);
}

.tab-headers {
  display: flex;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn:hover {
  background: var(--focus-ring);
  color: var(--text-body);
}

.tab-btn.active {
  background: var(--surface-bg);
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--primary);
  color: white;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

/* ── Payload sections ─────────────────────── */
.payload-section {
  display: flex;
  flex-direction: column;
}

.payload-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-muted);
  border-bottom: 1px solid var(--border-color);
}

.action-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.action-btn.import-btn   { background: #17a2b8; }
.action-btn.prettify-btn { background: #6f42c1; }
.action-btn.copy-btn     { background: var(--primary); }
.action-btn.download-btn { background: #28a745; }

.action-btn.import-btn:hover   { background: #138496; }
.action-btn.prettify-btn:hover { background: #5a32a3; }
.action-btn.copy-btn:hover     { background: #5568d3; }
.action-btn.download-btn:hover { background: #218838; }

.textarea-wrapper {
  display: flex;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--field-bg);
  transition: all 0.2s;
  margin: 8px 12px 8px;
  min-height: 200px;
}

.textarea-wrapper:has(.textarea-field:focus) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.textarea-wrapper:has(.textarea-field.error) {
  border-color: #dc3545;
  background-color: rgba(220, 53, 69, 0.08);
}

.line-numbers {
  background: var(--surface-muted);
  color: var(--text-muted);
  padding: 10px 8px;
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--border-color);
  overflow-y: hidden;
  white-space: pre;
  min-width: 10px;
}

.textarea-field {
  flex: 1;
  padding: 10px 12px;
  border: none;
  font-size: 13px;
  font-family: "Courier New", monospace;
  resize: vertical;
  background: var(--field-bg);
  color: var(--field-text);
  line-height: 1.5;
}

.textarea-field.with-line-numbers { border-radius: 0; }
.textarea-field.error { color: var(--field-text); }

.validation-error {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(220, 53, 69, 0.12);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 6px;
  margin: 0 12px 8px;
  font-size: 12px;
  color: var(--text-body);
}

/* ── Headers tab ──────────────────────────── */
.headers-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
}

.headers-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.headers-hint {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.add-header-btn {
  padding: 6px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.add-header-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.headers-table {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.headers-table-head {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 32px;
  gap: 0;
  padding: 8px 10px;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--border-color);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 32px;
  gap: 0;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

.header-row:last-child {
  border-bottom: none;
}

.header-row:hover {
  background: var(--surface-muted);
}

.header-row.row-disabled {
  opacity: 0.45;
}

.header-checkbox {
  justify-self: center;
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--primary);
}

.header-key-input,
.header-value-input {
  padding: 9px 10px;
  border: none;
  border-left: 1px solid var(--border-color);
  background: transparent;
  color: var(--field-text);
  font-size: 13px;
  font-family: "Courier New", monospace;
  width: 100%;
  box-sizing: border-box;
  transition: background 0.15s;
}

.header-key-input:focus,
.header-value-input:focus {
  outline: none;
  background: var(--focus-ring);
}

.header-key-input:disabled,
.header-value-input:disabled {
  cursor: not-allowed;
  color: var(--text-faint);
}

.remove-row-btn {
  justify-self: center;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
  padding: 0;
}

.remove-row-btn:hover {
  background: #f8d7da;
  color: #dc3545;
}

/* ── Save / error ─────────────────────────── */
.error-icon  { font-size: 16px; flex-shrink: 0; }
.error-message { flex: 1; word-break: break-word; line-height: 1.4; }

.save-error {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(220, 53, 69, 0.12);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-body);
}

.save-btn {
  width: 100%;
  padding: 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
  margin-top: 4px;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}
</style>
