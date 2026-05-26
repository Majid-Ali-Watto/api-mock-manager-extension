<template>
  <div class="collection-header">
    <div class="collection-title-section">
      <input
        type="checkbox"
        :checked="isSelected"
        @change="$emit('toggleSelect')"
        class="checkbox"
      />
      <button @click="$emit('toggleCollapse')" class="collapse-btn">
        {{ isCollapsed ? "▶" : "▼" }}
      </button>
      <h3 class="collection-title" :title="title">{{ title }}</h3>
      <span class="api-count">({{ apiCount }})</span>
      <span
        v-if="interceptCount > 0"
        class="intercept-count"
        title="Total intercepted requests in this collection"
      >
        {{ interceptCount }}
      </span>
    </div>

    <div class="collection-actions">
      <button
        v-if="hasApis"
        @click="$emit('toggleSearch')"
        class="action-btn search-btn"
        title="Search in collection"
      >
        🔍
      </button>
      <button
        @click="$emit('toggleEnabled')"
        :class="['action-btn', 'toggle-btn', isEnabled ? 'enabled' : 'disabled']"
        :title="isEnabled ? 'Pause collection' : 'Resume collection'"
      >
        {{ isEnabled ? '⏸️' : '▶️' }}
      </button>
      <button
        @click="$emit('togglePinned')"
        :class="['action-btn', 'pin-btn', { pinned: isPinned }]"
        :title="isPinned ? 'Unpin collection' : 'Pin collection to top'"
      >{{ isPinned ? '★' : '☆' }}</button>
      <button
        @click="$emit('openInTab')"
        class="action-btn open-tab-btn"
        title="Open in new tab"
      >
        ↗
      </button>
      <button
        @click="$emit('addApi')"
        class="action-btn add-btn"
        title="Add API"
      >
        ➕
      </button>
      <div class="menu-container">
        <button
          @click.stop="$emit('toggleMenu', $event)"
          class="action-btn menu-btn"
          title="Collection actions"
        >
          ⋮
        </button>
        <slot name="menu"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  apiCount: {
    type: Number,
    default: 0,
  },
  interceptCount: {
    type: Number,
    default: 0,
  },
  isSelected: Boolean,
  isCollapsed: Boolean,
  hasApis: Boolean,
  isEnabled: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
});

defineEmits(["toggleSelect", "toggleCollapse", "toggleSearch", "addApi", "toggleMenu", "openInTab", "toggleEnabled", "togglePinned"]);
</script>

<style scoped>
.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--header-bg);
  border-radius: 10px 10px 0 0;
  color: white;
}

.collection-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.collapse-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
  line-height: 1;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.collection-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.api-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: normal;
  flex-shrink: 0;
}

.intercept-count {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #ff4757;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.collection-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.2s ease;
  line-height: 1;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.search-btn,
.add-btn,
.open-tab-btn {
  font-size: 16px;
}

.pin-btn {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.pin-btn.pinned {
  color: #f0c040;
}

.menu-btn {
  font-size: 20px;
  font-weight: bold;
}

.checkbox {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: white;
}

.menu-container {
  position: relative;
}
</style>
