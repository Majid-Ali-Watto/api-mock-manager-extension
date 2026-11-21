<template>
  <div class="bulk-actions-bar">
    <div class="bulk-left">
      <label class="select-all-label">
        <input
          type="checkbox"
          :checked="allSelected"
          @change="$emit('toggleAll')"
          class="ui-checkbox"
        />
        <span v-if="selectedCount > 0" class="selected-text">{{ selectedCount }} selected</span>
        <span v-else class="totals">
          <strong>{{ collectionCount }}</strong> {{ collectionCount === 1 ? "collection" : "collections" }}
          <span class="sep">·</span>
          <strong>{{ totalApiCount }}</strong> {{ totalApiCount === 1 ? "API" : "APIs" }}
        </span>
      </label>
    </div>
    <div class="bulk-actions-buttons">
      <template v-if="selectedCount > 0">
        <button @click="$emit('exportSelected')" class="ui-btn ui-btn--sm" title="Export Selected Collections">
          <Icon name="upload" :size="13" /> Export
        </button>
        <button
          @click="$emit('deleteSelected')"
          class="ui-btn ui-btn--sm ui-btn--danger"
          :title="`Delete ${selectedCount} Selected Collection(s)`"
        >
          <Icon name="trash" :size="13" /> Delete
        </button>
        <span class="divider" />
      </template>
      <button
        @click="$emit('toggleSort')"
        class="ui-icon-btn"
        :title="`Sort by ${sortBy === 'name' ? 'Date' : 'Name'}`"
      >
        <Icon :name="sortBy === 'name' ? 'type' : 'calendar'" :size="15" />
      </button>
      <button
        v-if="allExpanded"
        @click="$emit('collapseAll')"
        class="ui-icon-btn"
        title="Collapse All Collections"
      >
        <Icon name="chevrons-up" :size="15" />
      </button>
      <button
        v-else
        @click="$emit('expandAll')"
        class="ui-icon-btn"
        title="Expand All Collections"
      >
        <Icon name="chevrons-down" :size="15" />
      </button>
      <button
        v-if="!allEnabled"
        @click="$emit('enableAll')"
        class="ui-icon-btn"
        title="Resume All Collections"
      >
        <Icon name="play" :size="14" />
      </button>
      <button
        v-else
        @click="$emit('disableAll')"
        class="ui-icon-btn"
        title="Pause All Collections"
      >
        <Icon name="pause" :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

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
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  padding: 2px 4px 6px 12px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
}

.totals strong,
.selected-text {
  color: var(--text);
  font-weight: 650;
}

.sep {
  margin: 0 3px;
  color: var(--text-3);
}

.bulk-actions-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
}

.bulk-actions-buttons .ui-btn {
  margin-right: 4px;
}

.divider {
  width: 1px;
  height: 18px;
  margin: 0 6px 0 2px;
  background: var(--border);
}
</style>
