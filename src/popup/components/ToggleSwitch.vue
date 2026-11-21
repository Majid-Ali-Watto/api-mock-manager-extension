<template>
  <button
    type="button"
    role="switch"
    :aria-checked="checked"
    :title="title"
    :class="['switch', { on: checked, sm: size === 'sm' }]"
    @click.stop="$emit('toggle')"
  >
    <span class="knob" />
  </button>
</template>

<script setup>
defineProps({
  checked: { type: Boolean, default: false },
  title: { type: String, default: "" },
  size: { type: String, default: "md" },
});
defineEmits(["toggle"]);
</script>

<style scoped>
.switch {
  position: relative;
  width: 32px;
  height: 18px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--border-strong);
  cursor: pointer;
  transition: background 0.18s ease;
}

.switch.on {
  background: var(--success);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform 0.18s ease;
}

.switch.on .knob {
  transform: translateX(14px);
}

.switch.sm {
  width: 28px;
  height: 16px;
}

.switch.sm .knob {
  width: 12px;
  height: 12px;
}

.switch.sm.on .knob {
  transform: translateX(12px);
}
</style>
