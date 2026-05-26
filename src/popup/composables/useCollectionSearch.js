import { ref, computed } from "vue";

export function useCollectionSearch(collections, apis, globalSearchQuery) {
  const collectionSearchVisible = ref({});
  const collectionSearchQueries = ref({});

  function toggleCollectionSearch(collectionId) {
    collectionSearchVisible.value[collectionId] =
      !collectionSearchVisible.value[collectionId];

    // Clear search when hiding
    if (!collectionSearchVisible.value[collectionId]) {
      collectionSearchQueries.value[collectionId] = "";
    }
  }

  function filterCollections() {
    let result = collections.value;

    // Apply search filter
    if (globalSearchQuery.value?.trim()) {
      const query = globalSearchQuery.value.toLowerCase();
      result = result.filter((col) => {
        // Check if collection name matches
        if (col.name.toLowerCase().includes(query)) {
          return true;
        }

        // Check if any API in this collection matches
        const collectionApis = apis.value[col.id] || [];
        return collectionApis.some(
          (api) =>
            api.label.toLowerCase().includes(query) ||
            api.url.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }

  function filterApis(collectionId) {
    let collectionApis = apis.value[collectionId] || [];

    // Check both global search and collection-specific search
    const globalQuery = globalSearchQuery.value?.trim().toLowerCase() || "";
    const collectionQuery = (collectionSearchQueries.value[collectionId] || "")
      .trim()
      .toLowerCase();

    // Apply search filter
    if (globalQuery || collectionQuery) {
      collectionApis = collectionApis.filter((api) => {
        const searchInApi = (query) => {
          if (!query) return true;

          return (
            api.label.toLowerCase().includes(query) ||
            api.url.toLowerCase().includes(query) ||
            api.method.toLowerCase().includes(query) ||
            (api.requestPayload &&
              api.requestPayload.toLowerCase().includes(query)) ||
            (api.responsePayload &&
              api.responsePayload.toLowerCase().includes(query))
          );
        };

        return searchInApi(globalQuery) && searchInApi(collectionQuery);
      });
    }

    return collectionApis;
  }

  return {
    collectionSearchVisible,
    collectionSearchQueries,
    toggleCollectionSearch,
    filterCollections,
    filterApis,
  };
}
