<script setup lang="ts">
import { es } from '@nuxt/ui/locale'

const { nombreCompleto } = useAppBrand()

useHead({
  title: () => nombreCompleto.value,
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})
</script>

<template>
  <UApp :locale="es">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
