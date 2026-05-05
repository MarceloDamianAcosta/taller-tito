<script setup lang="ts">
definePageMeta({})

interface OT {
  nroOt: number
  descripcion: string
  estado: string
  fechaIngreso: string
  fechaPrometida: string
  fechaEntrega: string | null
  clienteNombre: string | null
  maquinaNombre: string | null
  isOverdue: boolean
}

const search = ref('')
const activeTab = ref('Todos')
const searchDebounced = ref('')
let debounceTimer: ReturnType<typeof setTimeout>

watch(search, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    searchDebounced.value = val
  }, 300)
})

const tabs = ['Todos', 'Recepcionado', 'En proceso', 'Finalizado en stock', 'Entregado']

const fetchQuery = computed(() => {
  const q: Record<string, string> = {}
  if (activeTab.value !== 'Todos') q.estado = activeTab.value
  if (searchDebounced.value.trim()) q.q = searchDebounced.value.trim()
  return q
})

const { data: ordenes } = await useFetch<OT[]>('/api/workorders', {
  query: fetchQuery
})

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Sin fecha'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const tableColumns = [
  { accessorKey: 'nroOt', header: '#OT' },
  { accessorKey: 'estado', header: 'Estado' },
  { accessorKey: 'clienteNombre', header: 'Cliente' },
  { accessorKey: 'descripcion', header: 'Descripción' },
  { accessorKey: 'fechaPrometida', header: 'Fecha prometida' }
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Órdenes de Trabajo
      </h1>
      <UButton
        label="Nueva OT"
        icon="i-lucide-plus"
        to="/ordenes/nueva"
        class="hidden lg:inline-flex"
      />
    </div>

    <UInput
      v-model="search"
      placeholder="Buscar por descripción..."
      icon="i-lucide-search"
      class="w-full sm:max-w-sm"
    />

    <div class="flex gap-2 flex-wrap">
      <UButton
        v-for="tab in tabs"
        :key="tab"
        :label="tab"
        size="sm"
        :color="activeTab === tab ? 'primary' : 'neutral'"
        :variant="activeTab === tab ? 'solid' : 'subtle'"
        @click="activeTab = tab"
      />
    </div>

    <div class="hidden lg:block">
      <UTable
        :data="ordenes ?? []"
        :columns="tableColumns"
        class="w-full"
      >
        <template #nroOt-cell="{ row }">
          <NuxtLink
            :to="`/ordenes/${row.original.nroOt}`"
            class="font-mono font-semibold text-primary hover:underline"
          >
            #{{ row.original.nroOt }}
          </NuxtLink>
        </template>

        <template #estado-cell="{ row }">
          <OrdenesStatusBadge :estado="row.original.estado" />
        </template>

        <template #clienteNombre-cell="{ row }">
          <span class="text-sm">{{ row.original.clienteNombre || '—' }}</span>
        </template>

        <template #descripcion-cell="{ row }">
          <span
            class="text-sm max-w-xs truncate block"
            :class="row.original.isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''"
          >
            {{ row.original.descripcion }}
          </span>
        </template>

        <template #fechaPrometida-cell="{ row }">
          <span
            class="text-sm"
            :class="row.original.isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''"
          >
            {{ formatDate(row.original.fechaPrometida) }}
          </span>
        </template>
      </UTable>

      <p
        v-if="(ordenes ?? []).length === 0"
        class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No hay órdenes de trabajo que coincidan con los filtros.
      </p>
    </div>

    <div class="lg:hidden space-y-3">
      <NuxtLink
        v-for="ot in ordenes ?? []"
        :key="ot.nroOt"
        :to="`/ordenes/${ot.nroOt}`"
        class="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2"
        :class="ot.isOverdue ? 'border-l-4 border-l-red-500' : ''"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="font-mono font-semibold text-primary text-sm">#{{ ot.nroOt }}</span>
          <OrdenesStatusBadge :estado="ot.estado" />
        </div>
        <p
          class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2"
          :class="ot.isOverdue ? 'text-red-600 dark:text-red-400' : ''"
        >
          {{ ot.descripcion }}
        </p>
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{{ ot.clienteNombre || '—' }}</span>
          <span :class="ot.isOverdue ? 'text-red-500 font-medium' : ''">
            Prometida: {{ formatDate(ot.fechaPrometida) }}
          </span>
        </div>
      </NuxtLink>

      <p
        v-if="(ordenes ?? []).length === 0"
        class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No hay órdenes de trabajo que coincidan con los filtros.
      </p>
    </div>

    <UButton
      class="fixed bottom-6 right-6 lg:hidden"
      icon="i-lucide-plus"
      to="/ordenes/nueva"
      size="lg"
    />
  </div>
</template>
