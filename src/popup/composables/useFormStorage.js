import { watch } from "vue";

export function useFormStorage(storageKey, formFields, showForm) {
  function saveFormToStorage() {
    if (
      showForm.value &&
      Object.values(formFields).some((field) => field.value)
    ) {
      const formData = {};
      Object.keys(formFields).forEach((key) => {
        formData[key] = formFields[key].value;
      });
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }

  function loadFormFromStorage() {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);
        Object.keys(formData).forEach((key) => {
          if (formFields[key]) {
            formFields[key].value = formData[key];
          }
        });
      } catch (err) {
        console.error("Failed to load form data:", err);
      }
    }
  }

  function clearFormStorage() {
    localStorage.removeItem(storageKey);
  }

  // Note: Auto-save is handled by the component's watch
  // to have better control over when to save

  return {
    saveFormToStorage,
    loadFormFromStorage,
    clearFormStorage,
  };
}
