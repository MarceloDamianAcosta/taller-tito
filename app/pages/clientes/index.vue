<script setup lang="ts">
definePageMeta({ title: 'Clientes' })

interface Cliente {
  id: number
  nombre: string
  telefonos: string[]
  emails: string[]
  notas: string | null
  activo: boolean
}

const vista = ref<'activos' | 'ocultos'>('activos')
const searchQuery = ref('')
const modalOpen = ref(false)
const editingCliente = ref<Cliente | null>(null)
const saveError = ref('')
const saving = ref(false)
const togglingId = ref<number | null>(null)

const form = reactive({
  nombre: '',
  telefonos: [''] as string[],
  emails: [''] as string[],
  notas: '',
  activo: true
})

function addTelefono() {
  form.telefonos.push('')
}
function removeTelefono(i: number) {
  form.telefonos.splice(i, 1)
  if (form.telefonos.length === 0) form.telefonos.push('')
}
function addEmail() {
  form.emails.push('')
}
function removeEmail(i: number) {
  form.emails.splice(i, 1)
  if (form.emails.length === 0) form.emails.push('')
}

const { data: clientes, refresh } = await useFetch<Cliente[]>('/api/clientes', {
  query: computed(() => ({
    activo: vista.value === 'ocultos' ? 'false' : 'true'
  }))
})

async function mostrarCliente(cliente: Cliente) {
  togglingId.value = cliente.id
  try {
    await $fetch(`/api/clientes/${cliente.id}`, { method: 'PATCH', body: { activo: true } })
    vista.value = 'activos'
    await refresh()
  } finally {
    togglingId.value = null
  }
}

const filteredClientes = computed(() => {
  const list = clientes.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(c => c.nombre.toLowerCase().includes(q))
})

function openCreate() {
  editingCliente.value = null
  form.nombre = ''
  form.telefonos = ['']
  form.emails = ['']
  form.notas = ''
  form.activo = true
  saveError.value = ''
  modalOpen.value = true
}

function openEdit(cliente: Cliente) {
  editingCliente.value = cliente
  form.nombre = cliente.nombre
  form.telefonos = cliente.telefonos.length ? [...cliente.telefonos] : ['']
  form.emails = cliente.emails.length ? [...cliente.emails] : ['']
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
  const telefonos = form.telefonos.map(t => t.trim()).filter(Boolean)
  const emails = form.emails.map(e => e.trim()).filter(Boolean)
  saving.value = true
  try {
    if (editingCliente.value) {
      await $fetch(`/api/clientes/${editingCliente.value.id}`, {
        method: 'PATCH',
        body: {
          nombre: form.nombre,
          telefonos,
          emails,
          notas: form.notas || null,
          activo: form.activo
        }
      })
    } else {
      await $fetch('/api/clientes', {
        method: 'POST',
        body: {
          nombre: form.nombre,
          telefonos,
          emails,
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
      <div class="flex gap-1">
        <UButton
          label="Activos"
          size="sm"
          :color="vista === 'activos' ? 'primary' : 'neutral'"
          :variant="vista === 'activos' ? 'solid' : 'subtle'"
          @click="vista = 'activos'"
        />
        <UButton
          label="Ocultos"
          icon="i-lucide-eye-off"
          size="sm"
          :color="vista === 'ocultos' ? 'primary' : 'neutral'"
          :variant="vista === 'ocultos' ? 'solid' : 'subtle'"
          @click="vista = 'ocultos'"
        />
      </div>
    </div>

    <div
      v-if="filteredClientes.length === 0"
      class="text-center py-12 text-gray-400"
    >
      {{ vista === 'ocultos' ? 'No hay clientes ocultos.' : 'No hay clientes para mostrar.' }}
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
                  <div
                    v-if="cliente.telefonos.length"
                    class="space-y-0.5"
                  >
                    <div
                      v-for="(tel, i) in cliente.telefonos"
                      :key="i"
                    >
                      {{ tel }}
                    </div>
                  </div>
                  <template v-else>
                    —
                  </template>
                </td>
                <td class="py-3 px-3 text-gray-600 dark:text-gray-400">
                  <div
                    v-if="cliente.emails.length"
                    class="space-y-0.5"
                  >
                    <div
                      v-for="(mail, i) in cliente.emails"
                      :key="i"
                    >
                      {{ mail }}
                    </div>
                  </div>
                  <template v-else>
                    —
                  </template>
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
                  <div class="inline-flex gap-1">
                    <UButton
                      v-if="vista === 'ocultos'"
                      label="Mostrar"
                      icon="i-lucide-eye"
                      size="sm"
                      color="success"
                      variant="subtle"
                      :loading="togglingId === cliente.id"
                      @click="mostrarCliente(cliente)"
                    />
                    <UButton
                      icon="i-lucide-pencil"
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      @click="openEdit(cliente)"
                    />
                  </div>
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
                v-for="(tel, i) in cliente.telefonos"
                :key="`tel-${i}`"
                class="text-sm text-gray-500 flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="size-3.5 shrink-0"
                />
                {{ tel }}
              </div>
              <div
                v-for="(mail, i) in cliente.emails"
                :key="`mail-${i}`"
                class="text-sm text-gray-500 flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="size-3.5 shrink-0"
                />
                {{ mail }}
              </div>
            </div>
            <div class="flex flex-col gap-1 shrink-0">
              <UButton
                v-if="vista === 'ocultos'"
                label="Mostrar"
                icon="i-lucide-eye"
                size="sm"
                color="success"
                variant="subtle"
                :loading="togglingId === cliente.id"
                @click="mostrarCliente(cliente)"
              />
              <UButton
                icon="i-lucide-pencil"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="openEdit(cliente)"
              />
            </div>
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
            label="Teléfonos"
            name="telefonos"
          >
            <div class="space-y-2">
              <div
                v-for="(_, i) in form.telefonos"
                :key="`tel-input-${i}`"
                class="flex items-center gap-2"
              >
                <UInput
                  v-model="form.telefonos[i]"
                  placeholder="+54 9 11 1234-5678"
                  type="tel"
                  class="flex-1"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  :disabled="form.telefonos.length === 1 && !form.telefonos[0]"
                  aria-label="Quitar teléfono"
                  @click="removeTelefono(i)"
                />
              </div>
              <UButton
                label="Agregar teléfono"
                icon="i-lucide-plus"
                color="neutral"
                variant="subtle"
                size="sm"
                @click="addTelefono"
              />
            </div>
          </UFormField>

          <UFormField
            label="Emails"
            name="emails"
          >
            <div class="space-y-2">
              <div
                v-for="(_, i) in form.emails"
                :key="`mail-input-${i}`"
                class="flex items-center gap-2"
              >
                <UInput
                  v-model="form.emails[i]"
                  placeholder="cliente@email.com"
                  type="email"
                  class="flex-1"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  :disabled="form.emails.length === 1 && !form.emails[0]"
                  aria-label="Quitar email"
                  @click="removeEmail(i)"
                />
              </div>
              <UButton
                label="Agregar email"
                icon="i-lucide-plus"
                color="neutral"
                variant="subtle"
                size="sm"
                @click="addEmail"
              />
            </div>
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
