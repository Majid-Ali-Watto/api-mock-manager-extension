import { reactive } from "vue";

const state = reactive({
  visible: false,
  message: "",
  confirmLabel: "OK",
  cancelLabel: "Cancel",
  dangerous: false,
  resolve: null,
});

export function useConfirm() {
  function showConfirm(message, options = {}) {
    state.visible = true;
    state.message = message;
    state.confirmLabel = options.confirmLabel || "OK";
    state.cancelLabel = options.cancelLabel || "Cancel";
    state.dangerous = options.dangerous || false;
    return new Promise((resolve) => {
      state.resolve = resolve;
    });
  }

  function onConfirm() {
    state.visible = false;
    state.resolve?.(true);
    state.resolve = null;
  }

  function onCancel() {
    state.visible = false;
    state.resolve?.(false);
    state.resolve = null;
  }

  return { state, showConfirm, onConfirm, onCancel };
}
