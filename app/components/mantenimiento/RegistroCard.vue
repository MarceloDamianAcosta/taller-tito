<script setup lang="ts">
interface Record {
  id: number
  fecha: string
  tipo: 'Preventivo' | 'Correctivo'
  descripcion: string
  responsable: string | null
  proximaFecha: string | null
  maquina?: { nombre: string }
  maquinaNombre?: string
}

const props = defineProps<{ record: Record }>()
const emit = defineEmits<{ edit: [record: Record] }>()

function formatDate(iso: string) {
  if (!iso) return ''
  const parts = iso.slice(0, 10).split('-')
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const today = new Date().toISOString().slice(0, 10)

const proximaVencida = computed(() =>
  props.record.proximaFecha ? props.record.proximaFecha < today : false
)
</script>

<template>
  <UCard>
    <div class="space-y-2">
      <div class="flex items-start justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <UBadge
            :label="record.tipo"
            :color="record.tipo === 'Preventivo' ? 'info' : 'warning'"
            variant="subtle"
            size="sm"
          />
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(record.fecha) }}</span>
          <span
            v-if="record.maquinaNombre || record.maquina?.nombre"
            class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {{ record.maquinaNombre ?? record.maquina?.nombre }}
          </span>
        </div>
        <UButton
          label="Editar"
          size="xs"
          color="neutral"
          variant="outline"
          @click="emit('edit', record)"
        />
      </div>

      <p class="text-sm text-gray-800 dark:text-gray-200">
        {{ record.descripcion }}
      </p>

      <div
        v-if="record.responsable"
        class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
      >
        <UIcon
          name="i-lucide-user"
          class="size-3.5 shrink-0"
        />
        {{ record.responsable }}
      </div>

      <div
        v-if="record.proximaFecha"
        class="flex items-center gap-1 text-sm"
        :class="proximaVencida ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'"
      >
        <UIcon
          name="i-lucide-calendar-clock"
          class="size-3.5 shrink-0"
        />
        Próxima revisión: {{ formatDate(record.proximaFecha) }}
        <span
          v-if="proximaVencida"
          class="ml-1"
        >(vencida)</span>
      </div>
    </div>
  </UCard>
</template>
