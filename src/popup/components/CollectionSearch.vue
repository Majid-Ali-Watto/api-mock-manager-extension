<template>
  <div class="search-container">
    <Icon name="search" :size="13" class="search-icon" />
    <input
      ref="searchInput"
      type="text"
      :value="searchQuery"
      @input="$emit('update:searchQuery', $event.target.value)"
      @keyup.esc="handleClear"
      placeholder="Filter APIs in this collection"
      class="ui-input search-input"
      spellcheck="false"
    />
    <button @click="handleClear" class="ui-icon-btn ui-icon-btn--sm clear-btn" v-if="searchQuery" title="Clear">
      <Icon name="x" :size="13" />
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Icon from "./Icon.vue";

defineProps({
  searchQuery: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:searchQuery", "clear"]);

const searchInput = ref(null);

const handleClear = () => {
  emit("update:searchQuery", "");
  emit("clear");
  searchInput.value?.focus();
};

onMounted(() => {
  searchInput.value?.focus();
});
</script>

<style scoped>
.search-container {
  position: relative;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}

.search-input {
  height: 28px;
  padding-left: 28px;
  font-size: 12.5px;
}

.clear-btn {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
