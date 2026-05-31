<script setup lang="ts">
const { brand } = useAppBrand()

const parte1 = computed(() => brand.value?.nombreParte1 ?? 'Mecanizados')
const parte2 = computed(() => brand.value?.nombreParte2 ?? 'Schmidt')
const logoPath = computed(() => brand.value?.logoPath ?? null)
</script>

<template>
  <div class="flex items-center gap-2">
    <img
      v-if="logoPath"
      :src="logoPath"
      alt="Logo del taller"
      class="h-8 w-auto object-contain shrink-0"
    >
    <span
      class="text-lg font-bold"
      style="color: var(--ui-color-primary-600)"
    >{{ parte1 }}</span>
    <span
      class="text-lg font-bold"
      style="color: var(--brand-parte2)"
    >{{ parte2 }}</span>
  </div>
</template>
