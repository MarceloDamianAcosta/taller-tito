<script setup lang="ts">
definePageMeta({ title: 'Clientes' })

interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  notas: string | null
  activo: boolean
}

const showInactive = ref(false)
const searchQuery = ref('')
const modalOpen = ref(false)
const editingCliente = ref<Cliente | null>(null)
const saveError = ref('')
const saving = ref(false)

const form = reactive({
  nombre: '',
  telefono: '',
  email: '',
  notas: '',
  activo: true
})

const { data: clientes, refresh } = await useFetch<Cliente[]>('/api/clientes', {
  query: computed(() => ({
    activo: showInactive.value ? undefined : 'true'
  }))
})

const filteredClientes = computed(() => {
  const list = clientes.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(c => c.nombre.toLowerCase().includes(q))
})

function openCreate() {
  editingCliente.value = null
  form.nombre = ''
  form.telefono = ''
  form.email = ''
  form.notas = ''
  form.activo = true
  saveError.value = ''
  modalOpen.value = true
}

function openEdit(cliente: Cliente) {
  editingCliente.value = cliente
  form.nombre = cliente.nombre
  form.telefono = cliente.telefono ?? ''
  form.email = cliente.email ?? ''
  form.notas = cliente.notas ?? ''
  form.activo = cliente.activo
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
    if (editingCliente.value) {
      await $fetch(`/api/clientes/${editingCliente.value.id}`, {
        method: 'PATCH',
        body: {
          nombre: form.nombre,
          telefono: form.telefono || null,
          email: form.email || null,
          notas: form.notas || null,
          activo: form.activo
        }
      })
    } else {
      await $fetch('/api/clientes', {
        method: 'POST',
        body: {
          nombre: form.nombre,
          telefono: form.telefono || null,
          email: form.email || null,
          notas: form.notas || null
        }
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
        Clientes
      </h1>
      <UButton
        label="Nuevo cliente"
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
      v-if="filteredClientes.length === 0"
      class="text-center py-12 text-gray-400"
    >
      No hay clientes para mostrar.
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
                  Teléfono
                </th>
                <th class="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                  Email
                </th>
                <th class="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                  Estado
                </th>
                <th class="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cliente in filteredClientes"
                :key="cliente.id"
                class="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                :class="{ 'opacity-60': !cliente.activo }"
              >
                <td class="py-3 px-3 font-medium text-gray-900 dark:text-white">
                  {{ cliente.nombre }}
                </td>
                <td class="py-3 px-3 text-gray-600 dark:text-gray-400">
                  {{ cliente.telefono ?? '—' }}
                </td>
                <td class="py-3 px-3 text-gray-600 dark:text-gray-400">
                  {{ cliente.email ?? '—' }}
                </td>
                <td class="py-3 px-3">
                  <UBadge
                    :label="cliente.activo ? 'Activo' : 'Inactivo'"
                    :color="cliente.activo ? 'success' : 'neutral'"
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
                    @click="openEdit(cliente)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>

      <div class="md:hidden space-y-3">
        <UCard
          v-for="cliente in filteredClientes"
          :key="cliente.id"
          :class="{ 'opacity-60': !cliente.activo }"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-gray-900 dark:text-white">{{ cliente.nombre }}</span>
                <UBadge
                  :label="cliente.activo ? 'Activo' : 'Inactivo'"
                  :color="cliente.activo ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                />
              </div>
              <div
                v-if="cliente.telefono"
                class="text-sm text-gray-500 flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="size-3.5 shrink-0"
                />
                {{ cliente.telefono }}
              </div>
              <div
                v-if="cliente.email"
                class="text-sm text-gray-500 flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="size-3.5 shrink-0"
                />
                {{ cliente.email }}
              </div>
            </div>
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="openEdit(cliente)"
            />
          </div>
        </UCard>
      </div>
    </div>

    <UModal
      v-model:open="modalOpen"
      :title="editingCliente ? 'Editar cliente' : 'Nuevo cliente'"
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
              placeholder="Nombre del cliente"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Teléfono"
            name="telefono"
          >
            <UInput
              v-model="form.telefono"
              placeholder="+54 9 11 1234-5678"
              type="tel"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Email"
            name="email"
          >
            <UInput
              v-model="form.email"
              placeholder="cliente@email.com"
              type="email"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Notas"
            name="notas"
          >
            <UTextarea
              v-model="form.notas"
              placeholder="Observaciones opcionales..."
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="editingCliente"
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
              :label="editingCliente ? 'Guardar cambios' : 'Crear cliente'"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
