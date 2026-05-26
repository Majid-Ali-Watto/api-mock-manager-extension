<template>
  <span :class="['method-badge', method.toLowerCase()]">
    {{ method }}
  </span>
</template>

<script setup>
defineProps({
  method: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.method-badge {
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  flex-shrink: 0;
}

.method-badge.get {
  background: #d4edda;
  color: #155724;
}

.method-badge.post {
  background: #d1ecf1;
  color: #0c5460;
}

.method-badge.put {
  background: #fff3cd;
  color: #856404;
}

.method-badge.patch {
  background: #e2d9f3;
  color: #6f42c1;
}

.method-badge.delete {
  background: #f8d7da;
  color: #721c24;
}
</style>
