import { ref, computed } from "vue";
import { isMatchingSearch } from "../utils/helpers";

export function useApiModal() {
  const selectedApi = ref(null);
  const selectedApiCollectionName = ref("");
  const modalSearchQuery = ref("");

  const hasAnyMatch = computed(() => {
    if (!modalSearchQuery.value || !selectedApi.value) return true;

    return (
      isMatchingSearch(selectedApiCollectionName.value, modalSearchQuery.value) ||
      isMatchingSearch(selectedApi.value.label, modalSearchQuery.value) ||
      isMatchingSearch(selectedApi.value.method, modalSearchQuery.value) ||
      isMatchingSearch(selectedApi.value.url, modalSearchQuery.value) ||
      isMatchingSearch(String(selectedApi.value.status), modalSearchQuery.value) ||
      isMatchingSearch(selectedApi.value.requestPayload, modalSearchQuery.value) ||
      isMatchingSearch(selectedApi.value.responsePayload, modalSearchQuery.value)
    );
  });

  function viewApiDetails(api, collectionName) {
    selectedApi.value = api;
    selectedApiCollectionName.value = collectionName;
  }

  function closeApiDetails() {
    selectedApi.value = null;
    selectedApiCollectionName.value = "";
    modalSearchQuery.value = "";
  }

  return {
    selectedApi,
    selectedApiCollectionName,
    modalSearchQuery,
    hasAnyMatch,
    viewApiDetails,
    closeApiDetails,
  };
}
