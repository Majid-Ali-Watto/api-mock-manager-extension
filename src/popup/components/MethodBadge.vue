<template>
  <span :class="['method-badge', method.toLowerCase()]">
    {{ method }}
  </span>
</template>

<script setup>
defineProps({
  method: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
/* One hue per method; background is derived so it works in light and dark themes. */
.method-badge {
  --m: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 20px;
  padding: 0 6px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--m) 13%, transparent);
  color: var(--m);
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.method-badge.get { --m: #15803d; }
.method-badge.post { --m: #1d4ed8; }
.method-badge.put { --m: #b45309; }
.method-badge.patch { --m: #7c3aed; }
.method-badge.delete { --m: #dc2626; }
.method-badge.ws { --m: #0e7490; }

:root[data-theme="dark"] .method-badge.get { --m: #4ade80; }
:root[data-theme="dark"] .method-badge.post { --m: #60a5fa; }
:root[data-theme="dark"] .method-badge.put { --m: #fbbf24; }
:root[data-theme="dark"] .method-badge.patch { --m: #c084fc; }
:root[data-theme="dark"] .method-badge.delete { --m: #f87171; }
:root[data-theme="dark"] .method-badge.ws { --m: #22d3ee; }
:root[data-theme="dark"] .method-badge { --m: #94a3b8; }
</style>
