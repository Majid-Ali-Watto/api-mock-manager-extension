import { computed, onMounted, onUnmounted, ref, toRef } from "vue";
import {
  getApisByCollection,
  deleteApi as deleteApiFromDB,
  toggleApiEnabled,
  toggleApiPinned,
  reorderCollectionApis,
  duplicateApi,
  addApi,
  updateApi,
} from "../../db/apis.repo";
import {
  getCollections,
  updateCollection,
  deleteCollection as deleteCollectionFromDB,
  toggleCollectionEnabled,
  toggleCollectionPinned,
  updateCollectionSites,
} from "../../db/collections.repo";
import { parseSitePatterns } from "../../utils/siteMatcher";
import { toExportApi, sanitizeImportedApi } from "../utils/apiSchema";
import {
  downloadJson,
  notifyContentScripts,
} from "../utils/helpers";
import {
  isCollectionEffectivelyDisabled as isCollectionDisabled,
  isApiEffectivelyDisabled as isApiDisabled,
} from "../utils/disabledState";
import { useCollectionSort } from "../composables/useCollectionSort";
import { useApiSort } from "../composables/useApiSort";
import { useDropdownMenu } from "../composables/useDropdownMenu";
import { useCollectionSelection } from "../composables/useCollectionSelection";
import { useCollectionSearch } from "../composables/useCollectionSearch";
import { useCollectionExpand } from "../composables/useCollectionExpand";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";
import { usePromptDialog } from "../composables/usePromptDialog";

