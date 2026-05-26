import { ref } from "vue";

export function useDropdownMenu() {
  const openMenuApiId = ref(null);
  const openMenuCollectionId = ref(null);
  const menuPositions = ref({});
  const collectionMenuPositions = ref({});

  function toggleMenu(apiId, event) {
    if (openMenuApiId.value === apiId) {
      openMenuApiId.value = null;
      delete menuPositions.value[apiId];
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = 240;

      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      menuPositions.value[apiId] = {
        left: rect.right - 160,
        top: openUp ? rect.top - menuHeight : rect.bottom + 4,
        openUp,
      };
      openMenuApiId.value = apiId;
    }
  }

  function getMenuStyle(apiId) {
    const pos = menuPositions.value[apiId];
    if (!pos) return {};

    return {
      left: `${pos.left}px`,
      top: `${pos.top}px`,
    };
  }

  function toggleCollectionMenu(collectionId, event) {
    if (openMenuCollectionId.value === collectionId) {
      openMenuCollectionId.value = null;
      delete collectionMenuPositions.value[collectionId];
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = 200;

      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      collectionMenuPositions.value[collectionId] = {
        left: rect.right - 160,
        top: openUp ? rect.top - menuHeight : rect.bottom + 4,
        openUp,
      };
      openMenuCollectionId.value = collectionId;
    }
  }

  function getCollectionMenuStyle(collectionId) {
    const pos = collectionMenuPositions.value[collectionId];
    if (!pos) return {};

    return {
      left: `${pos.left}px`,
      top: `${pos.top}px`,
    };
  }

  function closeAllMenus() {
    openMenuApiId.value = null;
    openMenuCollectionId.value = null;
  }

  return {
    openMenuApiId,
    openMenuCollectionId,
    menuPositions,
    collectionMenuPositions,
    toggleMenu,
    getMenuStyle,
    toggleCollectionMenu,
    getCollectionMenuStyle,
    closeAllMenus,
  };
}
