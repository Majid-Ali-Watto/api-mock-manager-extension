import { ref, computed } from "vue";

export function useCollectionSelection(collections, apis) {
  const selectedCollections = ref(new Set());
  const selectedApis = ref({});

  const allCollectionsSelected = computed(() => {
    return (
      collections.value.length > 0 &&
      selectedCollections.value.size === collections.value.length
    );
  });

  function toggleAllCollections() {
    if (allCollectionsSelected.value) {
      selectedCollections.value.clear();
      // Deselect all APIs in all collections
      collections.value.forEach((col) => {
        if (selectedApis.value[col.id]) {
          selectedApis.value[col.id].clear();
        }
      });
    } else {
      collections.value.forEach((col) => {
        selectedCollections.value.add(col.id);
        // Select all APIs in this collection
        if (!selectedApis.value[col.id]) {
          selectedApis.value[col.id] = new Set();
        }
        const apiList = apis.value[col.id] || [];
        apiList.forEach((api) => selectedApis.value[col.id].add(api.id));
      });
    }
    selectedCollections.value = new Set(selectedCollections.value);
  }

  function toggleCollectionSelection(collectionId) {
    if (selectedCollections.value.has(collectionId)) {
      selectedCollections.value.delete(collectionId);
      // Deselect all APIs in this collection
      if (selectedApis.value[collectionId]) {
        selectedApis.value[collectionId].clear();
      }
    } else {
      selectedCollections.value.add(collectionId);
      // Select all APIs in this collection
      if (!selectedApis.value[collectionId]) {
        selectedApis.value[collectionId] = new Set();
      }
      const apiList = apis.value[collectionId] || [];
      apiList.forEach((api) => selectedApis.value[collectionId].add(api.id));
    }
    selectedCollections.value = new Set(selectedCollections.value);
  }

  function toggleAllApis(collectionId) {
    if (!selectedApis.value[collectionId]) {
      selectedApis.value[collectionId] = new Set();
    }

    const apiList = apis.value[collectionId] || [];
    if (selectedApis.value[collectionId].size === apiList.length) {
      selectedApis.value[collectionId].clear();
    } else {
      apiList.forEach((api) => selectedApis.value[collectionId].add(api.id));
    }
    selectedApis.value[collectionId] = new Set(selectedApis.value[collectionId]);
  }

  function toggleApiSelection(collectionId, apiId) {
    if (!selectedApis.value[collectionId]) {
      selectedApis.value[collectionId] = new Set();
    }

    if (selectedApis.value[collectionId].has(apiId)) {
      selectedApis.value[collectionId].delete(apiId);
    } else {
      selectedApis.value[collectionId].add(apiId);
    }
    selectedApis.value[collectionId] = new Set(selectedApis.value[collectionId]);
  }

  function allApisSelected(collectionId) {
    const apiList = apis.value[collectionId] || [];
    return (
      apiList.length > 0 &&
      selectedApis.value[collectionId]?.size === apiList.length
    );
  }

  return {
    selectedCollections,
    selectedApis,
    allCollectionsSelected,
    toggleAllCollections,
    toggleCollectionSelection,
    toggleAllApis,
    toggleApiSelection,
    allApisSelected,
  };
}
