<template>
  <div class="collection-header" :class="{ collapsed: isCollapsed, disabled: !isEnabled }">
    <div class="collection-title-section">
      <button
        @click="$emit('toggleCollapse')"
        class="ui-icon-btn ui-icon-btn--sm collapse-btn"
        :title="isCollapsed ? 'Expand' : 'Collapse'"
      >
        <Icon name="chevron-right" :size="15" :class="['chevron', { open: !isCollapsed }]" />
      </button>
      <input
        type="checkbox"
        :checked="isSelected"
        @change="$emit('toggleSelect')"
        class="ui-checkbox"
        title="Select collection"
      />
      <h3 class="collection-title" :title="title" @click="$emit('toggleCollapse')">{{ title }}</h3>
      <span class="ui-chip count-chip" :title="`${apiCount} API(s)`">{{ apiCount }}</span>
      <button
        type="button"
        :class="['ui-chip', 'site-scope', sites.length ? 'ui-chip--info' : 'ui-chip--warning']"
        :title="sites.length
          ? 'Applies only to: ' + sites.join(', ') + ' (click to edit)'
          : 'Applies to ALL sites — click to limit it to specific sites'"
        @click.stop="$emit('editSites')"
      >
        <Icon :name="sites.length ? 'pin' : 'globe'" :size="11" stroke-width="2.4" />
        {{ sites.length === 0 ? "All sites" : sites.length === 1 ? sites[0] : `${sites.length} sites` }}
      </button>
      <span v-if="isRecording" class="ui-chip ui-chip--solid-danger rec-badge" title="Recording real responses from a tab into this collection">
        <Icon name="record" :size="9" /> REC
      </span>
      <span
        v-if="interceptCount > 0"
        class="ui-chip ui-chip--accent intercept-count"
        title="Total intercepted requests in this collection"
      >
        <Icon name="zap" :size="11" stroke-width="2.4" />
        {{ interceptCount }}
      </span>
    </div>

    <div class="collection-actions">
      <button
        v-if="hasApis"
        @click="$emit('toggleSearch')"
        class="ui-icon-btn search-btn"
        title="Search in collection"
      >
        <Icon name="search" :size="15" />
      </button>
      <button @click="$emit('addApi')" class="ui-icon-btn add-btn" title="Add API">
        <Icon name="plus" :size="16" />
      </button>
      <button @click="$emit('openInTab')" class="ui-icon-btn open-tab-btn" title="Open in new tab">
        <Icon name="external" :size="15" />
      </button>
      <button
        @click="$emit('togglePinned')"
        :class="['ui-icon-btn', 'pin-btn', { pinned: isPinned }]"
        :title="isPinned ? 'Unpin collection' : 'Pin collection to top'"
      >
        <Icon name="star" :size="15" :filled="isPinned" />
      </button>
      <ToggleSwitch
        class="enable-switch"
        :checked="isEnabled"
        :title="isEnabled ? 'Pause collection' : 'Resume collection'"
        @toggle="$emit('toggleEnabled')"
      />
      <div class="menu-container">
        <button
          @click.stop="$emit('toggleMenu', $event)"
          class="ui-icon-btn menu-btn"
          title="Collection actions"
        >
          <Icon name="more" :size="16" />
        </button>
        <slot name="menu"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";
import ToggleSwitch from "./ToggleSwitch.vue";

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
  sites: { type: Array, default: () => [] },
  isRecording: { type: Boolean, default: false },
});

defineEmits(["toggleSelect", "toggleCollapse", "toggleSearch", "addApi", "toggleMenu", "openInTab", "toggleEnabled", "togglePinned", "editSites"]);
</script>

<style scoped>
.collection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 46px;
  padding: 6px 8px 6px 6px;
  border-bottom: 1px solid var(--border);
}

.collection-header.collapsed {
  border-bottom-color: transparent;
}

.collection-title-section {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
}

.chevron {
  transition: transform 0.18s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.collection-title {
  margin: 0 2px 0 2px;
  font-size: 13.5px;
  font-weight: 650;
  letter-spacing: -0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  cursor: pointer;
}

.disabled .collection-title {
  color: var(--text-3);
}

.site-scope {
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-badge {
  animation: rec-pulse 1.6s ease-in-out infinite;
}

@keyframes rec-pulse {
  50% { opacity: 0.55; }
}

.collection-actions {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}

.pin-btn {
  opacity: 0;
}

.collection-header:hover .pin-btn,
.pin-btn:focus-visible,
.pin-btn.pinned {
  opacity: 1;
}

.pin-btn.pinned {
  color: var(--warning);
}

.enable-switch {
  margin: 0 6px 0 8px;
}

.menu-container {
  position: relative;
}
</style>
