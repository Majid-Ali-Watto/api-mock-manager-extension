<template>
  <div class="collections-container" :class="{ 'tab-mode': tabMode }">
    <div v-if="collections.length === 0" class="empty-state">
      <span class="empty-icon"><Icon name="folder" :size="22" /></span>
      <h3>No collections yet</h3>
      <p>Create a collection with <strong>New</strong>, then add the API responses you want to mock — or import an export.</p>
    </div>
    <div v-if="collections.length > 0" class="collection-container-inner">
      <CollectionBulkActions
        :all-selected="allCollectionsSelected"
        :all-expanded="allCollectionsExpanded"
        :all-enabled="allCollectionsEnabled"
        :selected-count="selectedCollections.size"
        :sort-by="collectionSortBy"
        :collection-count="collections.length"
        :total-api-count="Object.values(apis).reduce((s, l) => s + l.length, 0)"
        @toggle-all="toggleAllCollections"
        @toggle-sort="toggleCollectionSort"
        @collapse-all="collapseAllCollections"
        @expand-all="expandAllCollections"
        @enable-all="toggleAllCollectionsEnabled(true)"
        @disable-all="toggleAllCollectionsEnabled(false)"
        @export-selected="exportSelectedCollections"
        @delete-selected="deleteSelectedCollections"
      />

      <div
        v-for="col in filteredCollections"
        :key="col.id"
        class="collection-card"
        :class="{ 'collection-disabled': isCollectionEffectivelyDisabled(col.id) }"
      >
        <CollectionHeader
          :title="col.name"
          :api-count="apis[col.id]?.length || 0"
          :intercept-count="getCollectionHitCount(col.id)"
          :is-selected="selectedCollections.has(col.id)"
          :is-collapsed="!expandedCollections[col.id]"
          :has-apis="apis[col.id]?.length > 0"
          :is-enabled="col.enabled !== false"
          :is-pinned="col.pinned"
          :sites="col.sites || []"
          :is-recording="recording?.collectionId === col.id"
          @edit-sites="editCollectionSites(col)"
          @toggle-select="toggleCollectionSelection(col.id)"
          @toggle-collapse="toggleCollection(col.id)"
          @toggle-search="toggleCollectionSearch(col.id)"
          @toggle-enabled="toggleCollectionEnabledStatus(col.id, !col.enabled)"
          @toggle-pinned="toggleCollectionPinnedStatus(col.id, !col.pinned)"
          @open-in-tab="openCollectionInTab(col.id)"
          @add-api="openAddApiInTab(col.id, col.name)"
          @toggle-menu="toggleCollectionMenu(col.id, $event)"
        >
          <template #menu>
            <DropdownMenu
              v-if="openMenuCollectionId === col.id"
              :style="getCollectionMenuStyle(col.id)"
            >
              <MenuItem icon="edit" label="Rename" @click="startRenameCollection(col)" />
              <MenuItem icon="globe" label="Sites…" @click="editCollectionSites(col)" />
              <MenuItem icon="layers" label="Scenario…" @click="switchCollectionScenario(col)" />
              <MenuItem
                :icon="recording?.collectionId === col.id ? 'stop' : 'record'"
                :label="recording?.collectionId === col.id ? 'Stop recording' : 'Record from current tab'"
                @click="toggleRecording(col)"
              />
              <div class="menu-separator" />
              <MenuItem icon="play" label="Enable All APIs" @click="setAllApisEnabled(col.id, true)" />
              <MenuItem icon="pause" label="Disable All APIs" @click="setAllApisEnabled(col.id, false)" />
              <MenuItem
                :icon="(apiSortBy[col.id] || 'name') === 'name' ? 'calendar' : 'type'"
                :label="`Sort APIs by ${(apiSortBy[col.id] || 'name') === 'name' ? 'Date' : 'Name'}`"
                @click="toggleApiSort(col.id)"
              />
              <MenuItem icon="star" :filled="col.pinned" :label="col.pinned ? 'Unpin' : 'Pin to top'" @click="toggleCollectionPinnedStatus(col.id, !col.pinned)" />
              <div class="menu-separator" />
              <MenuItem icon="download" label="Import API" @click="triggerApiImport(col.id)" />
              <MenuItem icon="upload" label="Export Collection" @click="exportCollection(col.id)" />
              <div class="menu-separator" />
              <MenuItem icon="trash" label="Delete" :is-delete="true" @click="deleteCollection(col.id)" />
            </DropdownMenu>
          </template>
        </CollectionHeader>

        <CollectionSearch
          v-if="collectionSearchVisible[col.id]"
          v-model:search-query="collectionSearchQueries[col.id]"
          @clear="collectionSearchQueries[col.id] = ''"
        />

        <div v-if="expandedCollections[col.id]" class="collection-content">
          <div v-if="apis[col.id]?.length > 0">
            <div class="api-bulk-actions" v-if="selectedApis[col.id]?.size > 0">
              <label class="select-all-label">
                <input
                  type="checkbox"
                  :checked="allApisSelected(col.id)"
                  @change="toggleAllApis(col.id)"
                  class="ui-checkbox"
                />
                {{ selectedApis[col.id].size }} selected
              </label>
              <div class="api-actions-buttons">
                <button @click="exportSelectedApis(col.id)" class="ui-btn ui-btn--sm">
                  <Icon name="upload" :size="13" /> Export
                </button>
                <button @click="deleteSelectedApis(col.id)" class="ui-btn ui-btn--sm ui-btn--danger">
                  <Icon name="trash" :size="13" /> Delete
                </button>
              </div>
            </div>

            <div class="api-list">
              <ApiItem
                v-for="api in getFilteredApis(col.id)"
                :key="api.id"
                :api="api"
                :hit-count="getApiHitCount(api.id)"
                :is-selected="selectedApis[col.id]?.has(api.id)"
                :is-disabled="isApiEffectivelyDisabled(api, col.id)"
                :is-dragging="draggingApiId === api.id"
                :is-drag-over="dragOverApiId === api.id"
                @toggle-select="toggleApiSelection(col.id, api.id)"
                @toggle-enabled="toggleApiEnabledStatus(col.id, api.id, !api.enabled)"
                @toggle-pinned="toggleApiPinnedStatus(col.id, api.id, !api.pinned)"
                @toggle-menu="toggleMenu(api.id, $event)"
                @view-info="openApiInTab(api.id)"
                @drag-start="onApiDragStart(col.id, api.id)"
                @drag-over="onApiDragOver(api.id)"
                @drop="onApiDrop(col.id, api.id)"
                @drag-end="onApiDragEnd()"
              >
                <template #menu>
                  <DropdownMenu
                    v-if="openMenuApiId === api.id"
                    :style="getMenuStyle(api.id)"
                  >
                    <MenuItem icon="eye" label="View" @click="openApiInTab(api.id)" />
                    <MenuItem icon="edit" label="Edit" @click="openEditApiInTab(api)" />
                    <MenuItem icon="copy" label="Duplicate" @click="duplicateApiItem(col.id, api.id)" />
                    <MenuItem icon="star" :filled="api.pinned" :label="api.pinned ? 'Unpin' : 'Pin to top'" @click="toggleApiPinnedStatus(col.id, api.id, !api.pinned)" />
                    <div class="menu-separator" />
                    <MenuItem icon="code" label="Copy JSON" @click="copyApiAsJson(api)" />
                    <MenuItem icon="download" label="Download JSON" @click="downloadApiAsJson(api)" />
                    <div class="menu-separator" />
                    <MenuItem icon="trash" label="Delete" :is-delete="true" @click="deleteApi(col.id, api.id)" />
                  </DropdownMenu>
                </template>
              </ApiItem>
            </div>
          </div>
          <div v-else class="no-apis">
            <span>No APIs in this collection yet.</span>
            <button class="ui-btn ui-btn--sm" @click="openAddApiInTab(col.id, col.name)">
              <Icon name="plus" :size="13" /> Add API
            </button>
          </div>
        </div>
      </div>

    </div>
    <!-- Hidden file input for importing single API -->
    <input
      ref="apiFileInput"
      type="file"
      accept=".json"
      @change="handleApiFileImport"
      style="display: none"
    />
  </div>
