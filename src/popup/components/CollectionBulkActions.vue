<template>
  <div class="bulk-actions-bar">
    <div class="bulk-left">
      <label class="select-all-label">
        <input
          type="checkbox"
          :checked="allSelected"
          @change="$emit('toggleAll')"
          class="checkbox"
        />
        Select All
      </label>
      <div class="totals">
        <span class="total-badge" title="Total collections">{{ collectionCount }} collections</span>
        <span class="total-sep">·</span>
        <span class="total-badge" title="Total APIs">{{ totalApiCount }} APIs</span>
      </div>
    </div>
    <div class="bulk-actions-buttons">
      <button
        @click="$emit('toggleSort')"
        class="bulk-action-btn sort-btn"
        :title="`Sort by ${sortBy === 'name' ? 'Date' : 'Name'}`"
      >
        {{ sortBy === "name" ? "🔤" : "📅" }}
      </button>
      <button
        v-if="allExpanded"
        @click="$emit('collapseAll')"
        class="bulk-action-btn collapse-btn"
        title="Collapse All Collections"
      >
        ▲
      </button>
      <button
        v-if="!allExpanded"
        @click="$emit('expandAll')"
        class="bulk-action-btn expand-btn"
        title="Expand All Collections"
      >
        ▼
      </button>
      <button
        v-if="!allEnabled"
        @click="$emit('enableAll')"
        class="bulk-action-btn enable-btn"
        title="Resume All Collections"
      >
        ▶️
      </button>
      <button
        v-if="allEnabled"
        @click="$emit('disableAll')"
        class="bulk-action-btn disable-btn"
        title="Pause All Collections"
      >
        ⏸️
      </button>
      <button
        v-if="selectedCount > 0"
        @click="$emit('exportSelected')"
        class="bulk-action-btn export-btn"
        title="Export Selected Collections"
      >
        📥
      </button>
      <button
        v-if="selectedCount > 0"
        @click="$emit('deleteSelected')"
        class="bulk-delete-btn"
        :title="`Delete ${selectedCount} Selected Collection(s)`"
      >
        🗑️ {{ selectedCount }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  allSelected: Boolean,
  allExpanded: Boolean,
  allEnabled: Boolean,
  selectedCount: Number,
  sortBy: String,
  collectionCount: { type: Number, default: 0 },
  totalApiCount: { type: Number, default: 0 },
});

defineEmits([
  "toggleAll",
  "toggleSort",
  "collapseAll",
  "expandAll",
  "enableAll",
  "disableAll",
  "exportSelected",
  "deleteSelected",
]);
</script>

<style scoped>
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--header-bg);
  color: white;
  border-radius: 12px 12px 0 0;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.bulk-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.totals {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.total-badge {
  font-weight: 600;
}

.total-sep {
  opacity: 0.5;
}

.bulk-actions-buttons {
  display: flex;
  gap: 8px;
}

.bulk-action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  font-weight: 600;
}

.bulk-action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.bulk-delete-btn {
  background: #dc3545;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.bulk-delete-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.checkbox {
  cursor: pointer;
  width: 16px;
  height: 16px;
}
</style>
