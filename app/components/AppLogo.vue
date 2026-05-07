<script setup lang="ts">
const { brand } = useAppBrand()

const parte1 = computed(() => brand.value?.nombreParte1 ?? 'Mecanizados')
const parte2 = computed(() => brand.value?.nombreParte2 ?? 'Schmidt')
const colorParte1 = computed(() => brand.value?.colorPrimario ?? 'var(--brand-600)')
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="text-lg font-bold"
      :style="{ color: colorParte1 }"
    >{{ parte1 }}</span>
    <span
      class="text-lg font-bold"
      style="color: var(--brand-parte2)"
    >{{ parte2 }}</span>
  </div>
</template>
