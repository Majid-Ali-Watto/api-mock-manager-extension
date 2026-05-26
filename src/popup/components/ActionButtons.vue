<template>
  <div class="import-export-buttons">
    <button
      @click="$emit('export')"
      class="action-btn export-btn"
      title="Export All Collections"
    >
      <!-- 📥 -->
       ⬆️
    </button>
    <button
      @click="$emit('import')"
      class="action-btn import-btn"
      title="Import Collections"
    >
      <!-- 📤 -->
       ⬇️
    </button>
    <button
      @click="$emit('toggleInfo')"
      class="action-btn info-btn"
      title="Extension Info"
    >
      ℹ️
    </button>
    <button
      @click="$emit('toggleTheme')"
      class="action-btn theme-btn"
      :title="theme === 'dark' ? 'Switch to current theme' : 'Switch to dark theme'"
    >
      {{ theme === "dark" ? "☀️" : "🌙" }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  theme: {
    type: String,
    default: "current",
  },
});

defineEmits(["export", "import", "toggleInfo", "toggleTheme"]);
</script>

<style scoped>
.import-export-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 6px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.export-btn,
.import-btn,
.info-btn,
.theme-btn {
  background: var(--button-bg);
  color: var(--text-main);
}

.theme-btn:hover,
.info-btn:hover,
.export-btn:hover,
.import-btn:hover {
  background: var(--button-hover-bg);
  transform: scale(1.05);
}
</style>
