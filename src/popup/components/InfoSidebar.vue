<template>
  <div v-if="isOpen" class="ui-overlay" @click="close">
    <aside class="ui-sheet sidebar" @click.stop>
      <div class="ui-sheet-header">
        <h3>
          <img src="/icon.svg" alt="" class="sheet-logo" />
          API Mock Manager
          <span class="ui-chip">v1.0.0</span>
        </h3>
        <button @click="close" class="ui-icon-btn sidebar-close-btn" title="Close">
          <Icon name="x" />
        </button>
      </div>

      <div class="sidebar-content">
        <p class="lead">
          Mock API responses in the browser for development and testing — no backend changes needed.
        </p>

        <section class="info-section">
          <h4>Features</h4>
          <ul class="feature-list">
            <li v-for="f in features" :key="f.text">
              <span class="feature-icon"><Icon :name="f.icon" :size="14" /></span>
              <span>{{ f.text }}</span>
            </li>
          </ul>
        </section>

        <section class="info-section">
          <h4>Quick start</h4>
          <ol class="steps">
            <li>Create a collection with <strong>New</strong></li>
            <li>Add APIs with URL patterns and mock responses</li>
            <li>Optionally limit the collection to your dev sites</li>
            <li>Reload your page — matching requests are mocked</li>
          </ol>
        </section>

        <section class="info-section">
          <h4>Tips</h4>
          <ul class="tips">
            <li>Use <code>*</code> wildcards or <code>/users/:id</code> params in URLs</li>
            <li>Toggle every mock with <span class="ui-kbd">Alt</span> + <span class="ui-kbd">Shift</span> + <span class="ui-kbd">M</span></li>
            <li>Switch a whole collection to an error scenario with <strong>Scenario…</strong></li>
            <li>Export collections to share them with your team</li>
          </ul>
        </section>

        <section class="info-section">
          <h4>Privacy &amp; terms</h4>
          <p class="muted">All data stays in your browser. Nothing is collected or sent anywhere.</p>
          <div class="link-row">
            <a href="privacy.html" target="_blank" rel="noopener noreferrer" class="ui-btn ui-btn--sm">
              <Icon name="shield" :size="13" /> Privacy Policy
            </a>
            <a href="terms.html" target="_blank" rel="noopener noreferrer" class="ui-btn ui-btn--sm">
              <Icon name="file" :size="13" /> Terms of Use
            </a>
          </div>
        </section>

        <section class="info-section developer-section">
          <div class="developer-head">
            <span class="avatar">MA</span>
            <div>
              <p class="developer-name">Majid Ali</p>
              <p class="muted">Full Stack Developer · Vue.js · Nuxt.js · React · Python · FastAPI</p>
            </div>
          </div>
          <div class="link-row">
            <a href="https://majidev.netlify.app" target="_blank" rel="noopener noreferrer" class="ui-btn ui-btn--sm">
              <Icon name="link" :size="13" /> Portfolio
            </a>
            <a href="https://github.com/Majid-Ali-Watto" target="_blank" rel="noopener noreferrer" class="ui-btn ui-btn--sm">
              <Icon name="github" :size="13" /> GitHub
            </a>
            <a
              href="https://github.com/Majid-Ali-Watto/api-mock-manager-extension/issues"
              target="_blank"
              rel="noopener noreferrer"
              class="ui-btn ui-btn--sm"
            >
              <Icon name="alert" :size="13" /> Report issue
            </a>
          </div>
        </section>

        <section class="info-section danger-zone">
          <div>
            <h4>Clear cached drafts</h4>
            <p class="muted">Removes unsaved form drafts. Your collections and APIs are not affected.</p>
          </div>
          <button @click="clearCache" class="ui-btn ui-btn--sm ui-btn--danger danger-btn">
            <Icon name="broom" :size="13" /> Clear Cache
          </button>
        </section>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { useToast } from "../composables/useToast";
import Icon from "./Icon.vue";
import { useConfirm } from "../composables/useConfirm";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const features = [
  { icon: "folder", text: "Collections, each limited to the sites you choose" },
  { icon: "code", text: "fetch, XHR, sendBeacon, EventSource and WebSocket" },
  { icon: "layers", text: "Variants, scenarios and dynamic responses" },
  { icon: "alert", text: "Simulate errors, timeouts and hanging requests" },
  { icon: "record", text: "Record real responses into a collection" },
  { icon: "log", text: "Request log and a global on/off switch" },
  { icon: "upload", text: "Import and export to share with your team" },
];

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
.sidebar {
  width: 340px;
}

.sheet-logo {
  width: 20px;
  height: 20px;
  border-radius: 5px;
}

.sidebar-content {
  padding: 14px 16px 20px;
}

.lead {
  margin: 0 0 16px;
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.6;
}

.info-section {
  padding: 14px 0;
  border-top: 1px solid var(--border);
}

.info-section h4 {
  margin: 0 0 10px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.muted {
  margin: 0;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.55;
}

.feature-list,
.tips {
  margin: 0;
  padding: 0;
  list-style: none;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 12.5px;
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
}

.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.steps li {
  position: relative;
  padding: 3px 0 3px 30px;
  font-size: 12.5px;
  counter-increment: step;
}

.steps li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 2px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
}

.tips li {
  position: relative;
  padding: 3px 0 3px 14px;
  color: var(--text-2);
  font-size: 12.5px;
}

.tips li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 11px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-3);
}

.tips code {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--surface-3);
  font-size: 11.5px;
}

.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.link-row a {
  text-decoration: none;
}

.developer-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.developer-name {
  margin: 0;
  font-weight: 650;
}

.danger-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.danger-zone h4 {
  margin-bottom: 4px;
}
</style>
