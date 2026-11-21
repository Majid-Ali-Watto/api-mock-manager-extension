<template>
  <Teleport to="body">
    <div v-if="state.visible" class="dialog-overlay" @click.self="onCancel">
      <div class="dialog" role="dialog" aria-modal="true">
        <p class="prompt-title">{{ state.title }}</p>
        <input
          ref="inputRef"
          v-model="state.inputValue"
          class="ui-input prompt-input"
          spellcheck="false"
          @keyup.enter="onConfirm"
          @keyup.esc="onCancel"
        />
        <div class="dialog-actions">
          <button class="ui-btn" @click="onCancel">Cancel</button>
          <button
            class="ui-btn ui-btn--primary"
            @click="onConfirm"
            :disabled="!state.inputValue.trim()"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from "vue";
import { usePromptDialog } from "../composables/usePromptDialog";

const { state, onConfirm, onCancel } = usePromptDialog();
const inputRef = ref(null);

watch(
  () => state.visible,
  (v) => {
    if (v) setTimeout(() => inputRef.value?.focus(), 50);
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
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(420px, 100%);
  padding: 20px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: ui-pop 0.15s ease;
}

.prompt-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.55;
  white-space: pre-line;
}

.prompt-input {
  height: 34px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
