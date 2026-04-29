<script setup lang="ts">
definePageMeta({ title: 'Indicadores' })

const periodo = ref('90d')
const periodos = [
  { label: '30 días', value: '30d' },
  { label: '90 días', value: '90d' },
  { label: '12 meses', value: '12m' },
  { label: 'Todo', value: 'all' }
]

const { data, pending } = await useFetch(() => `/api/indicadores?periodo=${periodo.value}`, {
  watch: [periodo]
})

function entregasColor(pct: number) {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function desviacionColor(hs: number | null) {
  if (hs === null) return 'text-gray-400'
  if (hs <= 0) return 'text-green-600 dark:text-green-400'
  if (hs <= 5) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function pctWidth(val: number, total: number) {
  if (!total) return '0%'
  return Math.round((val / total) * 100) + '%'
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Indicadores de Calidad ISO 9001</h1>
      <div class="flex gap-1">
        <UButton
          v-for="p in periodos"
          :key="p.value"
          :label="p.label"
          size="sm"
          :variant="periodo === p.value ? 'solid' : 'subtle'"
          :color="periodo === p.value ? 'primary' : 'neutral'"
          @click="periodo = p.value"
        />
      </div>
    </div>

    <template v-if="pending">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <USkeleton v-for="i in 4" :key="i" class="h-28 rounded-xl" />
      </div>
    </template>

    <template v-else-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">Entregas a tiempo</p>
          <p class="text-3xl font-bold mt-1" :class="entregasColor(data.entregas.porcentaje)">
            {{ data.entregas.porcentaje }}%
          </p>
          <p class="text-xs text-gray-400 mt-1">{{ data.entregas.aTiempo }} de {{ data.entregas.total }} entregas</p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">No Conformidades</p>
          <p class="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{{ data.noConformidades.porcentaje }}%</p>
          <p class="text-xs text-gray-400 mt-1">{{ data.noConformidades.conNc }} OTs con NC de {{ data.noConformidades.totalOts }}</p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">Reprocesos</p>
          <p class="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{{ data.reprocesos }}</p>
          <p class="text-xs text-gray-400 mt-1">trabajos con reproceso</p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">Desviación de tiempo</p>
          <p class="text-3xl font-bold mt-1" :class="desviacionColor(data.desviacionHoras)">
            {{ data.desviacionHoras !== null ? (data.desviacionHoras >= 0 ? '+' : '') + data.desviacionHoras + ' hs' : '—' }}
          </p>
          <p class="text-xs text-gray-400 mt-1">promedio vs estimado</p>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-900 dark:text-white">OTs por Estado</h2>
          </template>
          <div class="space-y-3">
            <div
              v-for="item in data.otsPorEstado"
              :key="item.estado"
              class="flex items-center gap-3"
            >
              <span class="text-sm w-40 truncate text-gray-700 dark:text-gray-300">{{ item.estado }}</span>
              <div class="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div
                  class="bg-primary h-2 rounded-full transition-all"
                  :style="{ width: pctWidth(item.cantidad, data.otsPorEstado.reduce((s, i) => s + i.cantidad, 0)) }"
                />
              </div>
              <span class="text-sm w-6 text-right text-gray-500">{{ item.cantidad }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-900 dark:text-white">Top Clientes</h2>
          </template>
          <div v-if="!data.topClientes.length" class="text-sm text-gray-500">Sin datos.</div>
          <ol v-else class="space-y-2">
            <li
              v-for="(c, i) in data.topClientes"
              :key="c.nombre"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-gray-400 w-4">{{ i + 1 }}.</span>
                <span class="text-sm truncate text-gray-900 dark:text-white">{{ c.nombre }}</span>
              </div>
              <UBadge color="neutral" variant="subtle" size="sm">{{ c.cantidad }} OTs</UBadge>
            </li>
          </ol>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-900 dark:text-white">Mantenimiento</h2>
          </template>
          <div class="flex gap-6 justify-center py-2">
            <div class="text-center">
              <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ data.mantenimiento.preventivo }}</p>
              <p class="text-sm text-gray-500 mt-1">Preventivos</p>
            </div>
            <div class="text-center">
              <p class="text-3xl font-bold text-amber-600 dark:text-amber-400">{{ data.mantenimiento.correctivo }}</p>
              <p class="text-sm text-gray-500 mt-1">Correctivos</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-gray-900 dark:text-white">Materiales más usados</h2>
          </template>
          <div v-if="!data.topMateriales.length" class="text-sm text-gray-500">Sin datos.</div>
          <ol v-else class="space-y-2">
            <li
              v-for="(m, i) in data.topMateriales"
              :key="m.nombre"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-gray-400 w-4">{{ i + 1 }}.</span>
                <span class="text-sm truncate text-gray-900 dark:text-white">{{ m.nombre }}</span>
              </div>
              <UBadge color="neutral" variant="subtle" size="sm">{{ m.usos }} usos</UBadge>
            </li>
          </ol>
        </UCard>
      </div>
    </template>
  </div>
</template>
