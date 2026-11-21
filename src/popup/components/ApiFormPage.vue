<template>
  <div class="api-form-page">
    <header class="page-header">
      <div class="page-header-inner">
        <div class="header-info">
          <button @click="handleCancel" class="ui-icon-btn" title="Close"><Icon name="arrow-left" /></button>
          <div>
            <div class="breadcrumb">
              <Icon name="folder" :size="12" />
              <span>{{ collectionName || "Collection" }}</span>
            </div>
            <h2 class="page-title">{{ isEdit ? "Edit API" : "New API" }}</h2>
          </div>
        </div>
        <div class="header-actions">
          <button @click="handleCancel" class="ui-btn ui-btn--ghost cancel-btn" title="Cancel">Cancel</button>
          <button @click="save" class="ui-btn ui-btn--primary save-btn" :disabled="!isFormValid">
            <Icon name="save" :size="14" /> {{ isEdit ? "Save changes" : "Create API" }}
          </button>
        </div>
      </div>
    </header>

    <div class="form-body">
      <div v-if="saveError" class="save-error">
        <Icon name="alert" :size="15" />
        <span class="error-message">{{ saveError }}</span>
      </div>

      <!-- Request matching -->
      <section class="form-card">
        <div class="card-head">
          <h3>Request matching</h3>
          <p>Which requests this mock answers.</p>
        </div>
        <div class="grid">
          <div class="field span-12">
            <label class="ui-label">Method &amp; URL</label>
            <div class="url-control">
              <select v-model="method" :class="['method-select', `m-${method.toLowerCase()}`]" title="Method">
                <option v-for="m in methods" :key="m">{{ m }}</option>
              </select>
              <input v-model="url" placeholder="https://api.example.com/users/:id" class="url-input" spellcheck="false" />
              <select v-model="urlMatchType" class="match-select" title="URL match strategy">
                <option value="auto">Auto match</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <p class="hint">Full URL or path. Use <code>*</code> wildcards or <code>:param</code> segments; query strings are ignored.</p>
          </div>
          <div class="field span-6">
            <label class="ui-label">Label</label>
            <input v-model="label" placeholder="e.g. Get user" class="ui-input" />
          </div>
          <div class="field span-6">
            <label class="ui-label">Required query params <span class="optional">optional</span></label>
            <input v-model="matchQuery" placeholder="page=2&sort=*" class="ui-input mono-input" spellcheck="false" />
          </div>
        </div>
      </section>

      <!-- Response behaviour -->
      <section class="form-card">
        <div class="card-head">
          <h3>Response behavior</h3>
          <p>What the page receives when a request matches.</p>
        </div>
        <div class="grid">
          <div class="field span-3">
            <label class="ui-label">Status</label>
            <input v-model.number="status" placeholder="200" class="ui-input mono-input" type="number" />
          </div>
          <div class="field span-3">
            <label class="ui-label">Delay (ms)</label>
            <input v-model.number="delay" placeholder="0" class="ui-input mono-input" type="number" min="0" />
          </div>
          <div class="field span-3">
            <label class="ui-label">Behavior</label>
            <select v-model="responseMode" class="ui-select" title="Mock response, or simulate a network error, a timeout (after the delay) or a request that never responds">
              <option v-for="m in responseModes" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="field span-3">
            <label class="ui-label">Content type</label>
            <select v-model="contentType" class="ui-select">
              <option v-for="t in contentTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
        </div>
        <label class="check-row">
          <input type="checkbox" v-model="templated" class="ui-checkbox" />
          <span>
            <strong>Dynamic response</strong> — render placeholders on every request:
            <span class="token-list">
              <code v-for="t in templateTokens" :key="t" v-text="t" />
            </span>
          </span>
        </label>
        <p v-if="method === 'WS'" class="hint ws-hint">
          <Icon name="info" :size="13" />
          WebSocket mock: the body is sent after connecting (a JSON array sends one message per item). With dynamic
          responses on, each message the page sends gets a reply, with <code v-pre>{{body}}</code> set to that message.
        </p>
      </section>

      <!-- Body / headers / variants -->
      <section class="form-card editor-card">
        <div class="tab-headers" role="tablist">
          <button :class="['tab-btn', { active: activeTab === 'response' }]" @click="activeTab = 'response'" type="button">
            <Icon name="inbox" :size="14" /> Response body
          </button>
          <button v-if="method !== 'GET'" :class="['tab-btn', { active: activeTab === 'request' }]" @click="activeTab = 'request'" type="button">
            <Icon name="send" :size="14" /> Request body
            <span v-if="matchBody" class="tab-badge">match</span>
          </button>
          <button :class="['tab-btn', { active: activeTab === 'headers' }]" @click="activeTab = 'headers'" type="button">
            <Icon name="code" :size="14" /> Headers
            <span v-if="activeHeaderCount > 0" class="tab-badge">{{ activeHeaderCount }}</span>
          </button>
          <button :class="['tab-btn', { active: activeTab === 'variants' }]" @click="activeTab = 'variants'" type="button">
            <Icon name="layers" :size="14" /> Variants
            <span v-if="variants.length > 0" class="tab-badge">{{ variants.length }}</span>
          </button>
        </div>

        <!-- Response body -->
        <div v-if="activeTab === 'response'" class="payload-section">
          <div class="editor-toolbar">
            <span class="toolbar-note">{{ responseIsJson ? "JSON" : (contentType || "No content type") }}{{ templated ? " · dynamic" : "" }}</span>
            <div class="toolbar-actions">
              <button @click="importPayload('response')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="download" :size="13" /> Import</button>
              <button @click="prettifyPayload('response')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="sparkles" :size="13" /> Prettify</button>
              <button @click="copyPayload('response')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="copy" :size="13" /> Copy</button>
              <button @click="downloadPayload('response')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="upload" :size="13" /> Download</button>
            </div>
          </div>
          <div :class="['editor', { error: responseValidationError }]">
            <div class="line-numbers" ref="responseLineNumbersRef">{{ responseLineNumbers }}</div>
            <textarea
              spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off"
              ref="responseTextareaRef"
              v-model="responsePayload"
              @input="validateJson('response')"
              @blur="validateJson('response')"
              @scroll="syncScroll('response')"
              :placeholder="responseIsJson ? '{ &quot;message&quot;: &quot;Hello&quot; }' : 'Response body'"
              class="code-area"
            />
          </div>
          <div v-if="responseValidationError" class="validation-error">
            <Icon name="alert" :size="13" />
            <span class="error-message">{{ responseValidationError }}</span>
          </div>
        </div>

        <!-- Request body -->
        <div v-if="activeTab === 'request'" class="payload-section">
          <label class="check-row inline">
            <input type="checkbox" v-model="matchBody" class="ui-checkbox" />
            <span>Only match requests whose body contains this payload <span class="optional">JSON is compared as a subset</span></span>
          </label>
          <div class="editor-toolbar">
            <span class="toolbar-note">JSON</span>
            <div class="toolbar-actions">
              <button @click="importPayload('request')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="download" :size="13" /> Import</button>
              <button @click="prettifyPayload('request')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="sparkles" :size="13" /> Prettify</button>
              <button @click="copyPayload('request')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="copy" :size="13" /> Copy</button>
              <button @click="downloadPayload('request')" class="ui-btn ui-btn--ghost ui-btn--sm" type="button"><Icon name="upload" :size="13" /> Download</button>
            </div>
          </div>
          <div :class="['editor', { error: requestValidationError }]">
            <div class="line-numbers" ref="requestLineNumbersRef">{{ requestLineNumbers }}</div>
            <textarea
              spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off"
              ref="requestTextareaRef"
              v-model="requestPayload"
              @input="validateJson('request')"
              @blur="validateJson('request')"
              @scroll="syncScroll('request')"
              placeholder="Request JSON (optional)"
              class="code-area"
            />
          </div>
          <div v-if="requestValidationError" class="validation-error">
            <Icon name="alert" :size="13" />
            <span class="error-message">{{ requestValidationError }}</span>
          </div>
        </div>

        <!-- Headers -->
        <div v-if="activeTab === 'headers'" class="panel">
          <div class="panel-toolbar">
            <span class="hint">Response headers. Unchecked rows are kept but not sent.</span>
            <button @click="addHeaderRow" class="ui-btn ui-btn--sm" type="button"><Icon name="plus" :size="13" /> Add header</button>
          </div>
          <div class="headers-table">
            <div class="headers-table-head">
              <span></span>
              <span>Name</span>
              <span>Value</span>
              <span></span>
            </div>
            <div
              v-for="(row, index) in headerRows"
              :key="index"
              class="header-row"
              :class="{ 'row-disabled': !row.enabled }"
            >
              <input type="checkbox" v-model="row.enabled" class="ui-checkbox" title="Include this header in responses" />
              <input v-model="row.key" placeholder="X-Header-Name" class="ui-input mono-input" spellcheck="false" :disabled="!row.enabled" />
              <input v-model="row.value" placeholder="value" class="ui-input mono-input" spellcheck="false" :disabled="!row.enabled" />
              <button @click="removeHeaderRow(index)" class="ui-icon-btn" type="button" title="Remove header"><Icon name="x" :size="14" /></button>
            </div>
          </div>
        </div>

        <!-- Variants -->
        <div v-if="activeTab === 'variants'" class="panel">
          <div class="panel-toolbar">
            <div class="active-variant">
              <label class="ui-label">Active response</label>
              <select v-model="activeVariant" class="ui-select">
                <option value="">Main response</option>
                <option v-for="v in variants" :key="v.name" :value="v.name">{{ v.name }}</option>
              </select>
            </div>
            <button @click="addVariant" class="ui-btn ui-btn--sm" type="button"><Icon name="plus" :size="13" /> Add variant</button>
          </div>
          <p v-if="!variants.length" class="empty-variants">
            Variants are alternate responses (for example <code>empty</code> or <code>error</code>). Activate one here, or
            switch every API in the collection at once with <strong>Scenario…</strong>.
          </p>
          <div v-for="(variant, index) in variants" :key="index" :class="['variant-card', { active: variant.name && variant.name === activeVariant }]">
            <div class="variant-fields">
              <div class="field">
                <label class="ui-label">Name</label>
                <input v-model="variant.name" class="ui-input" spellcheck="false" />
              </div>
              <div class="field narrow">
                <label class="ui-label">Status</label>
                <input v-model.number="variant.status" class="ui-input mono-input" type="number" />
              </div>
              <div class="field">
                <label class="ui-label">Behavior</label>
                <select v-model="variant.responseMode" class="ui-select">
                  <option v-for="m in responseModes" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <button @click="removeVariant(index)" class="ui-icon-btn remove-variant" type="button" title="Remove variant"><Icon name="trash" :size="14" /></button>
            </div>
            <textarea
              v-model="variant.responsePayload"
              class="ui-textarea variant-textarea"
              spellcheck="false"
              placeholder="Response body for this variant"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { getApiById } from "../../db/apis.repo";
