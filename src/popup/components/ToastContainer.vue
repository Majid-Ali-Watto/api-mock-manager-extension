<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast-slide">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
        >
          <span class="toast-icon">
            <Icon :name="ICONS[toast.type] || 'info'" :size="14" stroke-width="2.4" />
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from "../composables/useToast";
import Icon from "./Icon.vue";

const { toasts } = useToast();
const ICONS = { success: "check", error: "alert", warning: "alert", info: "info" };
</script>

<style>
.toast-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-line;
}

.toast-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 6px;
}

.toast-message {
  padding-top: 2px;
}

.toast-success .toast-icon { background: var(--success-soft); color: var(--success); }
.toast-error .toast-icon { background: var(--danger-soft); color: var(--danger); }
.toast-warning .toast-icon { background: var(--warning-soft); color: var(--warning); }
.toast-info .toast-icon { background: var(--accent-soft); color: var(--accent); }

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.22s ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
