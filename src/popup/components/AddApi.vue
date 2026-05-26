<template>
  <div v-if="showForm" class="add-api-container">
    <div class="add-api-form">
      <div class="form-header">
        <h4 class="form-title">
          {{ editMode ? "✏️ Edit API" : "➕ Add New API" }}
        </h4>
        <button @click="toggleForm" class="close-form-btn" title="Cancel">
          ✕
        </button>
      </div>

      <div class="form-grid">
        <!-- URL + match type -->
        <div class="url-row">
          <input
            v-model="url"
            placeholder="API URL or regex pattern"
            class="input-field"
          />
          <select
            v-model="urlMatchType"
            class="match-type-select"
            title="URL match strategy"
          >
            <option value="auto">Auto</option>
            <option value="regex">Regex</option>
          </select>
        </div>

        <!-- method / status / delay / label -->
        <div class="inline-group">
          <select v-model="method" class="select-field">
            <option v-for="m in methods" :key="m">{{ m }}</option>
          </select>
          <input
            v-model.number="status"
            placeholder="Status"
            class="input-field"
            type="number"
          />
          <input
            v-model.number="delay"
            placeholder="Delay ms"
            class="input-field"
            type="number"
            min="0"
            title="Response delay in milliseconds"
          />
          <input v-model="label" placeholder="API Label" class="input-field" />
        </div>

        <div class="payload-tabs">
          <div class="tab-headers">
            <button
              :class="['tab-btn', { active: activeTab === 'response' }]"
              @click="activeTab = 'response'"
              type="button"
            >
              📤 Response
            </button>
            <button
              v-if="method !== 'GET'"
              :class="['tab-btn', { active: activeTab === 'request' }]"
              @click="activeTab = 'request'"
              type="button"
            >
              📥 Request
            </button>
          </div>
          <div class="tab-content">
            <div v-if="activeTab === 'request'" class="payload-section">
              <div class="payload-actions">
                <button @click="importPayload('request')" class="action-btn import-btn" type="button" title="Import JSON file">📤 Import</button>
                <button @click="prettifyPayload('request')" class="action-btn prettify-btn" type="button" title="Format JSON">✨ Prettify</button>
                <button @click="copyPayload('request')" class="action-btn copy-btn" type="button" title="Copy JSON">📋 Copy</button>
                <button @click="downloadPayload('request')" class="action-btn download-btn" type="button" title="Download JSON">📥 Download</button>
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

            <div v-if="activeTab === 'response'" class="payload-section">
              <!-- Response headers -->
              <div class="headers-section">
                <div class="headers-label">
                  Response Headers
                  <span class="hint">JSON object, optional</span>
                </div>
                <input
                  v-model="responseHeaders"
                  class="input-field headers-input"
                  placeholder='{"Content-Type": "application/json"}'
                  spellcheck="false"
                />
              </div>

              <div class="payload-actions">
                <button @click="importPayload('response')" class="action-btn import-btn" type="button" title="Import JSON file">📤 Import</button>
                <button @click="prettifyPayload('response')" class="action-btn prettify-btn" type="button" title="Format JSON">✨ Prettify</button>
                <button @click="copyPayload('response')" class="action-btn copy-btn" type="button" title="Copy JSON">📋 Copy</button>
                <button @click="downloadPayload('response')" class="action-btn download-btn" type="button" title="Download JSON">📥 Download</button>
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
          </div>
        </div>
      </div>

      <div v-if="saveError" class="save-error">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ saveError }}</span>
      </div>

      <button @click="save" class="save-btn" :disabled="!isFormValid">
        {{ editMode ? "💾 Update API" : "💾 Save API" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { watch, nextTick } from "vue";
import { useApiForm } from "../scripts/useApiForm";

const props = defineProps({
  collectionId: Number,
  collectionName: String,
});

const emit = defineEmits(["apiAdded", "apiUpdated"]);

const {
  label,
  url,
  method,
  status,
  delay,
  urlMatchType,
  requestPayload,
  responsePayload,
  responseHeaders,
  showForm,
  editMode,
  activeTab,
  requestValidationError,
  responseValidationError,
  saveError,
  methods,
  requestLineNumbers,
  responseLineNumbers,
  requestTextareaRef,
  responseTextareaRef,
  requestLineNumbersRef,
  responseLineNumbersRef,
  isFormValid,
  toggleForm,
  importPayload,
  syncScroll,
  validateJson,
  prettifyPayload,
  copyPayload,
  downloadPayload,
  save,
} = useApiForm(props, emit);

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
.add-api-container {
  margin-bottom: 16px;
}

.add-api-form {
  background: var(--surface-muted);
  border-radius: 10px;
  padding: 16px;
  border: 2px dashed var(--border-color);
  margin-top: 12px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.form-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-body);
}

.close-form-btn {
  background: #dc3545;
  border: none;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  line-height: 1;
  padding: 0;
}

.close-form-btn:hover {
  background: #c82333;
  transform: rotate(90deg);
}

.form-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

/* .full-width {
  grid-column: 1 / -1;
} */

.url-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

 .input-field {
  width: 90%;
}

.match-type-select {
  padding: 6px 8px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--field-bg);
  color: var(--field-text);
  cursor: pointer;
  flex-shrink: 0;
  min-width: 70px;
}

.input-field,
.select-field {
  padding: 6px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.2s ease;
  background: var(--field-bg);
  color: var(--field-text);
}

.input-field:focus,
.select-field:focus,
.match-type-select:focus,
.textarea-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.inline-group {
  display: grid;
  grid-template-columns: 14% 14% 18% 1fr;
  gap: 10px;
  grid-column: 1 / -1;
}

.select-field {
  cursor: pointer;
}

.payload-tabs {
  grid-column: 1 / -1;
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
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
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

.tab-content {
  padding: 0;
}

.payload-section {
  display: flex;
  flex-direction: column;
}

.headers-section {
  padding: 10px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.headers-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.hint {
  font-weight: normal;
  margin-left: 6px;
  opacity: 0.7;
}

.headers-input {
  font-family: "Courier New", monospace;
  font-size: 12px;
}

.payload-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-muted);
  border-bottom: 1px solid var(--border-color);
}

.action-btn {
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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

.tab-content .textarea-field {
  width: 100%;
  border: none;
  border-radius: 0;
  min-height: 120px;
  box-sizing: border-box;
}

.textarea-wrapper {
  display: flex;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--field-bg);
  transition: all 0.2s ease;
  margin: 8px 12px 0;
}

.textarea-wrapper:has(.textarea-field:focus) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.textarea-wrapper:has(.textarea-field.error) {
  border-color: #dc3545;
  background-color: rgba(220, 53, 69, 0.08);
}

.textarea-wrapper:has(.textarea-field.error:focus) {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
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

.textarea-field.with-line-numbers {
  border: none;
  border-radius: 0;
  flex: 1;
  line-height: 1.5;
}

.textarea-field {
  padding: 10px 12px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: "Courier New", monospace;
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  background: var(--field-bg);
  color: var(--field-text);
  line-height: 1.5;
}

.textarea-field.error {
  border-color: #dc3545;
  background-color: transparent;
  color: var(--field-text);
}

.textarea-field.error:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
}

.validation-error {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(220, 53, 69, 0.12);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 6px;
  margin: 8px 12px;
  font-size: 12px;
  color: var(--text-body);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.error-icon  { font-size: 16px; flex-shrink: 0; }
.error-message { flex: 1; word-break: break-word; line-height: 1.4; }

.save-error {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(220, 53, 69, 0.12);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--text-body);
}

.save-btn {
  width: 100%;
  padding: 10px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
}

.save-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}
</style>
