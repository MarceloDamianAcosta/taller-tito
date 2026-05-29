<script setup lang="ts">
definePageMeta({ title: 'Operarios' })

interface Operario {
  id: number
  nombre: string
  activo: boolean
}

const showInactive = ref(false)
const searchQuery = ref('')
const modalOpen = ref(false)
const editingOperario = ref<Operario | null>(null)
const saveError = ref('')
const saving = ref(false)

const form = reactive({
  nombre: '',
  activo: true
})

const { data: operarios, refresh } = await useFetch<Operario[]>('/api/operarios', {
  query: computed(() => ({
    activo: showInactive.value ? undefined : 'true'
  }))
})

const filteredOperarios = computed(() => {
  const list = operarios.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(o => o.nombre.toLowerCase().includes(q))
})

function openCreate() {
  editingOperario.value = null
  form.nombre = ''
  form.activo = true
  saveError.value = ''
  modalOpen.value = true
}

function openEdit(operario: Operario) {
  editingOperario.value = operario
  form.nombre = operario.nombre
  form.activo = operario.activo
  saveError.value = ''
  modalOpen.value = true
}

async function save() {
  saveError.value = ''
  if (!form.nombre.trim()) {
    saveError.value = 'El nombre es obligatorio'
    return
  }
  saving.value = true
  try {
    if (editingOperario.value) {
      await $fetch(`/api/operarios/${editingOperario.value.id}`, {
        method: 'PATCH',
        body: { nombre: form.nombre, activo: form.activo }
      })
    } else {
      await $fetch('/api/operarios', {
        method: 'POST',
        body: { nombre: form.nombre }
      })
    }
    modalOpen.value = false
    await refresh()
  } catch (e: any) {
    saveError.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Operarios
      </h1>
      <UButton
        label="Nuevo operario"
        icon="i-lucide-plus"
        @click="openCreate"
      />
    </div>

    <div class="flex flex-col sm:flex-row gap-3">
      <UInput
        v-model="searchQuery"
        placeholder="Buscar por nombre..."
        icon="i-lucide-search"
        class="flex-1"
      />
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        <USwitch v-model="showInactive" />
        <span>Ver inactivos</span>
      </label>
    </div>

    <div
      v-if="filteredOperarios.length === 0"
      class="text-center py-12 text-gray-400"
    >
      No hay operarios para mostrar.
    </div>

    <div v-else>
      <div class="hidden md:block">
        <UCard>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                  Nombre
                </th>
                <th class="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                  Estado
                </th>
                <th class="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="operario in filteredOperarios"
                :key="operario.id"
                class="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                :class="{ 'opacity-60': !operario.activo }"
              >
                <td class="py-3 px-3 font-medium text-gray-900 dark:text-white">
                  {{ operario.nombre }}
                </td>
                <td class="py-3 px-3">
                  <UBadge
                    :label="operario.activo ? 'Activo' : 'Inactivo'"
                    :color="operario.activo ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                  />
                </td>
                <td class="py-3 px-3 text-right">
                  <UButton
                    icon="i-lucide-pencil"
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    @click="openEdit(operario)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>

      <div class="md:hidden space-y-3">
        <UCard
          v-for="operario in filteredOperarios"
          :key="operario.id"
          :class="{ 'opacity-60': !operario.activo }"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <span class="font-semibold text-gray-900 dark:text-white">{{ operario.nombre }}</span>
              <UBadge
                :label="operario.activo ? 'Activo' : 'Inactivo'"
                :color="operario.activo ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
              />
            </div>
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="openEdit(operario)"
            />
          </div>
        </UCard>
      </div>
    </div>

    <UModal
      v-model:open="modalOpen"
      :title="editingOperario ? 'Editar operario' : 'Nuevo operario'"
    >
      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="save"
        >
          <UFormField
            label="Nombre"
            name="nombre"
            required
          >
            <UInput
              v-model="form.nombre"
              placeholder="Nombre del operario"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="editingOperario"
            label="Activo"
            name="activo"
          >
            <USwitch v-model="form.activo" />
          </UFormField>

          <UAlert
            v-if="saveError"
            color="error"
            :description="saveError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="outline"
              @click="modalOpen = false"
            />
            <UButton
              type="submit"
              :label="editingOperario ? 'Guardar cambios' : 'Crear operario'"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
