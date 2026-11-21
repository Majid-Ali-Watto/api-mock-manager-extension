<template>
  <div class="add-collection" :class="{ 'form-open': showForm }">
    <button v-if="!showForm" @click="toggleForm" title="Add New Collection" class="ui-btn ui-btn--primary new-btn">
      <Icon name="plus" :size="14" stroke-width="2.4" /> New
    </button>

    <div v-if="showForm" class="form-content">
      <div class="input-row">
        <Icon name="folder" :size="15" class="input-icon" />
        <input
          ref="inputRef"
          v-model="name"
          placeholder="Collection name, e.g. Auth service"
          class="ui-input collection-input"
          :class="{ error: nameError }"
          @keyup.enter="add"
          @keyup.esc="toggleForm"
        />
        <button @click="add" class="ui-btn ui-btn--primary" :disabled="!name.trim()" title="Add Collection">Create</button>
        <button @click="toggleForm" class="ui-btn ui-btn--ghost" title="Cancel">Cancel</button>
      </div>
      <div v-if="nameError" class="name-error"><Icon name="alert" :size="13" /> {{ nameError }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import Icon from "./Icon.vue";
import { addCollection, getCollections } from "../../db/collections.repo";

const emit = defineEmits(['collectionAdded', 'formToggled']);

const name = ref("");
const showForm = ref(false);
const nameError = ref("");
const inputRef = ref(null);

watch(name, () => { nameError.value = ""; });

function toggleForm() {
  showForm.value = !showForm.value;
  if (!showForm.value) {
    name.value = "";
    nameError.value = "";
  }
  emit('formToggled', showForm.value);
  if (showForm.value) nextTick(() => inputRef.value?.focus());
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
  flex-shrink: 0;
}

.add-collection.form-open {
  flex: 1;
}

.new-btn {
  padding: 0 11px 0 9px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-icon {
  position: absolute;
  left: 10px;
  color: var(--text-3);
  pointer-events: none;
}

.collection-input {
  flex: 1;
  padding-left: 32px;
}

.collection-input.error {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.name-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--danger-text);
  font-size: 12px;
}
</style>
