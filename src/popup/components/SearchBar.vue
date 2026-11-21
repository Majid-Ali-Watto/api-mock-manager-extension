<template>
  <div class="search-wrapper">
    <Icon name="search" :size="14" class="search-icon" />
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.esc="$emit('clear')"
      type="text"
      placeholder="Search collections and APIs"
      class="ui-input search-input"
      spellcheck="false"
    />
    <button v-if="modelValue" @click="$emit('clear')" class="ui-icon-btn ui-icon-btn--sm clear-search-btn" title="Clear search">
      <Icon name="x" :size="13" />
    </button>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

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
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}

.search-input {
  padding-left: 30px;
  padding-right: 30px;
  background: var(--surface-2);
}

.search-input:focus {
  background: var(--surface);
}

.clear-search-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
