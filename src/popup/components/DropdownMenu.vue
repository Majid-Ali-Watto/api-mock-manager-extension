<template>
  <div class="dropdown-menu" :style="style" @click.stop>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  style: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<style scoped>
.dropdown-menu {
  position: fixed;
  background: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--menu-shadow);
  z-index: 1000;
  min-width: 160px;
  padding: 4px;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
