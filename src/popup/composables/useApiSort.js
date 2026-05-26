import { ref } from "vue";

export function useApiSort() {
  const apiSortBy = ref({}); // { collectionId: "name" or "date" }

  function toggleApiSort(collectionId) {
    const currentSort = apiSortBy.value[collectionId] || "name";
    apiSortBy.value[collectionId] = currentSort === "name" ? "date" : "name";
    apiSortBy.value = { ...apiSortBy.value }; // Trigger reactivity
  }

  function sortApis(apis, collectionId) {
    const sortBy = apiSortBy.value[collectionId] || "name";
    const hasPositions = apis.some((a) => a.position !== undefined && a.position !== null);
    return [...apis].sort((a, b) => {
      // Pinned always first
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      // Manual position order (set by drag-and-drop)
      if (hasPositions) {
        const posA = a.position ?? Infinity;
        const posB = b.position ?? Infinity;
        if (posA !== posB) return posA - posB;
      }
      // Fall back to name/date sort
      if (sortBy === "name") return (a.label || "").localeCompare(b.label || "");
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  return {
    apiSortBy,
    toggleApiSort,
    sortApis,
  };
}
