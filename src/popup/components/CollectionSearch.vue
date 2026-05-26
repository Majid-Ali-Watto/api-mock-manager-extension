<template>
  <div class="search-container">
    <input
      ref="searchInput"
      type="text"
      :value="searchQuery"
      @input="$emit('update:searchQuery', $event.target.value)"
      placeholder="Search APIs..."
      class="search-input"
    />
    <button @click="handleClear" class="clear-btn" v-if="searchQuery">✕</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

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
  margin-bottom: 12px;
  margin-top: 12px;
  padding: 0 16px;
}

.search-input {
  width: 100%;
  padding: 6px 36px 6px 12px;
  border: 1px solid var(--field-border);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
  background: var(--field-bg);
  color: var(--field-text);
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.clear-btn {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--surface-soft);
  color: var(--text-body);
}
</style>
