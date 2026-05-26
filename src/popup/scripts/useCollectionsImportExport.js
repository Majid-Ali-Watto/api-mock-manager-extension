import { addApi, getApisByCollection } from "../../db/apis.repo";
import { addCollection, getCollections } from "../../db/collections.repo";
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";

function normalizePayload(payload) {
  if (!payload) return "";
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return payload.trim();
  }
}

export function useCollectionsImportExport({ onRefresh }) {
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  async function exportData() {
    try {
      const collections = await getCollections();
      if (collections.length === 0) {
        showToast("No collections to export.", "error");
        return;
      }
      const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        collections: [],
      };

      for (const collection of collections) {
        const apis = await getApisByCollection(collection.id);
        data.collections.push({
          name: collection.name,
          enabled: collection.enabled,
          createdAt: collection.createdAt,
          apis: apis.map((api) => ({
            label: api.label,
            method: api.method,
            url: api.url,
            status: api.status,
            requestPayload: api.requestPayload,
            responsePayload: api.responsePayload,
            responseHeaders: api.responseHeaders || "",
            delay: api.delay || 0,
            urlMatchType: api.urlMatchType || "auto",
            enabled: api.enabled,
            createdAt: api.createdAt,
          })),
        });
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `api-mocks-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Exported ${collections.length} collection(s)`);
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export data: " + error.message, "error");
    }
  }

  function urlWithoutHost(rawUrl) {
    try {
      const u = new URL(rawUrl);
      return u.pathname + u.search + u.hash || rawUrl;
    } catch {
      return rawUrl || "";
    }
  }

  function normalizeApiFlowsFormat(data) {
    return data.map((item) => ({
      label: urlWithoutHost(item?.request?.url),
      method: item?.request?.method || "",
      url: item?.request?.url || "",
      status: item?.response?.status || 200,
      requestPayload: item?.request?.postData || "",
      responsePayload: item?.responseBody || "",
      responseHeaders: "",
      delay: 0,
      urlMatchType: "auto",
      enabled: true,
      createdAt: item?.readableTime || Date.now(),
    }));
  }

  async function parseFile(file) {
    const text = await file.text();
    let data = JSON.parse(text);
    if (Array.isArray(data) && data[0]?.type && data[0]?.step) {
      return [
        {
          name: "Imported Collection " + file.name,
          enabled: true,
          createdAt: Date.now(),
          apis: normalizeApiFlowsFormat(data),
        },
      ];
    }
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error(`Invalid file format in "${file.name}"`);
    }
    return data.collections;
  }

  async function importCollections(allCollections, merge) {
    const existingCollections = await getCollections();
    const existingByName = new Map(
      existingCollections.map((c) => [c.name.toLowerCase(), c])
    );

    let importedCollections = 0;
    let importedApis = 0;
    let skippedCollections = 0;
    let skippedApis = 0;

    for (const collectionData of allCollections) {
      let targetCollection = merge
        ? existingByName.get(collectionData.name.toLowerCase())
        : null;

      if (!targetCollection) {
        await addCollection(collectionData.name);
        const all = await getCollections();
        targetCollection = all[all.length - 1];
        existingByName.set(collectionData.name.toLowerCase(), targetCollection);
        importedCollections++;
      } else {
        skippedCollections++;
      }

      const existingApis = await getApisByCollection(targetCollection.id);

      for (const apiData of collectionData.apis || []) {
        const nResp = normalizePayload(apiData.responsePayload);
        const nReq = normalizePayload(apiData.requestPayload);

        const isDuplicate = existingApis.some(
          (a) =>
            a.url === apiData.url &&
            a.method === apiData.method &&
            normalizePayload(a.responsePayload) === nResp &&
            normalizePayload(a.requestPayload) === nReq
        );

        if (isDuplicate) {
          skippedApis++;
          continue;
        }

        await addApi({
          ...apiData,
          responseHeaders: apiData.responseHeaders || "",
          delay: apiData.delay || 0,
          urlMatchType: apiData.urlMatchType || "auto",
          collectionId: targetCollection.id,
        });
        existingApis.push({ ...apiData });
        importedApis++;
      }
    }

    let msg = `Import complete — ${importedCollections} collection(s), ${importedApis} API(s) added`;
    if (skippedCollections > 0 || skippedApis > 0) {
      msg += `. Skipped ${skippedCollections} duplicate collection(s) and ${skippedApis} duplicate API(s).`;
    }
    showToast(msg, "success", 5000);
    onRefresh?.();
  }

  async function processFilesImport(files) {
    const fileArray = Array.from(files);

    const errors = [];
    const allCollections = [];
    for (const file of fileArray) {
      try {
        const cols = await parseFile(file);
        allCollections.push(...cols);
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (errors.length) {
      showToast(
        "Some files could not be parsed:\n" + errors.join("\n"),
        "error",
        6000
      );
      if (allCollections.length === 0) return;
    }

    const totalFiles = fileArray.length - errors.length;
    const merge = await showConfirm(
      `Found ${totalFiles} file(s) with ${allCollections.length} collection(s).\n\nMerge into existing data? (duplicates will be skipped)`,
      { confirmLabel: "Merge" }
    );

    if (!merge) {
      const proceed = await showConfirm(
        "Replace ALL existing collections and APIs? This cannot be undone.",
        { confirmLabel: "Replace All", dangerous: true }
      );
      if (!proceed) return;
    }

    await importCollections(allCollections, merge);
  }

  async function processFileImport(file) {
    return processFilesImport([file]);
  }

  function importData() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html") + "?action=import",
    });
  }

  return {
    exportData,
    importData,
    processFileImport,
    processFilesImport,
  };
}
