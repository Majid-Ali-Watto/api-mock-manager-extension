import { ref, computed } from "vue";

export function useJsonValidation() {
  const requestValidationError = ref("");
  const responseValidationError = ref("");

  const isFormValid = computed(() => {
    return !requestValidationError.value && !responseValidationError.value;
  });

  function validateJson(type, payload) {
    // Clear previous errors
    if (type === "request") {
      requestValidationError.value = "";
    } else {
      responseValidationError.value = "";
    }

    // Skip validation if payload is empty (it's optional)
    if (!payload || !payload.trim()) {
      return true;
    }

    try {
      JSON.parse(payload);
      return true;
    } catch (err) {
      // Extract line and column from error message
      const errorMsg = err.message;
      let detailedError = `Invalid JSON: ${errorMsg}`;

      // Try to extract position information
      const positionMatch = errorMsg.match(/position (\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const lines = payload.substring(0, position).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        detailedError = `Invalid JSON at line ${line}, column ${column}: ${errorMsg}`;
      }

      if (type === "request") {
        requestValidationError.value = detailedError;
      } else {
        responseValidationError.value = detailedError;
      }

      return false;
    }
  }

  function isJsonValid(payload) {
    if (!payload || !payload.trim()) {
      return true;
    }
    
    try {
      JSON.parse(payload);
      return true;
    } catch {
      return false;
    }
  }

  return {
    requestValidationError,
    responseValidationError,
    isFormValid,
    validateJson,
    isJsonValid,
  };
}
