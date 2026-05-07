<script setup lang="ts">
const route = useRoute()

const { data: machine, refresh: refreshMachine } = await useFetch<any>(() => `/api/machines/${route.params.id}`)
const { data: registros } = await useFetch<any[]>(() => `/api/mantenimiento?maquina_id=${route.params.id}`)

const showEditModal = ref(false)
const showRegistroModal = ref(false)
const editingRegistro = ref<any>(null)
const filtroTipo = ref('Todos')
const toggling = ref(false)

const registrosFiltrados = computed(() => {
  const list = registros.value ?? []
  if (filtroTipo.value === 'Todos') return list
  return list.filter((r: any) => r.tipo === filtroTipo.value)
})

async function toggleActivo() {
  if (!machine.value) return
  toggling.value = true
  try {
    await $fetch(`/api/machines/${route.params.id}`, {
      method: 'PATCH',
      body: { activo: !machine.value.activo }
    })
    await refreshMachine()
  } finally {
    toggling.value = false
  }
}

function onMaquinaSaved() {
  showEditModal.value = false
  refreshMachine()
}

function onRegistroSaved() {
  showRegistroModal.value = false
  navigateTo('/')
}
</script>

<template>
  <div
    v-if="machine"
    class="space-y-6"
  >
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ machine.nombre }}
          </h1>
          <UBadge
            :color="machine.activo ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ machine.activo ? 'Activa' : 'Inactiva' }}
          </UBadge>
        </div>
        <p
          v-if="machine.descripcion"
          class="text-gray-500 mt-1"
        >
          {{ machine.descripcion }}
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <UButton
          label="Editar"
          icon="i-lucide-pencil"
          color="neutral"
          variant="subtle"
          @click="showEditModal = true"
        />
        <UButton
          :label="machine.activo ? 'Desactivar' : 'Reactivar'"
          :color="machine.activo ? 'error' : 'success'"
          variant="subtle"
          :loading="toggling"
          @click="toggleActivo"
        />
      </div>
    </div>

    <div class="flex items-center justify-between gap-2 flex-wrap">
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
      <UButton
        label="Registrar mantenimiento"
        icon="i-lucide-plus"
        @click="() => { editingRegistro = null; showRegistroModal = true }"
      />
    </div>

    <div
      v-if="!registrosFiltrados.length"
      class="text-sm text-gray-500"
    >
      No hay registros para esta máquina.
    </div>

    <div class="space-y-3">
      <MantenimientoRegistroCard
        v-for="r in registrosFiltrados"
        :key="r.id"
        :record="r"
        @edit="(rec) => { editingRegistro = rec; showRegistroModal = true }"
      />
    </div>

    <UModal v-model:open="showEditModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-base font-semibold">
            Editar máquina
          </h3>
          <MantenimientoMaquinaForm
            :machine="machine"
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
            :maquina-id="machine.id"
            :record="editingRegistro"
            @saved="onRegistroSaved"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