</template>

<script setup>
import CollectionBulkActions from "./CollectionBulkActions.vue";
import CollectionHeader from "./CollectionHeader.vue";
import CollectionSearch from "./CollectionSearch.vue";
import ApiItem from "./ApiItem.vue";
import DropdownMenu from "./DropdownMenu.vue";
import MenuItem from "./MenuItem.vue";
import Icon from "./Icon.vue";
import { useCollectionList } from "../scripts/useCollectionList";

const props = defineProps({
  searchQuery: {
    type: String,
    default: "",
  },
  focusCollectionId: {
    type: Number,
    default: null,
  },
  tabMode: {
    type: Boolean,
    default: false,
  },
});

const {
  collections,
  apis,
  expandedCollections,
  selectedCollections,
  selectedApis,
  collectionSearchVisible,
  openMenuApiId,
  openMenuCollectionId,
  collectionSearchQueries,
  collectionSortBy,
  apiSortBy,
  filteredCollections,
  allCollectionsSelected,
  allCollectionsExpanded,
  allCollectionsEnabled,
  getFilteredApis,
  toggleCollectionSort,
  toggleApiSort,
  toggleAllCollections,
  toggleCollectionSelection,
  toggleAllApis,
  toggleApiSelection,
  toggleCollection,
  toggleCollectionSearch,
  collapseAllCollections,
  expandAllCollections,
  toggleMenu,
  getMenuStyle,
  toggleCollectionMenu,
  getCollectionMenuStyle,
  loadCollections,
  startRenameCollection,
  editCollectionSites,
  recording,
  toggleRecording,
  switchCollectionScenario,
  deleteCollection,
  toggleCollectionEnabledStatus,
  toggleAllCollectionsEnabled,
  deleteSelectedCollections,
  copyApiAsJson,
  downloadApiAsJson,
  downloadPayload,
  exportCollection,
  exportSelectedCollections,
  exportSelectedApis,
  triggerApiImport,
  handleApiFileImport,
  deleteApi,
  toggleApiEnabledStatus,
  setAllApisEnabled,
  duplicateApiItem,
  deleteSelectedApis,
  isCollectionEffectivelyDisabled,
  isApiEffectivelyDisabled,
  allApisSelected,
  getApiHitCount,
  getCollectionHitCount,
  apiFileInput,
  draggingApiId,
  dragOverApiId,
  toggleApiPinnedStatus,
  toggleCollectionPinnedStatus,
  onApiDragStart,
  onApiDragOver,
  onApiDrop,
  onApiDragEnd,
} = useCollectionList(props);

