<script setup lang="ts">
const { brand } = useAppBrand()

const parte1 = computed(() => brand.value?.nombreParte1 ?? 'Mecanizados')
const parte2 = computed(() => brand.value?.nombreParte2 ?? 'Schmidt')
const logoPath = computed(() => brand.value?.logoPath ?? null)
</script>

<template>
  <div class="flex items-center gap-2 min-w-0 w-full overflow-hidden">
    <img
      v-if="logoPath"
      :src="logoPath"
      alt="Logo del taller"
      class="h-8 w-auto max-w-[45%] object-contain shrink-0"
    >
    <span class="min-w-0 truncate text-lg font-bold leading-tight">
      <span style="color: var(--ui-color-primary-600)">{{ parte1 }}</span>
      <span style="color: var(--brand-parte2)"> {{ parte2 }}</span>
    </span>
  </div>
</template>
