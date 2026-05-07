<script setup lang="ts">
const isOpen = ref(false)
const route = useRoute()
watch(() => route.path, () => { isOpen.value = false })
</script>

<template>
  <div class="min-h-screen bg-[var(--brand-fondo)] dark:bg-[var(--brand-fondo-oscuro)]">
    <AppNavbar :on-open="() => (isOpen = true)" />

    <USlideover
      v-model:open="isOpen"
      side="left"
      class="lg:hidden"
    >
      <template #content>
        <AppSidebar :on-nav-click="() => (isOpen = false)" />
      </template>
    </USlideover>

    <aside class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col lg:w-64">
      <AppSidebar />
    </aside>

    <main class="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
      <div class="p-4 lg:p-8">
        <slot />
      </div>
    </main>
  </div>
</template>
