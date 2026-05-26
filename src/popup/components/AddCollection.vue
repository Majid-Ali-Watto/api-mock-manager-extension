<template>
  <div class="add-collection" :class="{ 'form-open': showForm }">
    <button v-if="!showForm" @click="toggleForm" title="Add New Collection" class="toggle-btn">
       ➕ 
    </button>
    
    <div v-if="showForm" class="form-content">
      <div class="input-row">
        <button @click="toggleForm" class="cancel-btn" title="Cancel">
          ✕
        </button>
        <input
          v-model="name"
          placeholder="Enter collection name..."
          class="collection-input"
          :class="{ error: nameError }"
          @keyup.enter="add"
        />
        <button @click="add" class="add-btn" title="Add Collection">+</button>
      </div>
      <div v-if="nameError" class="name-error">⚠️ {{ nameError }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { addCollection, getCollections } from "../../db/collections.repo";

const emit = defineEmits(['collectionAdded', 'formToggled']);

const name = ref("");
const showForm = ref(false);
const nameError = ref("");

watch(name, () => { nameError.value = ""; });

function toggleForm() {
  showForm.value = !showForm.value;
  if (!showForm.value) {
    name.value = "";
    nameError.value = "";
  }
  emit('formToggled', showForm.value);
}

async function add() {
  const trimmed = name.value.trim();
  if (!trimmed) return;

  const existing = await getCollections();
  const duplicate = existing.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) {
    nameError.value = `A collection named "${duplicate.name}" already exists. Choose a different name.`;
    return;
  }

  await addCollection(trimmed);
  name.value = "";
  nameError.value = "";
  showForm.value = false;
  emit('collectionAdded');
}
</script>

<style scoped>
.add-collection {
  border-radius: 0;
}

.add-collection.form-open {
  width: 100%;
}

.toggle-btn {
  width: 100%;
  padding: 6px;
  background: var(--button-bg);
  color: var(--text-main);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.toggle-btn:hover {
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.form-content {
  /* margin-top: 16px; */
  animation: slideDown 0.3s ease;
}

.input-row {
  display: flex;
  gap: 8px;
  /* margin-bottom: 12px; */
  align-items: center;
}

.cancel-btn {
  padding: 6px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-btn:hover {
  background: #c82333;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.collection-input {
  flex: 1;
  padding: 6px;
  border: 2px solid var(--field-border);
  border-radius: 8px;
  font-size: 12px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: var(--field-bg);
  color: var(--field-text);
}

.collection-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.collection-input.error {
  border-color: #dc3545;
}

.name-error {
  font-size: 11px;
  color: #dc3545;
  margin-top: 4px;
  padding: 0 4px;
  word-break: break-word;
}

.add-btn {
  width: 35px;
  height: 35px;
  padding: 6px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.add-btn:hover {
  background: #218838;
  box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
}

.add-btn:active {
  transform: translateY(0);
}
</style>
