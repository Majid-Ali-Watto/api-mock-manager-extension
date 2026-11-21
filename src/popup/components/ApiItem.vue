<template>
  <div class="api-item"
    :class="{ disabled: isDisabled, dragging: isDragging, 'drag-over': isDragOver, pinned: api.pinned }"
    @dragover.prevent="$emit('dragOver')" @drop.prevent="$emit('drop')" @dragend="$emit('dragEnd')"
    @dragstart="handleDragStart">
    <span class="drag-handle" draggable="true" title="Drag to reorder"><Icon name="grip" :size="14" /></span>

    <input type="checkbox" :checked="isSelected" @change="$emit('toggleSelect')" class="ui-checkbox" title="Select API" />

    <MethodBadge :method="api.method" />

    <div class="api-info" @click="$emit('viewInfo')" title="View details">
      <div class="api-label-row">
        <span class="api-label" :title="api.label">{{ api.label || api.url }}</span>
        <span :class="['ui-chip', 'ui-chip--mono', statusTone]" :title="`Responds with status ${effectiveStatus}`">{{ effectiveStatus }}</span>
        <span v-if="modeLabel" class="ui-chip ui-chip--danger" :title="`Behavior: ${modeLabel}`">
          <Icon name="alert" :size="11" stroke-width="2.4" /> {{ modeLabel }}
        </span>
        <span v-if="api.activeVariant" class="ui-chip ui-chip--accent" title="Active variant">
          <Icon name="layers" :size="11" stroke-width="2.4" /> {{ api.activeVariant }}
        </span>
        <span v-if="api.delay > 0" class="ui-chip" title="Response delay">
          <Icon name="clock" :size="11" stroke-width="2.4" /> {{ formatDelay(api.delay) }}
        </span>
      </div>
      <div class="api-url-row">
        <span class="api-url" :title="api.url">{{ api.url }}</span>
        <span v-if="api.matchQuery" class="meta" :title="`Requires query: ${api.matchQuery}`">?{{ api.matchQuery }}</span>
        <span v-if="api.matchBody" class="meta" title="Matches on request body">body match</span>
        <span v-if="api.templated" class="meta" title="Dynamic response (templates)"><Icon name="zap" :size="10" stroke-width="2.4" /> dynamic</span>
        <span v-if="contentLabel" class="meta" :title="`Content type: ${api.contentType || 'none'}`">{{ contentLabel }}</span>
        <span v-if="api.recorded" class="meta" title="Recorded from a real response"><Icon name="record" :size="8" /> recorded</span>
      </div>
    </div>

    <div class="api-actions">
      <span v-if="hitCount > 0" class="ui-chip ui-chip--accent hit-badge" title="Times intercepted">
        {{ hitCount }}
      </span>
      <button @click.stop="$emit('togglePinned')" :class="['ui-icon-btn', 'ui-icon-btn--sm', 'pin-btn', { active: api.pinned }]"
        :title="api.pinned ? 'Unpin' : 'Pin to top'">
        <Icon name="star" :size="14" :filled="api.pinned" />
      </button>
      <ToggleSwitch
        size="sm"
        :checked="api.enabled !== false"
        :title="api.enabled !== false ? 'Pause API' : 'Resume API'"
        @toggle="$emit('toggleEnabled')"
      />
      <div class="menu-container">
        <button @click.stop="$emit('toggleMenu', $event)" class="ui-icon-btn ui-icon-btn--sm menu-btn" title="More actions">
          <Icon name="more" :size="15" />
        </button>
        <slot name="menu"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import MethodBadge from "./MethodBadge.vue";
import Icon from "./Icon.vue";
import ToggleSwitch from "./ToggleSwitch.vue";

const props = defineProps({
  api: { type: Object, required: true },
  isSelected: Boolean,
  isDisabled: Boolean,
  isDragging: Boolean,
  isDragOver: Boolean,
  hitCount: { type: Number, default: 0 },
});

const emit = defineEmits([
  "toggleSelect", "toggleEnabled", "toggleMenu", "viewInfo",
  "togglePinned", "dragStart", "dragOver", "drop", "dragEnd",
]);

const MODE_LABELS = { "network-error": "network error", timeout: "timeout", hang: "hang" };

// The active variant (if any) decides what the page actually receives.
const activeVariant = computed(() =>
  props.api.activeVariant ? (props.api.variants || []).find((v) => v.name === props.api.activeVariant) : null
);
const effectiveStatus = computed(() => activeVariant.value?.status || props.api.status || 200);
const effectiveMode = computed(() => activeVariant.value?.responseMode || props.api.responseMode || "mock");
const modeLabel = computed(() => MODE_LABELS[effectiveMode.value] || "");

const statusTone = computed(() => {
  const s = Number(effectiveStatus.value);
  if (s >= 500) return "ui-chip--danger";
  if (s >= 400) return "ui-chip--warning";
  if (s >= 300) return "ui-chip--info";
  return "ui-chip--success";
});

const contentLabel = computed(() => {
  const type = props.api.contentType;
  if (typeof type !== "string" || /json/i.test(type)) return "";
  if (!type) return "no body type";
  return { "text/plain": "text", "text/html": "html", "application/xml": "xml", "text/event-stream": "sse" }[type] || type;
});

function formatDelay(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s` : `${ms}ms`;
}

function handleDragStart(event) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(props.api.id));
  emit("dragStart");
}
</script>

<style scoped>
.api-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px 8px 4px;
  border-top: 1px solid var(--border);
  transition: background 0.12s;
}

.api-item:first-child {
  border-top: none;
}

.api-item:hover {
  background: var(--surface-2);
}

.api-item.disabled .api-info,
.api-item.disabled :deep(.method-badge) {
  opacity: 0.5;
}

.api-item.dragging {
  opacity: 0.4;
}

.api-item.drag-over {
  box-shadow: inset 0 2px 0 var(--accent);
}

.drag-handle {
  display: grid;
  place-items: center;
  width: 14px;
  color: var(--text-3);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.12s;
}

.api-item:hover .drag-handle {
  opacity: 1;
}

.api-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.api-label-row,
.api-url-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.api-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.api-info:hover .api-label {
  color: var(--accent);
}

.api-url-row {
  margin-top: 2px;
}

.api-url {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.meta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-2);
}

.meta::before {
  content: "·";
  margin-right: 2px;
  color: var(--text-3);
}

.api-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.hit-badge {
  margin-right: 4px;
}

.pin-btn {
  opacity: 0;
}

.api-item:hover .pin-btn,
.pin-btn:focus-visible,
.pin-btn.active {
  opacity: 1;
}

.pin-btn.active {
  color: var(--warning);
}

.menu-container {
  position: relative;
}
</style>