import { getCollectionById } from "../../db/collections.repo";
import { useApiForm } from "../scripts/useApiForm";
import Icon from "./Icon.vue";

const templateTokens = ["{{params.id}}", "{{query.page}}", "{{body.field}}", "{{now}}", "{{uuid}}", "{{random}}", "{{count}}"];

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
  matchQuery, matchBody, responseMode, contentType, templated,
  variants, activeVariant, responseModes, contentTypes, responseIsJson,
  addVariant, removeVariant,
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
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
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
.form-body {
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
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  font-size: 11.5px;
  font-weight: 600;
}

.page-title {
  margin: 1px 0 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
  padding-bottom: 48px;
}

.form-card {
  padding: 18px 20px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.card-head {
  margin-bottom: 14px;
}

.card-head h3 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 650;
}

.card-head p {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 14px 14px;
}

.span-12 { grid-column: span 12; }
.span-6 { grid-column: span 6; }
.span-3 { grid-column: span 3; }

@media (max-width: 640px) {
  .span-6,
  .span-3 {
    grid-column: span 12;
  }
}

.optional {
  margin-left: 4px;
  color: var(--text-3);
  font-weight: 500;
}

.hint {
  margin: 6px 0 0;
  color: var(--text-3);
  font-size: 11.5px;
}

