<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast-slide">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from "../composables/useToast";
const { toasts } = useToast();
</script>

<style>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  pointer-events: none;
}

.toast {
  padding: 10px 16px;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  word-break: break-word;
}

.toast-success { background: #28a745; }
.toast-error   { background: #dc3545; }
.toast-info    { background: #17a2b8; }
.toast-warning { background: #e0a800; }

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.28s ease;
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(110%);
}
</style>
