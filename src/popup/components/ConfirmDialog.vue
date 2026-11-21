<template>
  <Teleport to="body">
    <div v-if="state.visible" class="dialog-overlay" @click.self="onCancel" @keyup.esc="onCancel">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <div :class="['dialog-icon', { danger: state.dangerous }]">
          <Icon :name="state.dangerous ? 'alert' : 'info'" :size="18" />
        </div>
        <p class="dialog-message">{{ state.message }}</p>
        <div class="dialog-actions">
          <button class="ui-btn" @click="onCancel">
            {{ state.cancelLabel }}
          </button>
          <button
            ref="okRef"
            :class="['ui-btn', state.dangerous ? 'ui-btn--danger-solid' : 'ui-btn--primary']"
            @click="onConfirm"
          >
            {{ state.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { useConfirm } from "../composables/useConfirm";
import Icon from "./Icon.vue";

const { state, onConfirm, onCancel } = useConfirm();
const okRef = ref(null);

watch(
  () => state.visible,
  async (visible) => {
    if (visible) {
      await nextTick();
      okRef.value?.focus();
    }
  }
);
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  animation: ui-fade 0.12s ease;
}

.dialog {
  width: min(380px, 100%);
  padding: 20px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: ui-pop 0.15s ease;
}

.dialog-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
}

.dialog-icon.danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.dialog-message {
  margin: 0 0 18px;
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-line;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