export function useCollectionList(props) {
  const searchQuery = toRef(props, "searchQuery");
  const focusCollectionId = toRef(props, "focusCollectionId");

  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { showPrompt } = usePromptDialog();

  const collections = ref([]);
  const recording = ref(null); // { collectionId, tabId } while recording
  const apis = ref({});
  const hitCounts = ref({ apis: {}, collections: {} });
  const apiFileInput = ref(null);
  const pendingImportCollectionId = ref(null);
  const draggingApiId = ref(null);
  const dragOverApiId = ref(null);

  const { collectionSortBy, toggleCollectionSort, sortCollections } =
    useCollectionSort();
  const { apiSortBy, toggleApiSort, sortApis } = useApiSort();
  const {
    openMenuApiId,
    openMenuCollectionId,
    menuPositions,
    collectionMenuPositions,
    toggleMenu,
    getMenuStyle,
    toggleCollectionMenu,
    getCollectionMenuStyle,
    closeAllMenus,
  } = useDropdownMenu();
  const {
    selectedCollections,
    selectedApis,
    allCollectionsSelected,
    toggleAllCollections,
    toggleCollectionSelection,
    toggleAllApis,
    toggleApiSelection,
    allApisSelected,
  } = useCollectionSelection(collections, apis);
  const {
    collectionSearchVisible,
    collectionSearchQueries,
    toggleCollectionSearch,
    filterCollections,
    filterApis,
  } = useCollectionSearch(collections, apis, searchQuery);
  const {
    expandedCollections,
    toggleCollection,
    collapseAllCollections: collapseAll,
    expandAllCollections: expandAll,
  } = useCollectionExpand();

  function collapseAllCollections() {
    collapseAll(collections.value);
  }

  function expandAllCollections() {
    expandAll(collections.value);
  }

  const filteredCollections = computed(() =>
    sortCollections(filterCollections())
  );

  const getFilteredApis = (collectionId) =>
    sortApis(filterApis(collectionId), collectionId);

  const allCollectionsExpanded = computed(() => {
    if (collections.value.length === 0) return false;
    return collections.value.every((col) => expandedCollections.value[col.id]);
  });

  const allCollectionsEnabled = computed(() => {
    if (collections.value.length === 0) return false;
    return collections.value.every((col) => col.enabled !== false);
  });

  function isCollectionEffectivelyDisabled(collectionId) {
    const collection = collections.value.find((c) => c.id === collectionId);
    const apiList = apis.value[collectionId] || [];
    return isCollectionDisabled(collection, apiList);
  }

  function isApiEffectivelyDisabled(api, collectionId) {
    const collection = collections.value.find((c) => c.id === collectionId);
    return isApiDisabled(api, collection);
  }

  async function loadHitCounts() {
    if (typeof chrome === "undefined" || !chrome?.runtime?.sendMessage) return;
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_HIT_COUNTS" });
      if (response?.hitCounts) {
        hitCounts.value = response.hitCounts;
      }
    } catch {
      // popup can be opened in dev mode where extension APIs are unavailable
    }
  }

  function getApiHitCount(apiId) {
    return hitCounts.value.apis?.[apiId] || 0;
  }

  function getCollectionHitCount(collectionId) {
    return hitCounts.value.collections?.[collectionId] || 0;
  }

  async function toggleApiPinnedStatus(collectionId, apiId, pinned) {
    await toggleApiPinned(apiId, pinned);
    await loadApis(collectionId);
  }

  async function toggleCollectionPinnedStatus(collectionId, pinned) {
    await toggleCollectionPinned(collectionId, pinned);
    await loadCollections();
  }

  function onApiDragStart(collectionId, apiId) {
    draggingApiId.value = apiId;
  }

  function onApiDragOver(apiId) {
    dragOverApiId.value = apiId;
  }

  async function onApiDrop(collectionId, targetApiId) {
    const fromId = draggingApiId.value;
    if (!fromId || fromId === targetApiId) { onApiDragEnd(); return; }

    const displayed = getFilteredApis(collectionId);
    const fromApi = displayed.find((a) => a.id === fromId);
    const toApi = displayed.find((a) => a.id === targetApiId);

    // Don't allow dragging across pinned/non-pinned boundary
    if (!!fromApi?.pinned !== !!toApi?.pinned) { onApiDragEnd(); return; }

    const fromIdx = displayed.findIndex((a) => a.id === fromId);
    const toIdx = displayed.findIndex((a) => a.id === targetApiId);

    const newOrder = [...displayed];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);

    // Optimistic update so the list snaps immediately
    apis.value = {
      ...apis.value,
      [collectionId]: newOrder.map((a, i) => ({ ...a, position: i })),
    };

    onApiDragEnd();
    await reorderCollectionApis(collectionId, newOrder.map((a) => a.id));
  }

  function onApiDragEnd() {
    draggingApiId.value = null;
    dragOverApiId.value = null;
  }

  async function loadCollections() {
    const prevExpanded = { ...expandedCollections.value };
    collections.value = await getCollections();
    const focusId = focusCollectionId.value;
    for (const col of collections.value) {
      expandedCollections.value[col.id] = focusId
        ? col.id === focusId
        : prevExpanded[col.id] !== undefined
          ? prevExpanded[col.id]
          : true;
      await loadApis(col.id);
    }
  }

  async function loadApis(collectionId) {
    const apiList = await getApisByCollection(collectionId);
    apis.value[collectionId] = apiList;
  }

  async function startRenameCollection(collection) {
    openMenuCollectionId.value = null;
    const newName = await showPrompt("Enter new collection name:", collection.name);
    if (!newName || newName === collection.name) return;

    const conflict = collections.value.find(
      (c) => c.id !== collection.id && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (conflict) {
      showToast(`A collection named "${conflict.name}" already exists.`, "error");
      return;
    }

    await updateCollection(collection.id, newName);
    await loadCollections();
  }

  async function editCollectionSites(collection) {
    openMenuCollectionId.value = null;
    const current = (collection.sites || []).join(", ") || "*";
    const input = await showPrompt(
      "Sites this collection's mocks apply to (comma separated).\nExamples: localhost:3000, *.example.com — use * for all sites:",
      current
    );
    if (input === null || input === current) return;

    const { sites, invalid } = parseSitePatterns(input);
    if (invalid.length) {
      showToast(`Invalid site pattern(s): ${invalid.join(", ")}`, "error", 5000);
      return;
    }
    await updateCollectionSites(collection.id, sites);
    await loadCollections();
    notifyContentScripts();
    showToast(
      sites.length
        ? `"${collection.name}" now applies to: ${sites.join(", ")}`
        : `"${collection.name}" now applies to all sites`
    );
  }

  async function loadSettings() {
    if (typeof chrome === "undefined" || !chrome?.runtime?.sendMessage) return;
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      recording.value = response?.settings?.recording || null;
    } catch {
      // extension APIs unavailable (dev mode)
    }
  }

  // Records real responses from the active tab into this collection (saved disabled).
  async function toggleRecording(collection) {
    openMenuCollectionId.value = null;
    try {
      if (recording.value?.collectionId === collection.id) {
        await chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
        recording.value = null;
        showToast("Recording stopped");
        return;
      }
      if (props.tabMode) {
        showToast("Open the extension popup on the page you want to record.", "error", 5000);
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.id < 0) {
        showToast("No active tab to record.", "error");
        return;
      }
      await chrome.runtime.sendMessage({ type: "START_RECORDING", collectionId: collection.id, tabId: tab.id });
      recording.value = { collectionId: collection.id, tabId: tab.id };
      const scope = collection.sites?.length ? ` on ${collection.sites.join(", ")}` : "";
      showToast(
        `Recording the current tab${scope} into "${collection.name}". New mocks are saved disabled — enable them when ready.`,
        "success",
        6000
      );
    } catch (err) {
      showToast("Could not change recording: " + err.message, "error");
    }
  }

  // Activates one variant name across every API in the collection ("main" = default).
  async function switchCollectionScenario(collection) {
    openMenuCollectionId.value = null;
    const list = apis.value[collection.id] || [];
    const names = [...new Set(list.flatMap((a) => (a.variants || []).map((v) => v.name)))];
    if (!names.length) {
      showToast("No API in this collection has variants yet. Add them in the API form (🎭 Variants).", "error", 5000);
      return;
    }
    const actives = [...new Set(list.map((a) => a.activeVariant || ""))];
    const current = actives.length === 1 && actives[0] ? actives[0] : "main";
    const input = await showPrompt(
      `Activate a variant on every API in "${collection.name}".\nAvailable: ${names.join(", ")}\nType "main" for the main responses:`,
      current
    );
    if (input === null) return;
    const target = input.trim().toLowerCase() === "main" ? "" : input.trim();
    if (target && !names.includes(target)) {
      showToast(`No variant named "${target}".`, "error");
      return;
    }
    let changed = 0;
    for (const api of list) {
      const next = target && (api.variants || []).some((v) => v.name === target) ? target : "";
      if ((api.activeVariant || "") !== next) {
        await updateApi(api.id, { activeVariant: next });
        changed++;
      }
    }
    await loadApis(collection.id);
    notifyContentScripts();
    showToast(`Scenario "${target || "main"}" active (${changed} API(s) changed)`);
  }

  async function deleteCollection(collectionId) {
    openMenuCollectionId.value = null;
    const ok = await showConfirm(
      "Delete this collection and all its APIs? This cannot be undone.",
      { confirmLabel: "Delete", dangerous: true }
    );
    if (!ok) return;
    await deleteCollectionFromDB(collectionId);
    selectedCollections.value.delete(collectionId);
    await loadCollections();
  }

  async function toggleCollectionEnabledStatus(collectionId, enabled) {
    await toggleCollectionEnabled(collectionId, enabled);
    await loadCollections();
    notifyContentScripts();
  }

  async function toggleAllCollectionsEnabled(enabled) {
    await Promise.all(
      collections.value.map((col) => toggleCollectionEnabled(col.id, enabled))
    );
    await loadCollections();
    notifyContentScripts();
  }

  async function deleteSelectedCollections() {
    const count = selectedCollections.value.size;
    const ok = await showConfirm(
      `Delete ${count} collection(s) and all their APIs? This cannot be undone.`,
      { confirmLabel: "Delete", dangerous: true }
    );
    if (!ok) return;
    await Promise.all(
      [...selectedCollections.value].map((id) => deleteCollectionFromDB(id))
    );
    selectedCollections.value.clear();
    await loadCollections();
  }

  const buildApiExportJson = toExportApi;

  async function copyApiAsJson(api) {
    openMenuApiId.value = null;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(buildApiExportJson(api), null, 2)
      );
      showToast("API copied as JSON");
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast("Failed to copy to clipboard", "error");
    }
  }

  async function downloadApiAsJson(api) {
    openMenuApiId.value = null;
    const filename = `${api.label.replace(/[^a-z0-9]/gi, "_")}_${api.method}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    downloadJson(buildApiExportJson(api), filename);
    showToast("API downloaded as JSON");
  }

  async function downloadPayload(payload, type, apiLabel) {
    if (!payload || payload === "None") {
      showToast(`No ${type} payload to download`, "error");
      return;
    }

    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const safeLabel = apiLabel.replace(/[^a-z0-9]/gi, "_");
    const date = new Date().toISOString().split("T")[0];

    try {
      downloadJson(JSON.parse(payload), `${safeLabel}_${type}_${date}.json`);
      showToast(`${label} payload downloaded`);
    } catch {
      const blob = new Blob([payload], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeLabel}_${type}_${date}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`${label} payload downloaded as text`);
    }
  }

  async function exportCollection(collectionId) {
    openMenuCollectionId.value = null;
    try {
      const collection = collections.value.find((c) => c.id === collectionId);
      if (!collection) return;

      const apiList = apis.value[collectionId] || [];
      const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        collections: [
          {
            name: collection.name,
            enabled: collection.enabled,
            createdAt: collection.createdAt,
            sites: collection.sites || [],
            apis: apiList.map(buildApiExportJson),
          },
        ],
      };

      downloadJson(
        data,
        `${collection.name.replace(/[^a-z0-9]/gi, "_")}_${
          new Date().toISOString().split("T")[0]
        }.json`
      );
      showToast(`Collection "${collection.name}" exported`);
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export collection: " + error.message, "error");
    }
  }

  async function exportSelectedCollections() {
    try {
      const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        collections: [],
      };

      for (const collectionId of selectedCollections.value) {
        const collection = collections.value.find((c) => c.id === collectionId);
        if (collection) {
          const apiList = apis.value[collectionId] || [];
          data.collections.push({
            name: collection.name,
            enabled: collection.enabled,
            createdAt: collection.createdAt,
            sites: collection.sites || [],
            apis: apiList.map(buildApiExportJson),
          });
        }
      }

      downloadJson(
        data,
        `selected_collections_${new Date().toISOString().split("T")[0]}.json`
      );
      showToast(`Exported ${data.collections.length} collection(s)`);
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export collections: " + error.message, "error");
    }
  }

  async function exportSelectedApis(collectionId) {
    try {
      const collection = collections.value.find((c) => c.id === collectionId);
      if (!collection) return;

      const selectedApiIds = selectedApis.value[collectionId] || new Set();
      const selectedApisList = (apis.value[collectionId] || []).filter((api) =>
        selectedApiIds.has(api.id)
      );

      const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        collections: [
          {
            name: collection.name,
            enabled: collection.enabled,
            createdAt: collection.createdAt,
            sites: collection.sites || [],
            apis: selectedApisList.map(buildApiExportJson),
          },
        ],
      };

      downloadJson(
        data,
        `${collection.name.replace(/[^a-z0-9]/gi, "_")}_selected_apis_${
          new Date().toISOString().split("T")[0]
        }.json`
      );
      showToast(`Exported ${selectedApisList.length} API(s) from "${collection.name}"`);
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export APIs: " + error.message, "error");
    }
  }

  function triggerApiImport(collectionId) {
    openMenuCollectionId.value = null;
    pendingImportCollectionId.value = collectionId;
    apiFileInput.value?.click();
  }

  async function handleApiFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const apiData = sanitizeImportedApi(JSON.parse(text));

      if (!apiData) {
        showToast("Invalid API file: missing or invalid method or url.", "error");
        return;
      }

      const collectionId = pendingImportCollectionId.value;
      if (!collectionId) {
        showToast("No collection selected for import.", "error");
        return;
      }

      await addApi({ ...apiData, collectionId });
      notifyContentScripts();

      await loadApis(collectionId);
      showToast(`API "${apiData.label}" imported`);
    } catch (error) {
      console.error("Import error:", error);
      showToast("Failed to import API: " + error.message, "error");
    } finally {
      event.target.value = "";
      pendingImportCollectionId.value = null;
    }
  }

  async function deleteApi(collectionId, apiId) {
    openMenuApiId.value = null;
    const ok = await showConfirm("Delete this API? This cannot be undone.", {
      confirmLabel: "Delete",
      dangerous: true,
    });
    if (!ok) return;
    await deleteApiFromDB(apiId);
    await loadApis(collectionId);
  }

  async function toggleApiEnabledStatus(collectionId, apiId, enabled) {
    await toggleApiEnabled(apiId, enabled);
    await loadApis(collectionId);
    notifyContentScripts();
  }

  async function setAllApisEnabled(collectionId, enabled) {
    const apiList = apis.value[collectionId] || [];
    await Promise.all(apiList.map((api) => toggleApiEnabled(api.id, enabled)));
    await loadApis(collectionId);
    notifyContentScripts();
  }

  async function duplicateApiItem(collectionId, apiId) {
    openMenuApiId.value = null;
    await duplicateApi(apiId);
    await loadApis(collectionId);
  }

  async function deleteSelectedApis(collectionId) {
    const count = selectedApis.value[collectionId]?.size || 0;
    if (count === 0) return;
    const ok = await showConfirm(`Delete ${count} API(s)? This cannot be undone.`, {
      confirmLabel: "Delete",
      dangerous: true,
    });
    if (!ok) return;
    await Promise.all(
      [...selectedApis.value[collectionId]].map((id) => deleteApiFromDB(id))
    );
    selectedApis.value[collectionId].clear();
    await loadApis(collectionId);
  }

  const handleDocumentClick = () => closeAllMenus();
  const handleRuntimeMessage = (message) => {
    if (message.type === "HIT_COUNTS_UPDATED" && message.hitCounts) {
      hitCounts.value = message.hitCounts;
    } else if (message.type === "SETTINGS_UPDATED") {
      recording.value = message.settings?.recording || null;
    } else if (message.type === "API_RECORDED" && message.collectionId) {
      loadApis(message.collectionId);
    }
  };

  onMounted(async () => {
    await loadCollections();
    await loadHitCounts();
    await loadSettings();
    document.addEventListener("click", handleDocumentClick);

    if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    }
  });

  onUnmounted(() => {
    document.removeEventListener("click", handleDocumentClick);
    if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    }
  });

  return {
    collections,
    apis,
    hitCounts,
    expandedCollections,
    selectedCollections,
    selectedApis,
    collectionSearchVisible,
    openMenuApiId,
    openMenuCollectionId,
    menuPositions,
    collectionMenuPositions,
    apiFileInput,
    pendingImportCollectionId,
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
    loadApis,
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
    draggingApiId,
    dragOverApiId,
    toggleApiPinnedStatus,
    toggleCollectionPinnedStatus,
    onApiDragStart,
    onApiDragOver,
    onApiDrop,
    onApiDragEnd,
  };
}
