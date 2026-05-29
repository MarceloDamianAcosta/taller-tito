<script setup lang="ts">
defineProps<{ onNavClick?: () => void }>()

const route = useRoute()
const { user, clear } = useUserSession()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Órdenes de Trabajo', to: '/ordenes', icon: 'i-lucide-clipboard-list' },
  { label: 'Clientes', to: '/clientes', icon: 'i-lucide-users' },
  { label: 'Operarios', to: '/operarios', icon: 'i-lucide-hard-hat' },
  { label: 'Materiales', to: '/materiales', icon: 'i-lucide-package' },
  { label: 'Biblioteca', to: '/biblioteca', icon: 'i-lucide-folder-open' },
  { label: 'Mantenimiento', to: '/mantenimiento', icon: 'i-lucide-wrench' },
  { label: 'Indicadores', to: '/indicadores', icon: 'i-lucide-bar-chart-2' },
  { label: 'Usuarios', to: '/admin/usuarios', icon: 'i-lucide-user-cog' },
  { label: 'Configuración', to: '/admin/configuracion', icon: 'i-lucide-settings' }
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <nav class="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <div class="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
      <NuxtLink
        to="/"
        @click="onNavClick?.()"
      >
        <AppLogo />
      </NuxtLink>
    </div>

    <ul class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      <li
        v-for="item in navItems"
        :key="item.to"
      >
        <NuxtLink
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive(item.to)
            ? 'bg-primary/10 text-primary'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          @click="onNavClick?.()"
        >
          <UIcon
            :name="item.icon"
            class="size-5 shrink-0"
          />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>

    <div class="px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
      <div
        v-if="user"
        class="flex items-center gap-2 px-1"
      >
        <UIcon
          name="i-lucide-circle-user"
          class="size-5 text-gray-500 shrink-0"
        />
        <span class="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{{ user.name || user.username }}</span>
        <UColorModeButton />
      </div>
      <UButton
        label="Salir"
        icon="i-lucide-log-out"
        color="neutral"
        variant="subtle"
        class="w-full justify-start"
        @click="logout"
      />
    </div>
  </nav>
</template>
