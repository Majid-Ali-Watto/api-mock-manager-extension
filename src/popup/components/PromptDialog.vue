<template>
  <Teleport to="body">
    <div v-if="state.visible" class="prompt-overlay" @click.self="onCancel">
      <div class="prompt-dialog">
        <p class="prompt-title">{{ state.title }}</p>
        <input
          ref="inputRef"
          v-model="state.inputValue"
          class="prompt-input"
          @keyup.enter="onConfirm"
          @keyup.esc="onCancel"
        />
        <div class="prompt-actions">
          <button class="prompt-cancel-btn" @click="onCancel">Cancel</button>
          <button
            class="prompt-ok-btn"
            @click="onConfirm"
            :disabled="!state.inputValue.trim()"
          >
            OK
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

<style>
.prompt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.prompt-dialog {
  background: var(--surface-bg, #fff);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prompt-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-body, #333);
}

.prompt-input {
  padding: 8px 12px;
  border: 1.5px solid var(--field-border, #ced4da);
  border-radius: 6px;
  font-size: 13px;
  background: var(--field-bg, #fff);
  color: var(--field-text, #333);
  transition: border-color 0.2s;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--primary, #667eea);
  box-shadow: 0 0 0 3px var(--focus-ring, rgba(102, 126, 234, 0.1));
}

.prompt-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.prompt-cancel-btn {
  padding: 8px 18px;
  background: var(--surface-soft, #e9ecef);
  color: var(--text-body, #333);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.prompt-cancel-btn:hover {
  background: var(--border-color, #dee2e6);
}

.prompt-ok-btn {
  padding: 8px 18px;
  background: var(--primary, #667eea);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.prompt-ok-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.prompt-ok-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
