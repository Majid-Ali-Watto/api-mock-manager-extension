import { useToast } from "../composables/useToast";

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString();
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Output is rendered with v-html, so stored/imported text must always be escaped.
export function highlightSearchTerm(text, searchQuery) {
  if (!text) return text;
  const safeText = escapeHtml(text);

  const query = (searchQuery || "").trim();
  if (!query) return safeText;

  const pattern = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safeText.replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

export function isMatchingSearch(text, searchQuery) {
  if (!searchQuery) return true;
  return text && text.toLowerCase().includes(searchQuery.toLowerCase());
}

export async function copyToClipboard(text, label) {
  const { showToast } = useToast();
  if (!text || text === "None") {
    showToast(`No ${label} payload to copy`, "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} JSON copied to clipboard`);
  } catch (err) {
    console.error("Failed to copy:", err);
    showToast("Failed to copy to clipboard", "error");
  }
}

export function notifyContentScripts() {
  if (typeof chrome === "undefined" || !chrome?.tabs || !chrome?.runtime) {
    return;
  }

  try {
    chrome.runtime.sendMessage({ type: "REFRESH_MOCKS" }).catch(() => {});
  } catch {
    // background not ready
  }

  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) return;
    tabs.forEach((tab) => {
      if (tab.id && tab.id !== -1) {
        chrome.tabs.sendMessage(tab.id, { type: "RELOAD_MOCKS" }).catch(() => {});
      }
    });
  });
}
