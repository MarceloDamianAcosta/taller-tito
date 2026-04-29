<script setup lang="ts">
definePageMeta({ title: 'Dashboard' })

const { data, pending } = await useFetch('/api/dashboard/resumen')

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function entregasColor(pct: number) {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

    <template v-if="pending">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <USkeleton v-for="i in 4" :key="i" class="h-28 rounded-xl" />
      </div>
    </template>

    <template v-else-if="data">
      <div class="space-y-2">
        <UAlert
          v-if="data.alertas.otsVencidas > 0"
          color="warning"
          icon="i-lucide-alert-triangle"
          :title="`${data.alertas.otsVencidas} ${data.alertas.otsVencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}`"
          description="Hay órdenes con fecha prometida ya vencida."
        />
        <UAlert
          v-if="data.alertas.mantenimientosVencidos > 0"
          color="warning"
          icon="i-lucide-wrench"
          :title="`${data.alertas.mantenimientosVencidos} ${data.alertas.mantenimientosVencidos === 1 ? 'mantenimiento vencido' : 'mantenimientos vencidos'}`"
          description="Hay revisiones de máquinas vencidas."
        />
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">OTs Activas</p>
          <p class="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{{ data.kpis.otsActivas }}</p>
          <p class="text-xs text-gray-400 mt-1">de {{ data.kpis.otsTotal }} totales</p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">Entregas a tiempo</p>
          <p class="text-3xl font-bold mt-1" :class="entregasColor(data.kpis.entregasPorcentaje)">
            {{ data.kpis.entregasPorcentaje }}%
          </p>
          <p class="text-xs text-gray-400 mt-1">{{ data.kpis.entregasATiempo }} de {{ data.kpis.entregasTotal }}</p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">No Conformidades</p>
          <p class="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{{ data.kpis.noConformidadesTotal }}</p>
          <NuxtLink to="/indicadores" class="text-xs text-primary mt-1 block hover:underline">Ver indicadores →</NuxtLink>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500 dark:text-gray-400">Reprocesos</p>
          <p class="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{{ data.kpis.reprocesosTotal }}</p>
          <p class="text-xs text-gray-400 mt-1">trabajos con reproceso</p>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-900 dark:text-white">Órdenes en Curso</h2>
              <NuxtLink to="/ordenes" class="text-sm text-primary hover:underline">Ver todas →</NuxtLink>
            </div>
          </template>

          <div v-if="data.otsEnCurso.length === 0" class="text-sm text-gray-500 py-2">
            No hay órdenes activas.
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-gray-800 -mx-4 -mt-2">
            <NuxtLink
              v-for="ot in data.otsEnCurso"
              :key="ot.nroOt"
              :to="`/ordenes/${ot.nroOt}`"
              class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              :class="ot.isOverdue ? 'border-l-2 border-l-red-500' : ''"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm text-gray-900 dark:text-white">#{{ ot.nroOt }}</span>
                  <span class="text-xs text-gray-500 truncate">{{ ot.clienteNombre }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ ot.descripcion }}</p>
              </div>
              <div class="ml-3 shrink-0 text-right">
                <OrdenesStatusBadge :estado="ot.estado" />
                <p class="text-xs mt-1" :class="ot.isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'">
                  {{ formatDate(ot.fechaPrometida) }}
                </p>
              </div>
            </NuxtLink>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-900 dark:text-white">Próximos Mantenimientos</h2>
              <NuxtLink to="/mantenimiento" class="text-sm text-primary hover:underline">Ver todos →</NuxtLink>
            </div>
          </template>

          <div v-if="data.proximosMantenimientos.length === 0" class="text-sm text-gray-500 py-2">
            Sin mantenimientos programados.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="m in data.proximosMantenimientos"
              :key="m.id"
              class="flex items-center justify-between"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ m.maquinaNombre }}</p>
                <p class="text-xs text-gray-500">{{ m.tipo }}</p>
              </div>
              <span
                class="text-xs font-medium shrink-0"
                :class="m.proximaFecha && m.proximaFecha < new Date().toISOString().slice(0, 10) ? 'text-red-500' : 'text-gray-500'"
              >
                {{ formatDate(m.proximaFecha) }}
              </span>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
