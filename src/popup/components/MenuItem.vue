<template>
  <button @click="$emit('click')" :class="['menu-item', { delete: isDelete }]">
    <span class="menu-icon">{{ icon }}</span>
    <span>{{ label }}</span>
  </button>
</template>

<script setup>
defineProps({
  icon: String,
  label: String,
  isDelete: Boolean,
});

defineEmits(["click"]);
</script>

<style scoped>
.menu-item {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-body);
}

.menu-item:hover {
  background: var(--surface-muted);
}

.menu-item.delete {
  color: #dc3545;
}

.menu-item.delete:hover {
  background: rgba(220, 53, 69, 0.12);
}

.menu-icon {
  font-size: 14px;
  width: 16px;
  text-align: center;
}
</style>
