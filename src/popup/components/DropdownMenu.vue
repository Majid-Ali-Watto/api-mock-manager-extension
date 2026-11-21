<template>
  <div ref="menuRef" class="dropdown-menu" :style="adjustedStyle" role="menu" @click.stop>
    <slot></slot>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, computed } from "vue";

const props = defineProps({
  style: {
    type: Object,
    default: () => ({}),
  },
});

// The caller positions the menu below/right of its button; once rendered we nudge
// it back inside the viewport (menus differ in height, so a fixed guess clips them).
const menuRef = ref(null);
const correction = ref({});
const adjustedStyle = computed(() => ({ ...props.style, ...correction.value }));

onMounted(async () => {
  await nextTick();
  const el = menuRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const margin = 8;
  const fix = {};
  if (rect.bottom > window.innerHeight - margin) {
    fix.top = `${Math.max(margin, window.innerHeight - rect.height - margin)}px`;
  }
  if (rect.right > window.innerWidth - margin) {
    fix.left = `${Math.max(margin, window.innerWidth - rect.width - margin)}px`;
  }
  if (rect.left < margin) fix.left = `${margin}px`;
  correction.value = fix;
});
</script>

<style scoped>
.dropdown-menu {
  position: fixed;
  z-index: 1000;
  min-width: 190px;
  padding: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  animation: ui-pop 0.12s ease;
}

.dropdown-menu :deep(.menu-separator) {
  height: 1px;
  margin: 4px 6px;
  background: var(--border);
}
</style>
