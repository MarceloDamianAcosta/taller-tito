<script setup lang="ts">
const { brand } = useAppBrand()

// stacked: logo arriba y nombre abajo, centrado (login). Por defecto, horizontal (sidebar).
withDefaults(defineProps<{ stacked?: boolean }>(), { stacked: false })

const parte1 = computed(() => brand.value?.nombreParte1 ?? 'Mecanizados')
const parte2 = computed(() => brand.value?.nombreParte2 ?? 'Schmidt')
const logoPath = computed(() => brand.value?.logoPath ?? null)
</script>

<template>
  <div
    v-if="stacked"
    class="flex flex-col items-center text-center gap-3"
  >
    <img
      v-if="logoPath"
      :src="logoPath"
      alt="Logo del taller"
      class="h-16 w-auto max-w-full object-contain"
    >
    <span class="text-2xl font-bold leading-tight">
      <span style="color: var(--ui-color-primary-500)">{{ parte1 }}</span>
      <!-- En login (stacked) el logo va sobre el fondo (= secundario); la parte 2 usa el primario
           para no fundirse con el fondo. En sidebar/navbar la parte 2 va sobre el terciario. -->
      <span style="color: var(--ui-color-primary-500)"> {{ parte2 }}</span>
    </span>
  </div>

  <div
    v-else
    class="flex items-center gap-2 min-w-0 w-full overflow-hidden"
  >
    <img
      v-if="logoPath"
      :src="logoPath"
      alt="Logo del taller"
      class="h-8 w-auto max-w-[45%] object-contain shrink-0"
    >
    <span class="min-w-0 truncate text-lg font-bold leading-tight">
      <span style="color: var(--ui-color-primary-500)">{{ parte1 }}</span>
      <span style="color: var(--brand-parte2)"> {{ parte2 }}</span>
    </span>
  </div>
</template>
