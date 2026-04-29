<script setup lang="ts">
definePageMeta({ title: 'Mantenimiento' })

const today = new Date().toISOString().slice(0, 10)

const { data: maquinas, refresh: refreshMaquinas } = await useFetch('/api/machines')
const { data: registros, refresh: refreshRegistros } = await useFetch('/api/mantenimiento')

const showMaquinaModal = ref(false)
const showRegistroModal = ref(false)
const editingMaquina = ref<any>(null)
const editingRegistro = ref<any>(null)
const filtroMaquina = ref<number | null>(null)
const filtroTipo = ref<string>('Todos')

const registrosFiltrados = computed(() => {
  let list = (registros.value as any[] ?? [])
  if (filtroMaquina.value) list = list.filter((r: any) => r.maquinaId === filtroMaquina.value)
  if (filtroTipo.value !== 'Todos') list = list.filter((r: any) => r.tipo === filtroTipo.value)
  return list
})

const hayVencidos = computed(() =>
  (registros.value as any[] ?? []).some((r: any) => r.proximaFecha && r.proximaFecha < today)
)

const maquinaOptions = computed(() => [
  { label: 'Todas', value: null },
  ...(maquinas.value as any[] ?? []).map((m: any) => ({ label: m.nombre, value: m.id }))
])

function openCreateMaquina() {
  editingMaquina.value = null
  showMaquinaModal.value = true
}

function openEditMaquina(m: any) {
  editingMaquina.value = m
  showMaquinaModal.value = true
}

function openCreateRegistro() {
  editingRegistro.value = null
  showRegistroModal.value = true
}

function onMaquinaSaved() {
  showMaquinaModal.value = false
  refreshMaquinas()
}

function onRegistroSaved() {
  showRegistroModal.value = false
  refreshRegistros()
}
</script>

<template>
  <div class="space-y-8">
    <UAlert
      v-if="hayVencidos"
      color="warning"
      icon="i-lucide-alert-triangle"
      title="Hay revisiones vencidas o próximas a vencer"
    />

    <section class="space-y-4">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          Máquinas
        </h2>
        <UButton
          label="Nueva máquina"
          icon="i-lucide-plus"
          @click="openCreateMaquina"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="m in (maquinas as any[] ?? [])"
          :key="m.id"
          :class="!m.activo ? 'opacity-60' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ m.nombre }}
              </p>
              <p
                v-if="m.descripcion"
                class="text-sm text-gray-500 mt-0.5 truncate"
              >
                {{ m.descripcion }}
              </p>
            </div>
            <UBadge
              :color="m.activo ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            >
              {{ m.activo ? 'Activa' : 'Inactiva' }}
            </UBadge>
          </div>
          <div class="flex gap-2 mt-3">
            <UButton
              label="Ver historial"
              size="sm"
              variant="subtle"
              :to="`/mantenimiento/${m.id}`"
            />
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="openEditMaquina(m)"
            />
          </div>
        </UCard>
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          Registros de Mantenimiento
        </h2>
        <UButton
          label="Nuevo registro"
          icon="i-lucide-plus"
          @click="openCreateRegistro"
        />
      </div>

      <div class="flex flex-wrap gap-3">
        <USelect
          v-model="filtroMaquina"
          :items="maquinaOptions"
          value-key="value"
          label-key="label"
          placeholder="Filtrar por máquina"
          class="w-48"
        />
        <div class="flex gap-1">
          <UButton
            v-for="tipo in ['Todos', 'Preventivo', 'Correctivo']"
            :key="tipo"
            :label="tipo"
            size="sm"
            :variant="filtroTipo === tipo ? 'solid' : 'subtle'"
            :color="filtroTipo === tipo ? 'primary' : 'neutral'"
            @click="filtroTipo = tipo"
          />
        </div>
      </div>

      <div
        v-if="!registrosFiltrados.length"
        class="text-sm text-gray-500"
      >
        No hay registros con los filtros seleccionados.
      </div>

      <div class="space-y-3">
        <MantenimientoRegistroCard
          v-for="r in registrosFiltrados"
          :key="r.id"
          :record="r"
          @edit="(rec) => { editingRegistro = rec; showRegistroModal = true }"
        />
      </div>
    </section>

    <UModal v-model:open="showMaquinaModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-base font-semibold">
            {{ editingMaquina ? 'Editar máquina' : 'Nueva máquina' }}
          </h3>
          <MantenimientoMaquinaForm
            :machine="editingMaquina"
            @saved="onMaquinaSaved"
          />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showRegistroModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-base font-semibold">
            {{ editingRegistro ? 'Editar registro' : 'Nuevo registro' }}
          </h3>
          <MantenimientoRegistroForm
            :record="editingRegistro"
            @saved="onRegistroSaved"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
