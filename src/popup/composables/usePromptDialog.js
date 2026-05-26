import { reactive } from "vue";

const state = reactive({
  visible: false,
  title: "",
  inputValue: "",
  resolve: null,
});

export function usePromptDialog() {
  function showPrompt(title, defaultValue = "") {
    state.visible = true;
    state.title = title;
    state.inputValue = defaultValue;
    return new Promise((resolve) => {
      state.resolve = resolve;
    });
  }

  function onConfirm() {
    const value = state.inputValue.trim();
    state.visible = false;
    state.resolve?.(value || null);
    state.resolve = null;
  }

  function onCancel() {
    state.visible = false;
    state.resolve?.(null);
    state.resolve = null;
  }

  return { state, showPrompt, onConfirm, onCancel };
}
