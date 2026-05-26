import { computed } from "vue";

export function useLineNumbers(textContent) {
  const lineNumbers = computed(() => {
    const lines = textContent.value.split("\n").length;
    return Array.from({ length: lines }, (_, i) => i + 1).join("\n");
  });

  return {
    lineNumbers,
  };
}
