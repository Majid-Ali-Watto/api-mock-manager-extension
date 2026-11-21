<template>
  <div class="action-buttons">
    <button
      @click="$emit('toggleMocks')"
      :class="['power-pill', mocksEnabled ? 'on' : 'off']"
      :title="mocksEnabled ? 'Mocks are ON — click to turn all mocks off (Alt+Shift+M)' : 'Mocks are OFF — click to turn them back on (Alt+Shift+M)'"
    >
      <span class="dot" />
      {{ mocksEnabled ? "On" : "Off" }}
    </button>
    <span class="divider" />
    <button @click="$emit('toggleLog')" class="ui-icon-btn" title="Request log">
      <Icon name="log" />
    </button>
    <button @click="$emit('export')" class="ui-icon-btn" title="Export All Collections">
      <Icon name="upload" />
    </button>
    <button @click="$emit('import')" class="ui-icon-btn" title="Import Collections">
      <Icon name="download" />
    </button>
    <button
      @click="$emit('toggleTheme')"
      class="ui-icon-btn"
      :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
    >
      <Icon :name="theme === 'dark' ? 'sun' : 'moon'" />
    </button>
    <button @click="$emit('toggleInfo')" class="ui-icon-btn" title="Extension Info">
      <Icon name="info" />
    </button>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

defineProps({
  theme: {
    type: String,
    default: "current",
  },
  mocksEnabled: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["export", "import", "toggleInfo", "toggleTheme", "toggleMocks", "toggleLog"]);
</script>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.divider {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: var(--border);
}

.power-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px 0 9px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.power-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-3);
}

.power-pill.on {
  border-color: transparent;
  background: var(--success-soft);
  color: var(--success-text);
}

.power-pill.on .dot {
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}

.power-pill.off {
  background: var(--warning-soft);
  border-color: transparent;
  color: var(--warning-text);
}

.power-pill.off .dot {
  background: var(--warning);
}
</style>
