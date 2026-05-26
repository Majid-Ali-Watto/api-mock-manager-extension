<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <div class="header-left">
          <h3>API Details</h3>
          <input v-model="localSearchQuery" @input="$emit('update:searchQuery', localSearchQuery)" type="text"
            placeholder="Search in API details..." class="modal-search-input" />
          <button @click="$emit('close')" class="modal-close-btn">✕</button>
        </div>
        <div class="header-actions">
          <span class="collection-tag">{{ collectionName }}</span>
        </div>
      </div>

      <div class="modal-content">
        <div class="api-details">
          <div class="detail-section">
            <div class="detail-header">
              <h4>Basic Information</h4>
              <div class="button-group">
                <button @click="$emit('copy')" class="copy-btn" title="Copy JSON">
                  📋 Copy JSON
                </button>
                <button @click="$emit('download')" class="download-btn" title="Download JSON">
                  💾 Download
                </button>
              </div>
            </div>
            <div class="detail-row">
              <span class="detail-label">Label:</span>
              <span class="detail-value" v-html="highlightText(api.label, searchQuery)"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">URL:</span>
              <span class="detail-value code" v-html="highlightText(api.url, searchQuery)"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Method:</span>
              <span class="detail-value">
                <span class="method-badge" :class="api.method.toLowerCase()">
                  {{ api.method }}
                </span>
              </span>
            </div>
            <div class="detail-row" v-if="api.description">
              <span class="detail-label">Description:</span>
              <span class="detail-value" v-html="highlightText(api.description, searchQuery)"></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Created:</span>
              <span class="detail-value">{{ formatDate(api.createdAt) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Updated:</span>
              <span class="detail-value">{{ formatDate(api.updatedAt) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span :class="['status-badge', api.enabled ? 'enabled' : 'disabled']">
                  {{ api.enabled ? "✓ Enabled" : "⏸ Disabled" }}
                </span>
              </span>
            </div>
          </div>

          <div class="detail-section" v-if="isMatchingRequest" :class="{ 'search-match': isMatchingRequest }">
            <div class="detail-header">
              <h4>Request Configuration</h4>
              <button @click="$emit('downloadPayload', 'request')" class="download-payload-btn"
                title="Download Request JSON">
                💾 Download
              </button>
            </div>
            <div class="json-container">
              <pre v-html="highlightText(formattedRequestPayload, searchQuery)"></pre>
            </div>
          </div>

          <div class="detail-section" v-if="isMatchingResponse" :class="{ 'search-match': isMatchingResponse }">
            <div class="detail-header">
              <h4>Response Configuration</h4>
              <button @click="$emit('downloadPayload', 'response')" class="download-payload-btn"
                title="Download Response JSON">
                💾 Download
              </button>
            </div>
            <div class="json-container">
              <pre v-html="highlightText(formattedResponsePayload, searchQuery)"></pre>
            </div>
          </div>

          <div v-if="searchQuery && !hasAnyMatch" class="no-search-results">
            <p>No results found for "{{ searchQuery }}"</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  isVisible: Boolean,
  api: {
    type: Object,
    default: () => ({}),
  },
  collectionName: {
    type: String,
    default: "",
  },
  searchQuery: {
    type: String,
    default: "",
  },
  formatDate: {
    type: Function,
    required: true,
  },
  highlightText: {
    type: Function,
    required: true,
  },
  isMatchingSearch: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  "close",
  "copy",
  "download",
  "downloadPayload",
  "update:searchQuery",
]);

const localSearchQuery = ref(props.searchQuery);

function formatPayload(payload) {
  if (payload === undefined || payload === null || payload === "") {
    return "None";
  }

  if (typeof payload === "string") {
    const trimmedPayload = payload.trim();
    if (!trimmedPayload) return "None";

    try {
      return JSON.stringify(JSON.parse(trimmedPayload), null, 2);
    } catch {
      return payload;
    }
  }

  return JSON.stringify(payload, null, 2);
}

watch(
  () => props.searchQuery,
  (newVal) => {
    localSearchQuery.value = newVal;
  }
);

const isMatchingRequest = computed(() => {
  if (!props.searchQuery) return true;
  return props.isMatchingSearch(formattedRequestPayload.value);
});

const isMatchingResponse = computed(() => {
  if (!props.searchQuery) return true;
  return props.isMatchingSearch(formattedResponsePayload.value);
});

const formattedRequestPayload = computed(() =>
  formatPayload(props.api.requestPayload)
);

const formattedResponsePayload = computed(() =>
  formatPayload(props.api.responsePayload)
);

const hasAnyMatch = computed(() => {
  if (!props.searchQuery) return true;
  return (
    props.isMatchingSearch(props.api.label) ||
    props.isMatchingSearch(props.api.url) ||
    props.isMatchingSearch(props.api.description || "") ||
    isMatchingRequest.value ||
    isMatchingResponse.value
  );
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--surface-bg);
  border-radius: 10px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  animation: slideIn 0.3s ease;
}

.modal-header {
  display: flex;
  /* justify-content: space-between; */
  /* align-items: center; */
  flex-direction: column;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  gap: 16px;
}

.header-left {
  display: flex;
  /* align-items: center; */
  justify-content: space-between;
  gap: 12px;
  /* flex: 1; */
  /* min-width: 0; */
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-main);
}

.collection-tag {
  background: var(--header-bg);
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  /* gap: 12px; */
  /* align-items: center; */
}

.modal-search-input {
  padding: 6px 12px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
  flex: 1;
  background: var(--field-bg);
  color: var(--field-text);
}

.modal-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.modal-close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: var(--surface-muted);
  color: var(--text-body);
}

.modal-content {
  overflow-y: auto;
  padding: 16px;
  flex: 1;
}

.api-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  background: var(--surface-muted);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.3s ease;
}

.detail-section.search-match {
  background: var(--search-match-bg);
  border: 2px solid var(--search-match-border);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-body);
}

.button-group {
  display: flex;
  gap: 8px;
}

.copy-btn,
.download-btn,
.download-payload-btn {
  padding: 6px 12px;
  background: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-body);
}

.copy-btn:hover,
.download-btn:hover,
.download-payload-btn:hover {
  background: var(--surface-soft);
  border-color: var(--field-border);
}

.detail-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: var(--text-body);
  font-size: 13px;
}

.detail-value {
  color: var(--text-main);
  font-size: 13px;
  word-break: break-word;
}

.detail-value.code {
  font-family: "Courier New", monospace;
  background: var(--field-bg);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.method-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
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

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.enabled {
  background: #d4edda;
  color: #155724;
}

.status-badge.disabled {
  background: #f8d7da;
  color: #721c24;
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
}

.no-search-results {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-style: italic;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
