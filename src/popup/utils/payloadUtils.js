import { useToast } from "../composables/useToast";

export function prettifyJson(payload) {
  if (!payload || !payload.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(payload);
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    const positionMatch = err.message.match(/position (\d+)/);
    if (positionMatch) {
      const position = parseInt(positionMatch[1]);
      const lines = payload.substring(0, position).split("\n");
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;
      throw new Error(`Invalid JSON at line ${line}, column ${column}: ${err.message}`);
    }
    throw new Error(`Invalid JSON: ${err.message}`);
  }
}

export function downloadPayloadAsFile(payload, type, apiLabel) {
  const { showToast } = useToast();
  if (!payload || payload === "None") {
    showToast(`No ${type} payload to download`, "error");
    return;
  }

  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const safeLabel = apiLabel.replace(/[^a-z0-9]/gi, "_");
  const date = new Date().toISOString().split("T")[0];

  try {
    const parsedPayload = JSON.parse(payload);
    const blob = new Blob([JSON.stringify(parsedPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeLabel}_${type}_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${label} payload downloaded`);
  } catch {
    const blob = new Blob([payload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeLabel}_${type}_${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${label} payload downloaded as text`);
  }
}

export async function copyPayloadToClipboard(payload, type) {
  const { showToast } = useToast();
  if (!payload || payload.trim() === "") {
    showToast(`No ${type} payload to copy`, "error");
    return;
  }

  const label = type.charAt(0).toUpperCase() + type.slice(1);
  try {
    await navigator.clipboard.writeText(payload);
    showToast(`${label} payload copied`);
  } catch (err) {
    console.error("Failed to copy:", err);
    showToast("Failed to copy to clipboard", "error");
  }
}

export function syncScrollBetweenElements(sourceElement, targetElement) {
  if (sourceElement && targetElement) {
    targetElement.scrollTop = sourceElement.scrollTop;
  }
}
