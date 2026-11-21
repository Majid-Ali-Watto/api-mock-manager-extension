<template>
  <button @click="$emit('click')" :class="['menu-item', { delete: isDelete }]" role="menuitem">
    <Icon v-if="icon" :name="icon" :size="14" :filled="filled" class="menu-icon" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup>
import Icon from "./Icon.vue";

defineProps({
  icon: String,
  label: String,
  isDelete: Boolean,
  filled: Boolean,
});

defineEmits(["click"]);
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.menu-item:hover,
.menu-item:focus-visible {
  background: var(--surface-3);
  outline: none;
}

.menu-icon {
  color: var(--text-3);
}

.menu-item.delete {
  color: var(--danger-text);
}

.menu-item.delete .menu-icon {
  color: var(--danger);
}

.menu-item.delete:hover {
  background: var(--danger-soft);
}
</style>
