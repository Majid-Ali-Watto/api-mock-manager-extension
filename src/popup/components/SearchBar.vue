<template>
  <div class="search-wrapper">
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      type="text"
      placeholder="🔍 Search collections or APIs..."
      class="search-input"
    />
    <button
      v-if="modelValue"
      @click="$emit('clear')"
      class="clear-search-btn"
      title="Clear search"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});

defineEmits(["update:modelValue", "clear"]);
</script>

<style scoped>
.search-wrapper {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
  background: var(--button-bg);
  color: var(--field-text);
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
  background: var(--field-bg);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface-soft);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: var(--button-hover-bg);
  color: var(--text-body);
}
</style>