.hint code,
.check-row code,
.empty-variants code {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 11px;
}

.mono-input {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

/* Method + URL + match type joined into one control */
.url-control {
  display: flex;
  align-items: stretch;
  height: 36px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.url-control:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.url-control select,
.url-control input {
  border: none;
  background: transparent;
  outline: none;
}

.method-select {
  --m: var(--text-2);
  width: 92px;
  padding: 0 8px 0 12px;
  border-right: 1px solid var(--border) !important;
  background: color-mix(in srgb, var(--m) 10%, transparent) !important;
  color: var(--m);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.method-select.m-get { --m: var(--success-text); }
.method-select.m-post { --m: var(--info-text); }
.method-select.m-put { --m: var(--warning-text); }
.method-select.m-patch { --m: #7c3aed; }
.method-select.m-delete { --m: var(--danger-text); }

.method-select option {
  color: var(--text);
  background: var(--surface);
}

.url-input {
  flex: 1;
  min-width: 0;
  padding: 0 12px;
  font-family: var(--font-mono);
  font-size: 13px;
}

.match-select {
  padding: 0 10px;
  border-left: 1px solid var(--border) !important;
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  font-size: 12.5px;
  line-height: 1.6;
  cursor: pointer;
}

.check-row .ui-checkbox {
  margin-top: 3px;
}

.check-row.inline {
  margin: 0 0 12px;
}

.token-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: 2px;
  vertical-align: middle;
}

.ws-hint {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  line-height: 1.55;
}

/* Editor card */
.editor-card {
  padding: 0;
  overflow: hidden;
}

.tab-headers {
  display: flex;
  gap: 2px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 12px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  border-bottom-color: var(--accent);
  color: var(--text);
}

.tab-btn.active :deep(.icon) {
  color: var(--accent);
}

.tab-badge {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 10.5px;
  line-height: 17px;
}

.payload-section,
.panel {
  padding: 14px 16px 16px;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.toolbar-note {
  color: var(--text-3);
  font-size: 11.5px;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 2px;
}

.editor {
  display: flex;
  height: 340px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--code-bg);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.editor:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.editor.error {
  border-color: var(--danger);
}

.line-numbers {
  flex-shrink: 0;
  min-width: 40px;
  padding: 12px 8px 12px 12px;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--code-gutter);
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  text-align: right;
  white-space: pre;
  user-select: none;
}

.code-area {
  flex: 1;
  padding: 12px 14px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--code-text);
  caret-color: var(--accent);
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
}

.code-area::placeholder {
  color: var(--code-gutter);
}

.validation-error,
.save-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--danger-text);
  font-size: 12px;
}

.validation-error {
  margin-top: 8px;
}

.save-error {
  padding: 10px 12px;
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  background: var(--danger-soft);
  font-size: 12.5px;
  line-height: 1.5;
}

.panel-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-toolbar .hint {
  margin: 0;
}

.headers-table {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.headers-table-head,
.header-row {
  display: grid;
  grid-template-columns: 28px 1fr 1.6fr 32px;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 10px;
}

.headers-table-head {
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header-row + .header-row {
  border-top: 1px solid var(--border);
}

.header-row .ui-input {
  height: 30px;
}

.row-disabled .ui-input {
  opacity: 0.5;
}

.active-variant {
  width: 240px;
}

.empty-variants {
  margin: 4px 0 0;
  padding: 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.6;
  text-align: center;
}

.variant-card {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.variant-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.variant-fields {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 10px;
}

.variant-fields .field {
  flex: 1;
}

.variant-fields .field.narrow {
  flex: 0 0 90px;
}

.remove-variant:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.variant-textarea {
  min-height: 100px;
  background: var(--surface);
}
</style>
