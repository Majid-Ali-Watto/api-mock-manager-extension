<template>
  <div class="app" :class="[`theme-${theme}`, { 'tab-mode': isCollectionTab || isApiViewTab || isApiFormTab }]">
    <!-- API detail tab -->
    <div v-if="isApiViewTab" class="api-view-tab-wrapper">
      <ApiDetailPage :api-id="apiViewId" />
    </div>

    <!-- API form tab (add / edit) -->
    <div v-else-if="isApiFormTab" class="api-view-tab-wrapper">
      <ApiFormPage />
    </div>

    <!-- Import tab: show a single button so the click counts as a user gesture -->
    <div v-else-if="isImportTab" class="import-tab-view">
      <p class="import-tab-hint">Select the JSON file you want to import.</p>
      <button class="import-tab-btn" @click="importFileRef.click()">📂 Select File(s)</button>
      <input ref="importFileRef" type="file" accept=".json" multiple @change="handleTabFileImport" style="display:none" />
    </div>

    <template v-else-if="!isApiViewTab && !isApiFormTab && !isImportTab">
      <main>
        <div class="top-bar">
          <SearchBar v-if="!isCollectionFormOpen" v-model="searchQuery" @clear="searchQuery = ''" />
          <AddCollection @collectionAdded="refreshCollections" @formToggled="handleFormToggle" />
          <ActionButtons v-if="!isCollectionFormOpen" :theme="theme" @export="exportData" @import="importData"
            @toggleInfo="toggleSidebar" @toggleTheme="toggleTheme" />
        </div>

        <hr />

        <CollectionList ref="collectionListRef" :search-query="searchQuery" :focus-collection-id="focusCollectionId" :tab-mode="isCollectionTab" />

        <InfoSidebar :is-open="sidebarOpen" @close="closeSidebar" />
      </main>

    </template>

    <ToastContainer />
    <ConfirmDialog />
    <PromptDialog />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useToast } from "./composables/useToast";
import SearchBar from "./components/SearchBar.vue";
import ActionButtons from "./components/ActionButtons.vue";
import AddCollection from "./components/AddCollection.vue";
import CollectionList from "./components/CollectionList.vue";
import InfoSidebar from "./components/InfoSidebar.vue";
import ToastContainer from "./components/ToastContainer.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import PromptDialog from "./components/PromptDialog.vue";
import ApiDetailPage from "./components/ApiDetailPage.vue";
import ApiFormPage from "./components/ApiFormPage.vue";
import { useCollectionsImportExport } from "./scripts/useCollectionsImportExport";

const params = new URLSearchParams(window.location.search);
const isImportTab = params.get("action") === "import";
const isCollectionTab = params.get("action") === "collection";
const isApiViewTab = params.get("action") === "api-view";
const isApiFormTab = params.get("action") === "api-form";
const focusCollectionId = isCollectionTab ? Number(params.get("id")) : null;
const apiViewId = isApiViewTab ? Number(params.get("id")) : null;

const { showToast } = useToast();
const collectionListRef = ref(null);
const searchQuery = ref("");
const isCollectionFormOpen = ref(false);
const sidebarOpen = ref(false);
const theme = ref(localStorage.getItem("api-mock-theme") || "current");

const { exportData, importData, processFilesImport } = useCollectionsImportExport({
  onRefresh: refreshCollections,
});

const importFileRef = ref(null);

async function handleTabFileImport(event) {
  const files = event.target.files;
  if (!files?.length) return;
  try {
    await processFilesImport(files);
  } catch (err) {
    showToast("Failed to import data: " + err.message, "error");
  } finally {
    window.close();
  }
}

function refreshCollections() {
  collectionListRef.value?.loadCollections();
}

function handleFormToggle(isOpen) {
  isCollectionFormOpen.value = isOpen;
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function closeSidebar() {
  sidebarOpen.value = false;
}

function toggleTheme() {
  theme.value = theme.value === "dark" ? "current" : "dark";
  localStorage.setItem("api-mock-theme", theme.value);
}

</script>

<style scoped>
/* Hide scrollbar but keep functionality */
* {
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* IE and Edge */
}

*::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari, Opera */
}

.app {
  --app-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --app-border: #764ba2;
  --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --panel-bg: #F9F6EE;
  --surface-bg: #ffffff;
  --surface-muted: #f8f9fa;
  --surface-soft: #EFEFEF;
  --text-main: #212529;
  --text-body: #495057;
  --text-muted: #6c757d;
  --text-faint: #999999;
  --border-color: #dee2e6;
  --border-soft: #e9ecef;
  --field-bg: #ffffff;
  --field-text: #333333;
  --field-border: #ced4da;
  --button-bg: rgba(255, 255, 255, 0.95);
  --button-hover-bg: #ffffff;
  --primary: #667eea;
  --focus-ring: rgba(102, 126, 234, 0.1);
  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --menu-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --code-bg: #212529;
  --code-text: #f8f9fa;
  --search-match-bg: #fff3cd;
  --search-match-border: #ffc107;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  background: var(--app-bg);
  color: #fff;
  border: 1px solid var(--app-border);
  overflow-y: auto;
  position: relative;
  isolation: isolate;
  opacity: 1;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.app.theme-dark {
  --app-bg: linear-gradient(135deg, #111827 0%, #0f172a 100%);
  --app-border: #263142;
  --header-bg: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  --panel-bg: #0b1120;
  --surface-bg: #111827;
  --surface-muted: #172033;
  --surface-soft: #223047;
  --text-main: #f8fafc;
  --text-body: #d5dde8;
  --text-muted: #9aa8ba;
  --text-faint: #7f8ea3;
  --border-color: #2b384c;
  --border-soft: #263142;
  --field-bg: #0f172a;
  --field-text: #f8fafc;
  --field-border: #35445b;
  --button-bg: #1f2937;
  --button-hover-bg: #2b384c;
  --primary: #60a5fa;
  --focus-ring: rgba(96, 165, 250, 0.18);
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  --menu-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  --code-bg: #020617;
  --code-text: #e5edf7;
  --search-match-bg: #3b3213;
  --search-match-border: #d7a520;
}

main {
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

.app:not(.tab-mode) main {
  width: 700px;
  min-width: 700px;
}

.app.tab-mode {
  overflow-y: visible;
  min-height: 100dvh;
}

.app.tab-mode main {
  width: 100%;
  min-width: 100%;
  min-height: 100dvh;
}

.api-view-tab-wrapper {
  width: 100%;
  min-height: 100dvh;
}

.top-bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 20px;
}

hr {
  margin: 0;
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.import-tab-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 200px;
  height: 100dvh;
}

.import-tab-hint {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  margin: 0;
}

.import-tab-btn {
  padding: 12px 28px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.import-tab-btn:hover {
  opacity: 0.85;
}
</style>
