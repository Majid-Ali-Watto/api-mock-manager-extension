<template>
  <div
    class="api-item"
    :class="{ disabled: isDisabled, dragging: isDragging, 'drag-over': isDragOver, pinned: api.pinned }"
    @dragover.prevent="$emit('dragOver')"
    @drop.prevent="$emit('drop')"
    @dragend="$emit('dragEnd')"
    @dragstart="handleDragStart"
  >
    <span class="drag-handle" draggable="true" title="Drag to reorder">⠿</span>

    <input
      type="checkbox"
      :checked="isSelected"
      @change="$emit('toggleSelect')"
      class="checkbox small-checkbox"
    />

    <MethodBadge :method="api.method" />

    <div class="api-info" @click="$emit('viewInfo')" title="View details">
      <div class="api-label-row">
        <span v-if="api.pinned" class="pin-indicator" title="Pinned">📌</span>
        <span class="api-label" :title="api.label">{{ api.label }}</span>
      </div>
      <span class="api-url" :title="api.url">{{ api.url }}</span>
    </div>

    <div class="api-actions">
      <span v-if="hitCount > 0" class="hit-badge" title="Times intercepted">
        {{ hitCount }}
      </span>
      <button
        @click.stop="$emit('togglePinned')"
        class="pin-btn"
        :class="{ active: api.pinned }"
        :title="api.pinned ? 'Unpin' : 'Pin to top'"
      >{{ api.pinned ? '★' : '☆' }}</button>
      <button
        @click="$emit('toggleEnabled')"
        :class="['toggle-status-btn', 'small', api.enabled ? 'enabled' : 'disabled']"
        :title="api.enabled ? 'Pause API' : 'Resume API'"
      >
        {{ api.enabled ? "⏸️" : "▶️" }}
      </button>
      <div class="menu-container">
        <button
          @click.stop="$emit('toggleMenu', $event)"
          class="action-btn menu-btn"
          title="More actions"
        >⋮</button>
        <slot name="menu"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import MethodBadge from "./MethodBadge.vue";

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

function handleDragStart(event) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(props.api.id));
  emit("dragStart");
}
</script>

<style scoped>
.api-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-bg);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.15s ease;
  position: relative;
}

.api-item:hover { background: var(--surface-soft); z-index: 100; }

.api-item.pinned { border-left: 3px solid var(--primary); }

.api-item.dragging { opacity: 0.4; }

.api-item.drag-over {
  border-color: var(--primary);
  background: var(--focus-ring);
  box-shadow: 0 0 0 2px var(--primary);
}

.api-item.disabled .api-label { text-decoration: line-through; }

.drag-handle {
  color: var(--text-faint);
  font-size: 16px;
  cursor: grab;
  flex-shrink: 0;
  line-height: 1;
  user-select: none;
  padding: 0 2px;
  letter-spacing: -1px;
}

.drag-handle:active { cursor: grabbing; }

.api-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
}

.api-label-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.pin-indicator { font-size: 11px; flex-shrink: 0; }

.api-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-url {
  font-size: 11px;
  color: var(--text-muted);
  font-family: "Courier New", monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.hit-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: #dc3545;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(220, 53, 69, 0.25);
}

.pin-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--text-faint);
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;
  line-height: 1;
  flex-shrink: 0;
}

.pin-btn:hover { color: var(--primary); }
.pin-btn.active { color: #f0a500; }

.toggle-status-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  background: transparent;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.toggle-status-btn.enabled { color: #28a745; }
.toggle-status-btn.disabled { color: var(--text-muted); }
.toggle-status-btn:hover { background: var(--surface-soft); }

.menu-container { position: relative; }

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-body);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.2s ease;
  line-height: 1;
}

.action-btn:hover { background: var(--surface-soft); }
.menu-btn { font-size: 20px; }

.checkbox { cursor: pointer; }
.small-checkbox { width: 14px; height: 14px; }
</style>
