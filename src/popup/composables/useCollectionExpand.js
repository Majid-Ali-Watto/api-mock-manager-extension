import { ref } from "vue";

export function useCollectionExpand() {
  const expandedCollections = ref({});

  function toggleCollection(collectionId) {
    expandedCollections.value[collectionId] =
      !expandedCollections.value[collectionId];
  }

  function collapseAllCollections(collections) {
    collections.forEach((col) => {
      expandedCollections.value[col.id] = false;
    });
  }

  function expandAllCollections(collections) {
    collections.forEach((col) => {
      expandedCollections.value[col.id] = true;
    });
  }

  return {
    expandedCollections,
    toggleCollection,
    collapseAllCollections,
    expandAllCollections,
  };
}
