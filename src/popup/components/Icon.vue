<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-for="(shape, i) in shapes" :key="i">
      <path v-if="typeof shape === 'string'" :d="shape" />
      <circle v-else-if="shape.c" :cx="shape.c[0]" :cy="shape.c[1]" :r="shape.c[2]" :fill="shape.fill ? 'currentColor' : 'none'" :stroke="shape.fill ? 'none' : 'currentColor'" />
      <rect v-else-if="shape.r" :x="shape.r[0]" :y="shape.r[1]" :width="shape.r[2]" :height="shape.r[3]" :rx="shape.r[4] || 0" :fill="shape.fill ? 'currentColor' : 'none'" :stroke="shape.fill ? 'none' : 'currentColor'" />
    </template>
  </svg>
</template>

<script setup>
// Line icons in the style of Feather Icons (MIT, © Cole Bemis); drawn on a 24px grid.
import { computed } from "vue";

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
  strokeWidth: { type: [Number, String], default: 2 },
  filled: { type: Boolean, default: false },
});

const dot = (x, y) => ({ c: [x, y, 1.2], fill: true });

const ICONS = {
  search: [{ c: [11, 11, 7] }, "M21 21l-4.35-4.35"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  power: ["M12 2v10", "M18.36 6.64a9 9 0 1 1-12.73 0"],
  log: ["M8 6h13", "M8 12h13", "M8 18h13", dot(3.5, 6), dot(3.5, 12), dot(3.5, 18)],
  upload: ["M12 15V3", "M7 8l5-5 5 5", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"],
  info: [{ c: [12, 12, 10] }, "M12 16v-4", dot(12, 8)],
  sun: [{ c: [12, 12, 4] }, "M12 2v2", "M12 20v2", "M4.93 4.93l1.41 1.41", "M17.66 17.66l1.41 1.41", "M2 12h2", "M20 12h2", "M6.34 17.66l-1.41 1.41", "M19.07 4.93l-1.41 1.41"],
  moon: ["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"],
  star: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  external: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  more: [dot(12, 5), dot(12, 12), dot(12, 19)],
  "chevron-right": ["M9 18l6-6-6-6"],
  "chevron-down": ["M6 9l6 6 6-6"],
  "chevrons-down": ["M7 7l5 5 5-5", "M7 13l5 5 5-5"],
  "chevrons-up": ["M17 11l-5-5-5 5", "M17 17l-5-5-5 5"],
  grip: [dot(9, 6), dot(15, 6), dot(9, 12), dot(15, 12), dot(9, 18), dot(15, 18)],
  globe: [{ c: [12, 12, 10] }, "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
  pin: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", { c: [12, 10, 3] }],
  edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  trash: ["M3 6h18", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6", "M10 11v6", "M14 11v6", "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"],
  copy: [{ r: [9, 9, 13, 13, 2] }, "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", { c: [12, 12, 3] }],
  sort: ["M7 3v18", "M3 7l4-4 4 4", "M17 21V3", "M21 17l-4 4-4-4"],
  calendar: [{ r: [3, 4, 18, 18, 2] }, "M16 2v4", "M8 2v4", "M3 10h18"],
  type: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  play: ["M6 4l14 8-14 8V4z"],
  pause: [{ r: [6, 4, 4, 16, 1] }, { r: [14, 4, 4, 16, 1] }],
  record: [{ c: [12, 12, 6], fill: true }],
  stop: [{ r: [6, 6, 12, 12, 2], fill: true }],
  layers: ["M12 2 2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  clock: [{ c: [12, 12, 10] }, "M12 6v6l4 2"],
  zap: ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
  sparkles: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"],
  alert: ["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", dot(12, 17)],
  filter: ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"],
  folder: ["M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"],
  code: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
  send: ["M22 2 11 13", "M22 2 15 22l-4-9-9-4 20-7z"],
  inbox: ["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z", "M17 21v-8H7v8", "M7 3v5h8"],
  "arrow-left": ["M19 12H5", "M12 19l-7-7 7-7"],
  link: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", { c: [12, 7, 4] }],
  github: ["M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"],
  broom: ["M3 21l9-9", "M14.5 4.5l5 5", "M12.5 6.5l5 5-6 6-5-5z"],
  keyboard: [{ r: [2, 6, 20, 12, 2] }, "M6 10h.01", "M10 10h.01", "M14 10h.01", "M18 10h.01", "M7 14h10"],
};

const shapes = computed(() => {
  const list = ICONS[props.name] || ICONS.info;
  if (!props.filled) return list;
  return list.map((s) => (typeof s === "string" ? s : { ...s, fill: true }));
});
</script>

<style scoped>
.icon {
  display: block;
  flex-shrink: 0;
}
</style>
