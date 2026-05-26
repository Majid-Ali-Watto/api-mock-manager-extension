import { ref } from "vue";

export function useCollectionSort() {
  const collectionSortBy = ref("name"); // "name" or "date"

  function toggleCollectionSort() {
    collectionSortBy.value = collectionSortBy.value === "name" ? "date" : "name";
  }

  function sortCollections(collections) {
    return [...collections].sort((a, b) => {
      // Pinned always first
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
