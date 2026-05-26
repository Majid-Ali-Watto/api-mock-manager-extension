<template>
  <div class="collections-container" :class="{ 'tab-mode': tabMode }">
    <div v-if="collections.length === 0" class="empty-state">
      <p>No collections yet. Create one above!</p>
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
              <MenuItem icon="📤" label="Import API" @click="triggerApiImport(col.id)" />
              <MenuItem icon="📥" label="Export Collection" @click="exportCollection(col.id)" />
              <MenuItem icon="▶️" label="Enable All APIs" @click="setAllApisEnabled(col.id, true)" />
              <MenuItem icon="⏸️" label="Disable All APIs" @click="setAllApisEnabled(col.id, false)" />
              <MenuItem 
                :icon="(apiSortBy[col.id] || 'name') === 'name' ? '🔤' : '📅'" 
                :label="`Sort APIs by ${(apiSortBy[col.id] || 'name') === 'name' ? 'Date' : 'Name'}`" 
                @click="toggleApiSort(col.id)" 
              />
              <MenuItem :icon="col.pinned ? '★' : '☆'" :label="col.pinned ? 'Unpin' : 'Pin to top'" @click="toggleCollectionPinnedStatus(col.id, !col.pinned)" />
              <MenuItem icon="✏️" label="Rename" @click="startRenameCollection(col)" />
              <MenuItem icon="🗑️" label="Delete" :is-delete="true" @click="deleteCollection(col.id)" />
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
              <label class="select-all-label small">
                <input
                  type="checkbox"
                  :checked="allApisSelected(col.id)"
                  @change="toggleAllApis(col.id)"
                  class="checkbox small-checkbox"
                />
                Select All APIs
              </label>
              <div class="api-actions-buttons">
                <button
                  v-if="selectedApis[col.id]?.size > 0"
                  @click="exportSelectedApis(col.id)"
                  class="bulk-action-btn small export-btn"
                >
                  📥 Export
                </button>
                <button
                  v-if="selectedApis[col.id]?.size > 0"
                  @click="deleteSelectedApis(col.id)"
                  class="bulk-delete-btn small"
                >
                  🗑️ {{ selectedApis[col.id].size }} API(s)
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
                    <MenuItem icon="👁️" label="View" @click="openApiInTab(api.id)" />
                    <MenuItem icon="📋" label="Copy JSON" @click="copyApiAsJson(api)" />
                    <MenuItem icon="📥" label="Download JSON" @click="downloadApiAsJson(api)" />
                    <MenuItem icon="📋" label="Duplicate" @click="duplicateApiItem(col.id, api.id)" />
                    <MenuItem :icon="api.pinned ? '★' : '☆'" :label="api.pinned ? 'Unpin' : 'Pin to top'" @click="toggleApiPinnedStatus(col.id, api.id, !api.pinned)" />
                    <MenuItem icon="✏️" label="Edit" @click="openEditApiInTab(api)" />
                    <MenuItem icon="🗑️" label="Delete" :is-delete="true" @click="deleteApi(col.id, api.id)" />
                  </DropdownMenu>
                </template>
              </ApiItem>
            </div>
          </div>
          <div v-else class="no-apis">
            <p>No APIs yet. Click "Add API" above!</p>
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
  padding: 10px 5px;
  background: var(--panel-bg);
  height: 500px;
  min-height: 500px;
  overflow-y: auto;
}

.collections-container.tab-mode {
  height: auto;
  min-height: 0;
  overflow-y: visible;
  display: flex;
  flex-direction: column;
}

.collection-container-inner {
  border: 2px solid var(--border-soft);
  border-radius: 12px 12px 0 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.empty-state {
  text-align: center;
  color: var(--text-faint);
  font-style: italic;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.collection-card {
  background: var(--surface-bg);
  border-radius: 12px 12px 0 0;
  margin-bottom: 16px;
  box-shadow: var(--card-shadow);
 border: 1px solid var(--border-soft);
  overflow: visible;
  transition: all 0.3s ease;
  position: relative;
  margin-inline: 5px;
}

.collection-card.collection-disabled .collection-title {
  text-decoration: line-through;
}

.collection-content {
  padding: 6px 10px;
  animation: slideDown 0.3s ease;
  border-radius: 0 0 12px 12px;
  position: relative;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 2000px;
  }
}

.api-bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  background: var(--surface-soft);
  border-radius: 6px;
  margin-bottom: 12px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-body);
  cursor: pointer;
}

.select-all-label.small {
  font-size: 12px;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.small-checkbox {
  width: 16px !important;
  height: 16px !important;
}

.api-actions-buttons {
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.bulk-action-btn {
  padding: 5px 10px;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #6c757d;
}

.bulk-action-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.bulk-action-btn.export-btn {
  background: #6c757d;
}

.bulk-action-btn.export-btn:hover {
  background: #5a6268;
}

.bulk-delete-btn {
  padding: 5px 10px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bulk-delete-btn:hover {
  background: #c82333;
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.bulk-delete-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.api-list {
  overflow: visible;
  position: relative;
}

.no-apis {
  text-align: center;
  padding: 20px;
  color: var(--text-faint);
  font-size: 13px;
  font-style: italic;
}
</style>
