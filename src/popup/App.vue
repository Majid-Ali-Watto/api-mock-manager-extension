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
      <div class="import-card">
        <span class="import-icon"><Icon name="download" :size="22" /></span>
        <h2>Import collections</h2>
        <p class="import-tab-hint">Choose one or more exported JSON files. You can merge them into your data or replace everything.</p>
        <button class="ui-btn ui-btn--primary ui-btn--lg" @click="importFileRef.click()">
          <Icon name="file" :size="15" /> Select file(s)
        </button>
      </div>
      <input ref="importFileRef" type="file" accept=".json" multiple @change="handleTabFileImport" style="display:none" />
    </div>

    <template v-else-if="!isApiViewTab && !isApiFormTab && !isImportTab">
      <main>
        <header class="top-bar">
          <div v-if="!isCollectionFormOpen" class="brand" title="API Mock Manager">
            <img src="/icon.svg" alt="" class="brand-logo" />
            <span class="brand-name">API Mock</span>
          </div>
          <SearchBar v-if="!isCollectionFormOpen" v-model="searchQuery" @clear="searchQuery = ''" />
          <AddCollection @collectionAdded="refreshCollections" @formToggled="handleFormToggle" />
          <ActionButtons v-if="!isCollectionFormOpen" :theme="theme" :mocks-enabled="mocksEnabled"
            @export="exportData" @import="importData"
            @toggleInfo="toggleSidebar" @toggleTheme="toggleTheme"
            @toggleMocks="toggleMocks" @toggleLog="logOpen = !logOpen" />
        </header>

        <div v-if="!mocksEnabled" class="mocks-off-banner">
          <Icon name="power" :size="14" />
          <span>All mocks are off — pages get real responses.</span>
          <button class="ui-btn ui-btn--sm" @click="toggleMocks">Turn on</button>
        </div>

        <CollectionList ref="collectionListRef" :search-query="searchQuery" :focus-collection-id="focusCollectionId" :tab-mode="isCollectionTab" />

        <InfoSidebar :is-open="sidebarOpen" @close="closeSidebar" />
        <RequestLog :is-open="logOpen" @close="logOpen = false" />
      </main>

    </template>

    <ToastContainer />
    <ConfirmDialog />
    <PromptDialog />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
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
import RequestLog from "./components/RequestLog.vue";
import Icon from "./components/Icon.vue";
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
// Tokens live on :root (see styles/base.css) so teleported dialogs are themed too.
watch(theme, (value) => {
  document.documentElement.dataset.theme = value === "dark" ? "dark" : "light";
}, { immediate: true });
const mocksEnabled = ref(true);
const logOpen = ref(false);
const hasExtensionApi = typeof chrome !== "undefined" && !!chrome?.runtime?.sendMessage;

async function loadSettings() {
  if (!hasExtensionApi) return;
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    mocksEnabled.value = response?.settings?.mocksEnabled !== false;
  } catch {
    // background not ready
  }
}

async function toggleMocks() {
  if (!hasExtensionApi) return;
  const next = !mocksEnabled.value;
  mocksEnabled.value = next;
  try {
    await chrome.runtime.sendMessage({ type: "SET_MOCKS_ENABLED", enabled: next });
    showToast(next ? "Mocks turned on" : "All mocks turned off");
  } catch (err) {
    mocksEnabled.value = !next;
    showToast("Could not change mock state: " + err.message, "error");
  }
}

function handleRuntimeMessage(message) {
  if (message.type === "SETTINGS_UPDATED") {
    mocksEnabled.value = message.settings?.mocksEnabled !== false;
  }
}

onMounted(() => {
  loadSettings();
  if (hasExtensionApi) chrome.runtime.onMessage.addListener(handleRuntimeMessage);
});

onUnmounted(() => {
  if (hasExtensionApi) chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
});

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
.app {
  background: var(--bg);
  color: var(--text);
  position: relative;
  isolation: isolate;
}

main {
  display: flex;
  flex-direction: column;
}

.app:not(.tab-mode) main {
  width: 700px;
  min-width: 700px;
}

.app.tab-mode {
  min-height: 100dvh;
}

.app.tab-mode main {
  width: 100%;
  min-height: 100dvh;
}

.api-view-tab-wrapper {
  width: 100%;
  min-height: 100dvh;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.app.tab-mode .top-bar {
  padding: 12px max(16px, calc((100% - 960px) / 2));
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.brand-logo {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.brand-name {
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.mocks-off-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 14px 0;
  padding: 8px 10px 8px 12px;
  border: 1px solid var(--warning);
  border-radius: var(--radius);
  background: var(--warning-soft);
  color: var(--warning-text);
  font-size: 12.5px;
  font-weight: 600;
}

.mocks-off-banner span {
  flex: 1;
}

.import-tab-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 24px;
}

.import-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 380px;
  padding: 32px 28px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.import-card h2 {
  margin: 4px 0 0;
  font-size: 17px;
}

.import-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
}

.import-tab-hint {
  margin: 0 0 8px;
  color: var(--text-2);
  font-size: 13px;
}
</style>