function openCollectionInTab(collectionId) {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html") + "?action=collection&id=" + collectionId,
  });
}

function openApiInTab(apiId) {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html") + "?action=api-view&id=" + apiId,
  });
}

function openAddApiInTab(collectionId, collectionName) {
  chrome.tabs.create({
    url:
      chrome.runtime.getURL("index.html") +
      `?action=api-form&mode=add&collectionId=${collectionId}&collectionName=${encodeURIComponent(collectionName)}`,
  });
}

function openEditApiInTab(api) {
  chrome.tabs.create({
    url:
      chrome.runtime.getURL("index.html") +
      `?action=api-form&mode=edit&apiId=${api.id}&collectionId=${api.collectionId}`,
  });
}

defineExpose({
  loadCollections,
});
</script>

<style scoped>
.collections-container {
  padding: 10px 14px 14px;
  background: var(--bg);
  height: 520px;
  overflow-y: auto;
}

.collections-container.tab-mode {
  height: auto;
  overflow-y: visible;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding-top: 16px;
}

.collection-container-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  min-height: 300px;
  padding: 32px;
  text-align: center;
  color: var(--text-2);
}

.empty-state h3 {
  margin: 6px 0 0;
  color: var(--text);
  font-size: 15px;
}

.empty-state p {
  max-width: 340px;
  margin: 0;
  font-size: 12.5px;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
}

.collection-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.collection-card:hover {
  border-color: var(--border-strong);
}

.collection-card.collection-disabled {
  background: var(--surface-2);
}

.collection-content {
  position: relative;
  padding: 2px 0 4px;
}

.api-bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 30px;
  background: var(--accent-soft);
  border-bottom: 1px solid var(--border);
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-text);
  cursor: pointer;
}

.api-actions-buttons {
  display: flex;
  gap: 6px;
}

.api-list {
  position: relative;
}

.no-apis {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  color: var(--text-3);
  font-size: 12.5px;
}
</style>
