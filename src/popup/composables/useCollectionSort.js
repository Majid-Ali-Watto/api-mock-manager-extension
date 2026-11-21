import { ref } from "vue";

export function useCollectionSort() {
  const collectionSortBy = ref("name"); // "name" or "date"

  function toggleCollectionSort() {
    collectionSortBy.value = collectionSortBy.value === "name" ? "date" : "name";
  }

  function sortCollections(collections) {
    // Order: pinned active → active → pinned paused → paused, then by name/date.
    return [...collections].sort((a, b) => {
      const aActive = a.enabled !== false;
      const bActive = b.enabled !== false;
      if (aActive !== bActive) return aActive ? -1 : 1;
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (collectionSortBy.value === "name") return a.name.localeCompare(b.name);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  return {
    collectionSortBy,
    toggleCollectionSort,
    sortCollections,
  };
}
