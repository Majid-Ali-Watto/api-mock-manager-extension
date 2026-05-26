import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { addApi, updateApi, getApisByCollection } from "../../db/apis.repo";
import { HttpMethods } from "../../types/models";
import { useLineNumbers } from "../composables/useLineNumbers";
import { useJsonValidation } from "../composables/useJsonValidation";
import { useFormStorage } from "../composables/useFormStorage";
import {
  prettifyJson,
  copyPayloadToClipboard,
  downloadPayloadAsFile,
  syncScrollBetweenElements,
} from "../utils/payloadUtils";
import { notifyContentScripts } from "../utils/helpers";
import { useToast } from "../composables/useToast";

export function useApiForm(props, emit, { onSaved } = {}) {
  const { showToast } = useToast();
  const label = ref("");
  const url = ref("");
  const method = ref("GET");
  const status = ref(200);
  const delay = ref(0);
  const urlMatchType = ref("auto");
  const requestPayload = ref("");
  const responsePayload = ref("");
  const headerRows = ref([{ key: "", value: "", enabled: true }]);
  const showForm = ref(false);
  const editMode = ref(false);
  const editingApiId = ref(null);
  const activeTab = ref("response");

  const requestValidationError = ref("");
  const responseValidationError = ref("");
  const saveError = ref("");
  const requestTextareaRef = ref(null);
  const responseTextareaRef = ref(null);
  const requestLineNumbersRef = ref(null);
  const responseLineNumbersRef = ref(null);
  const isLoadingFromEdit = ref(false);

  const methods = HttpMethods;
  const STORAGE_KEY = `api-form-${props.collectionId}`;

  function serializeHeaderRows(rows) {
    const meaningful = rows.filter((r) => r.key.trim() || r.value.trim());
    return meaningful.length ? JSON.stringify(meaningful) : "";
  }

  function deserializeHeaderRows(str) {
    if (!str) return [{ key: "", value: "", enabled: true }];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.length
          ? parsed.map((r) => ({ key: r.key || "", value: r.value || "", enabled: r.enabled !== false }))
          : [{ key: "", value: "", enabled: true }];
      }
      return Object.entries(parsed).map(([key, value]) => ({ key, value, enabled: true }));
    } catch {
      return [{ key: "", value: "", enabled: true }];
    }
  }

  function addHeaderRow() {
    headerRows.value.push({ key: "", value: "", enabled: true });
  }

  function removeHeaderRow(index) {
    headerRows.value.splice(index, 1);
    if (headerRows.value.length === 0) {
      headerRows.value.push({ key: "", value: "", enabled: true });
    }
  }

  const { lineNumbers: requestLineNumbers } = useLineNumbers(requestPayload);
  const { lineNumbers: responseLineNumbers } = useLineNumbers(responsePayload);

  const {
    requestValidationError: requestValidationErrorComposable,
    responseValidationError: responseValidationErrorComposable,
    validateJson: validateJsonComposable,
    isJsonValid,
  } = useJsonValidation();

  const isFormValid = computed(() => {
    if (requestPayload.value && requestPayload.value.trim()) {
      if (!isJsonValid(requestPayload.value)) return false;
    }
    if (responsePayload.value && responsePayload.value.trim()) {
      if (!isJsonValid(responsePayload.value)) return false;
    }
    return true;
  });

  const { saveFormToStorage, loadFormFromStorage, clearFormStorage } = useFormStorage(
    STORAGE_KEY,
    {
      label,
      url,
      method,
      status,
      delay,
      urlMatchType,
      requestPayload,
      responsePayload,
      headerRows,
      activeTab,
    },
    showForm
  );

  function formatJsonString(jsonString) {
    
    // Handle empty values
    if (!jsonString) return "";
    
    // If it's already an object, stringify it
    if (typeof jsonString === "object") {
      return JSON.stringify(jsonString, null, 2);
    }
    
    // If it's a string, try to parse and format it
    if (typeof jsonString === "string") {
      const trimmed = jsonString.trim();
      if (!trimmed) return "";
      
      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return jsonString;
      }
    }
    
    return String(jsonString);
  }

  watch(
    [
      label,
      url,
      method,
      status,
      delay,
      urlMatchType,
      requestPayload,
      responsePayload,
      headerRows,
      activeTab,
      showForm,
    ],
    () => {
      // Don't save to storage if we're loading from edit
      if (isLoadingFromEdit.value) return;
      if (editMode.value) return;

      if (
        showForm.value &&
        (label.value || url.value || requestPayload.value || responsePayload.value)
      ) {
        saveFormToStorage();
      }
    },
    { deep: true }
  );

  watch(method, (newMethod) => {
    if (newMethod === "GET" && activeTab.value === "request") {
      activeTab.value = "response";
    }
  });

  function toggleForm() {
    showForm.value = !showForm.value;
    if (!showForm.value) {
      clearForm();
    }
  }

  function clearForm() {
    // Set flag to prevent watch from saving empty values
    isLoadingFromEdit.value = true;
    
    label.value = "";
    url.value = "";
    method.value = "GET";
    status.value = 200;
    delay.value = 0;
    urlMatchType.value = "auto";
    requestPayload.value = "";
    responsePayload.value = "";
    headerRows.value = [{ key: "", value: "", enabled: true }];
    requestValidationError.value = "";
    responseValidationError.value = "";
    editMode.value = false;
    editingApiId.value = null;
    activeTab.value = "response";
    clearFormStorage();
    
    // Reset flag after clearing
    setTimeout(() => {
      isLoadingFromEdit.value = false;
    }, 0);
  }

  async function initEdit(api) {
    isLoadingFromEdit.value = true;
    clearFormStorage();
    await nextTick();
    editMode.value = true;
    editingApiId.value = api.id;
    label.value = api.label || "";
    url.value = api.url || "";
    method.value = api.method || "GET";
    status.value = api.status || 200;
    delay.value = api.delay || 0;
    urlMatchType.value = api.urlMatchType || "auto";
    headerRows.value = deserializeHeaderRows(api.responseHeaders);
    const formattedRequest = formatJsonString(api.requestPayload ?? "");
    const formattedResponse = formatJsonString(api.responsePayload ?? "");
    requestPayload.value = formattedRequest;
    responsePayload.value = formattedResponse;
    activeTab.value = formattedResponse || method.value === "GET" ? "response" : "request";
    showForm.value = true;
    await nextTick();
    validateJson("request");
    validateJson("response");
    isLoadingFromEdit.value = false;
  }

  async function importPayload(type) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: "JSON files", accept: { "application/json": [".json"] } }],
        multiple: false,
      });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const formatted = JSON.stringify(JSON.parse(text), null, 2);

      if (type === "request") {
        requestPayload.value = formatted;
      } else {
        responsePayload.value = formatted;
      }

      showToast(`${type === "request" ? "Request" : "Response"} JSON imported`);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Import error:", error);
        showToast("Failed to import JSON: " + error.message, "error");
      }
    }
  }

  function handleJsonFileImport() {}

  function syncScroll(type) {
    const textarea =
      type === "request" ? requestTextareaRef.value : responseTextareaRef.value;
    const lineNumbers =
      type === "request"
        ? requestLineNumbersRef.value
        : responseLineNumbersRef.value;

    syncScrollBetweenElements(textarea, lineNumbers);
  }

  function validateJson(type) {
    const payload = type === "request" ? requestPayload.value : responsePayload.value;
    const result = validateJsonComposable(type, payload);
    
    if (type === "request") {
      requestValidationError.value = requestValidationErrorComposable.value;
    } else {
      responseValidationError.value = responseValidationErrorComposable.value;
    }
    
    return result;
  }

  function prettifyPayload(type) {
    const payload = type === "request" ? requestPayload.value : responsePayload.value;
    const errorRef = type === "request" ? requestValidationError : responseValidationError;

    if (!payload || !payload.trim()) {
      showToast(`No ${type} JSON to format`, "error");
      return;
    }

    try {
      const formatted = prettifyJson(payload);

      if (type === "request") {
        requestPayload.value = formatted;
        requestValidationError.value = "";
      } else {
        responsePayload.value = formatted;
        responseValidationError.value = "";
      }
    } catch (err) {
      console.error("Format error:", err);
      showToast("Invalid JSON — " + err.message, "error", 5000);
    }
  }

  async function copyPayload(type) {
    const payload =
      type === "request" ? requestPayload.value : responsePayload.value;
    await copyPayloadToClipboard(payload, type);
  }

  function downloadPayload(type) {
    const payload =
      type === "request" ? requestPayload.value : responsePayload.value;
    const filename = `${label.value || "api"}_${type}`;
    downloadPayloadAsFile(payload, type, filename);
  }

  function normalizePayload(payload) {
    if (!payload) return "";
    try {
      return JSON.stringify(JSON.parse(payload));
    } catch {
      return payload.trim();
    }
  }

  async function save() {
    saveError.value = "";
    try {
      const apiData = {
        label: label.value,
        url: url.value,
        method: method.value,
        status: status.value,
        delay: delay.value || 0,
        urlMatchType: urlMatchType.value || "auto",
        requestPayload: requestPayload.value,
        responsePayload: responsePayload.value,
        responseHeaders: serializeHeaderRows(headerRows.value),
        collectionId: props.collectionId,
      };

      const existingApis = await getApisByCollection(props.collectionId);
      const nResp = normalizePayload(apiData.responsePayload);
      const nReq = normalizePayload(apiData.requestPayload);
      const duplicate = existingApis.find(
        (a) =>
          a.url === apiData.url &&
          a.method === apiData.method &&
          normalizePayload(a.responsePayload) === nResp &&
          normalizePayload(a.requestPayload) === nReq &&
          (!editMode.value || a.id !== editingApiId.value),
      );
      if (duplicate) {
        saveError.value = `An API with the same URL, method, and payloads already exists ("${duplicate.label || duplicate.url}"). Change at least one field, or use the Duplicate button to create an intentional copy.`;
        return;
      }

      if (editMode.value) {
        await updateApi(editingApiId.value, apiData);
        emit("apiUpdated");
      } else {
        apiData.createdAt = Date.now();
        await addApi(apiData);
        emit("apiAdded");
      }

      notifyContentScripts();

      clearForm();
      showForm.value = false;
      clearFormStorage();
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Error saving API:", err);
    }
  }

  onMounted(() => {
    if (!editMode.value && !showForm.value) {
      loadFormFromStorage();
      if (requestPayload.value) {
        requestPayload.value = formatJsonString(requestPayload.value);
      }
      if (responsePayload.value) {
        responsePayload.value = formatJsonString(responsePayload.value);
      }
    }
  });

  onUnmounted(() => {
    if (
      !editMode.value &&
      showForm.value &&
      (label.value || url.value || requestPayload.value || responsePayload.value)
    ) {
      saveFormToStorage();
    }
  });

  return {
    label,
    url,
    method,
    status,
    delay,
    urlMatchType,
    requestPayload,
    responsePayload,
    headerRows,
    showForm,
    editMode,
    editingApiId,
    activeTab,

    requestValidationError,
    responseValidationError,
    saveError,
    requestTextareaRef,
    responseTextareaRef,
    requestLineNumbersRef,
    responseLineNumbersRef,
    methods,
    requestLineNumbers,
    responseLineNumbers,
    isFormValid,
    toggleForm,
    initEdit,
    addHeaderRow,
    removeHeaderRow,
    importPayload,
    handleJsonFileImport,
    syncScroll,
    validateJson,
    prettifyPayload,
    copyPayload,
    downloadPayload,
    save,
  };
}
