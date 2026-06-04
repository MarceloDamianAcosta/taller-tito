<script setup lang="ts">
defineProps<{
  onOpen: () => void
}>()
</script>

<template>
  <header class="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-default border-b border-default">
    <NuxtLink to="/">
      <AppLogo />
    </NuxtLink>
    <div class="flex items-center gap-2">
      <UColorModeButton />
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        aria-label="Abrir menú"
        @click="onOpen"
      />
    </div>
  </header>
</template>
