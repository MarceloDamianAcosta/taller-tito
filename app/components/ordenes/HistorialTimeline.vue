<script setup lang="ts">
const props = defineProps<{
  otId: number | string
  estado?: string
}>()

interface HistorialItem {
  id: number
  estadoAnterior: string | null
  estadoNuevo: string
  fecha: string
  operarioNombre: string | null
  usuario: string | null
}

const { data: historial } = await useFetch<HistorialItem[]>(
  () => `/api/workorders/${props.otId}/historial`,
  { watch: [() => props.estado] }
)

function formatFecha(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white">
      Historial de estados
    </h2>

    <div
      v-if="!historial || historial.length === 0"
      class="text-sm text-gray-400"
    >
      Todavía no hay cambios de estado registrados.
    </div>

    <ol
      v-else
      class="space-y-4"
    >
      <li
        v-for="item in historial"
        :key="item.id"
        class="flex gap-3"
      >
        <div class="flex flex-col items-center">
          <span class="size-2.5 rounded-full bg-primary-500 shrink-0 mt-1.5" />
          <span class="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div class="pb-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            <span
              v-if="item.estadoAnterior"
              class="text-gray-500 dark:text-gray-400"
            >{{ item.estadoAnterior }} → </span>
            {{ item.estadoNuevo }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ formatFecha(item.fecha) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Operario: {{ item.operarioNombre || '—' }} · Usuario: {{ item.usuario || '—' }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
