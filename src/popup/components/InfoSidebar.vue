<template>
  <div v-if="isOpen" class="sidebar-overlay" @click="close">
    <div class="sidebar" @click.stop>
      <div class="sidebar-header">
        <h3>📱 API Mock Extension</h3>
        <button @click="close" class="sidebar-close-btn">✕</button>
      </div>
      <div class="sidebar-content">
        <section class="info-section">
          <h4>🎯 About</h4>
          <p>
            A powerful Chrome extension for mocking API responses during
            development and testing. Intercept HTTP requests and return custom
            responses without modifying your backend.
          </p>
        </section>

        <section class="info-section">
          <h4>✨ Features</h4>
          <ul>
            <li>📦 Organize APIs into collections</li>
            <li>🔄 Support for GET, POST, PUT, PATCH, DELETE</li>
            <li>⚡ Enable/disable APIs and collections instantly</li>
            <li>🔍 Global and per-collection search</li>
            <li>📥 Import/Export functionality</li>
            <li>📋 Copy & download API configurations</li>
            <li>🎨 Clean and intuitive interface</li>
          </ul>
        </section>

        <section class="info-section">
          <h4>🚀 Quick Start</h4>
          <ol>
            <li>Create a new collection</li>
            <li>Add APIs with URL patterns and mock responses</li>
            <li>Enable the collection and APIs</li>
            <li>Refresh your web page to see mocked responses</li>
          </ol>
        </section>

        <section class="info-section">
          <h4>💡 Tips</h4>
          <ul>
            <li>Use wildcards (*) in URLs for flexible matching</li>
            <li>Disable APIs/collections without deleting them</li>
            <li>Export collections to share with your team</li>
            <li>Use search to quickly find specific APIs</li>
          </ul>
        </section>

        <section class="info-section">
          <h4>📖 Version</h4>
          <p>v1.0.0</p>
        </section>

        <section class="info-section">
          <h4>🔗 Support</h4>
          <p>
            For issues or feature requests, please visit our GitHub repository.
          </p>
        </section>

        <section class="info-section developer-section">
          <h4>👨‍💻 Developer</h4>
          <p class="developer-name">Majid Ali</p>
          <p>Full Stack Web Developer</p>
          <div class="developer-links">
            <a
              href="https://majidev.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Portfolio
            </a>
            <a
              href="https://github.com/Majid-Ali-Watto"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </section>

        <section class="info-section danger-zone">
          <h4>⚠️ Clear Cache</h4>
          <p class="warning-text">
            Clear localStorage cache (form data, etc.). This won't delete your
            APIs or collections.
          </p>
          <button @click="clearCache" class="danger-btn">
            🗑️ Clear Cache
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useToast } from "../composables/useToast";
import { useConfirm } from "../composables/useConfirm";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const { showToast } = useToast();
const { showConfirm } = useConfirm();

function close() {
  emit("close");
}

async function clearCache() {
  const ok = await showConfirm(
    "Clear all cached form data?\n\nThis clears saved form states (localStorage) but does NOT delete your APIs or collections.",
    { confirmLabel: "Clear Cache" }
  );
  if (ok) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("api-form-")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      showToast(`Cleared ${keysToRemove.length} cached form(s)`);
    } catch (err) {
      console.error("Error clearing cache:", err);
      showToast("Failed to clear cache: " + err.message, "error");
    }
  }
}
</script>

<style scoped>
/* Sidebar Styles */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: var(--surface-bg);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  animation: slideInRight 0.3s ease;
  overflow-y: auto;
  z-index: 2001;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--header-bg);
  color: white;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sidebar-close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
  line-height: 1;
}

.sidebar-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.sidebar-content {
  padding: 20px;
  color: var(--text-main);
}

.info-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}

.info-section:last-child {
  border-bottom: none;
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.info-section p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-body);
}

.info-section ul,
.info-section ol {
  margin: 8px 0 0 0;
  padding-left: 12px;
}

.info-section li {
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-body);
}

.developer-section {
  background: var(--surface-muted);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 14px;
}

.developer-name {
  font-weight: 700;
  color: var(--text-main) !important;
}

.developer-links {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.developer-links a {
  flex: 1;
  padding: 7px 10px;
  background: var(--button-bg);
  color: var(--primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s ease;
}

.developer-links a:hover {
  background: var(--button-hover-bg);
  transform: translateY(-1px);
}

.danger-zone {
  background: rgba(229, 62, 62, 0.12);
  padding: 16px;
  border: 1px solid #feb2b2;
  border-radius: 8px;
  margin-top: 20px;
}

.danger-zone h4 {
  color: #c53030;
}

.warning-text {
  color: #742a2a;
  font-size: 12px;
  margin-bottom: 12px;
}

.danger-btn {
  width: 100%;
  padding: 10px;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.danger-btn:hover {
  background: #c53030;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(229, 62, 62, 0.3);
}

.danger-btn:active {
  transform: translateY(0);
}
</style>
