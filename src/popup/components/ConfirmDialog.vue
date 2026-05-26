<template>
  <Teleport to="body">
    <div v-if="state.visible" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog">
        <p class="confirm-message">{{ state.message }}</p>
        <div class="confirm-actions">
          <button class="confirm-cancel-btn" @click="onCancel">
            {{ state.cancelLabel }}
          </button>
          <button
            :class="['confirm-ok-btn', { dangerous: state.dangerous }]"
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
import { useConfirm } from "../composables/useConfirm";
const { state, onConfirm, onCancel } = useConfirm();
</script>

<style>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.confirm-dialog {
  background: var(--surface-bg, #fff);
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.confirm-message {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-body, #333);
  white-space: pre-line;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.confirm-cancel-btn {
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

.confirm-cancel-btn:hover {
  background: var(--border-color, #dee2e6);
}

.confirm-ok-btn {
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

.confirm-ok-btn:hover {
  opacity: 0.85;
}

.confirm-ok-btn.dangerous {
  background: #dc3545;
}
</style>
