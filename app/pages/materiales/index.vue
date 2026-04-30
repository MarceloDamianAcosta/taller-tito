<script setup lang="ts">
definePageMeta({})

type Unidad = 'kg' | 'cm2' | 'mts' | 'mts2' | 'lts'

interface Material {
  id: number
  nombre: string
  unidad: Unidad
  tipo: string | null
  notas: string | null
  activo: boolean
}

const search = ref('')
const incluirInactivos = ref(false)
const modalOpen = ref(false)
const editingMaterial = ref<Material | null>(null)
const saving = ref(false)
const errorMsg = ref('')

const form = reactive({
  nombre: '',
  unidad: '' as Unidad | '',
  tipo: '',
  notas: '',
  activo: true
})

const unidadOptions = [
  { label: 'kg', value: 'kg' },
  { label: 'cm²', value: 'cm2' },
  { label: 'm', value: 'mts' },
  { label: 'm²', value: 'mts2' },
  { label: 'litros', value: 'lts' }
]

const { data: materiales, refresh } = await useFetch<Material[]>('/api/materiales', {
  query: computed(() => {
    const q: Record<string, string> = {}
    if (!incluirInactivos.value) q.activo = 'true'
    return q
  })
})

const filtered = computed(() => {
  const list = materiales.value ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(m =>
    m.nombre.toLowerCase().includes(q)
    || (m.tipo?.toLowerCase().includes(q) ?? false)
  )
})

const unidadLabel: Record<Unidad, string> = {
  kg: 'kg',
  cm2: 'cm²',
  mts: 'm',
  mts2: 'm²',
  lts: 'litros'
}

function openCreate() {
  editingMaterial.value = null
  form.nombre = ''
  form.unidad = ''
  form.tipo = ''
  form.notas = ''
  form.activo = true
  errorMsg.value = ''
  modalOpen.value = true
}

function openEdit(m: Material) {
  editingMaterial.value = m
  form.nombre = m.nombre
  form.unidad = m.unidad
  form.tipo = m.tipo ?? ''
  form.notas = m.notas ?? ''
  form.activo = m.activo
  errorMsg.value = ''
  modalOpen.value = true
}

async function save() {
  errorMsg.value = ''
  if (!form.nombre.trim()) {
    errorMsg.value = 'El nombre es obligatorio'
    return
  }
  if (!form.unidad) {
    errorMsg.value = 'La unidad es obligatoria'
    return
  }
  saving.value = true
  try {
    if (editingMaterial.value) {
      await $fetch(`/api/materiales/${editingMaterial.value.id}`, {
        method: 'PATCH',
        body: {
          nombre: form.nombre,
          unidad: form.unidad,
          tipo: form.tipo || null,
          notas: form.notas || null,
          activo: form.activo
        }
      })
    } else {
      await $fetch('/api/materiales', {
        method: 'POST',
        body: {
          nombre: form.nombre,
          unidad: form.unidad,
          tipo: form.tipo || null,
          notas: form.notas || null
        }
      })
    }
    modalOpen.value = false
    await refresh()
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

const tableColumns = [
  { accessorKey: 'nombre', header: 'Nombre' },
  { accessorKey: 'unidad', header: 'Unidad' },
  { accessorKey: 'tipo', header: 'Categoría' },
  { accessorKey: 'activo', header: 'Estado' },
  { id: 'acciones', header: '' }
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Catálogo de Materiales
      </h1>
      <UButton
        label="Nuevo material"
        icon="i-lucide-plus"
        @click="openCreate"
      />
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <UInput
        v-model="search"
        placeholder="Buscar por nombre o categoría..."
        icon="i-lucide-search"
        class="w-full sm:max-w-xs"
      />
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
        <USwitch v-model="incluirInactivos" />
        Mostrar inactivos
      </label>
    </div>

    <div class="hidden md:block">
      <UTable
        :data="filtered"
        :columns="tableColumns"
        class="w-full"
      >
        <template #unidad-cell="{ row }">
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ unidadLabel[row.original.unidad as Unidad] }}
          </UBadge>
        </template>

        <template #tipo-cell="{ row }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ row.original.tipo || '—' }}
          </span>
        </template>

        <template #activo-cell="{ row }">
          <UBadge
            :color="row.original.activo ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.activo ? 'Activo' : 'Inactivo' }}
          </UBadge>
        </template>

        <template #acciones-cell="{ row }">
          <UButton
            icon="i-lucide-pencil"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openEdit(row.original)"
          />
        </template>
      </UTable>

      <p
        v-if="filtered.length === 0"
        class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No hay materiales que coincidan con la búsqueda.
      </p>
    </div>

    <div class="md:hidden space-y-3">
      <div
        v-for="m in filtered"
        :key="m.id"
        class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="font-medium text-gray-900 dark:text-white text-sm">{{ m.nombre }}</span>
          <UButton
            icon="i-lucide-pencil"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openEdit(m)"
          />
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ unidadLabel[m.unidad] }}
          </UBadge>
          <UBadge
            :color="m.activo ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ m.activo ? 'Activo' : 'Inactivo' }}
          </UBadge>
          <span
            v-if="m.tipo"
            class="text-xs text-gray-500 dark:text-gray-400"
          >{{ m.tipo }}</span>
        </div>
        <p
          v-if="m.notas"
          class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2"
        >
          {{ m.notas }}
        </p>
      </div>

      <p
        v-if="filtered.length === 0"
        class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No hay materiales que coincidan con la búsqueda.
      </p>
    </div>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-4 space-y-4">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingMaterial ? 'Editar material' : 'Nuevo material' }}
          </h2>

          <div class="space-y-3">
            <UFormField
              label="Nombre"
              required
            >
              <UInput
                v-model="form.nombre"
                placeholder="Ej: Chapa 2mm"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Unidad"
              required
            >
              <USelect
                v-model="form.unidad"
                :items="unidadOptions"
                value-key="value"
                label-key="label"
                placeholder="Seleccionar unidad"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Categoría">
              <UInput
                v-model="form.tipo"
                placeholder="Ej: Metal, Lubricante"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Notas">
              <UTextarea
                v-model="form.notas"
                placeholder="Observaciones opcionales"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="editingMaterial"
              label="Activo"
            >
              <USwitch v-model="form.activo" />
            </UFormField>
          </div>

          <UAlert
            v-if="errorMsg"
            color="error"
            :description="errorMsg"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="modalOpen = false"
            />
            <UButton
              label="Guardar"
              :loading="saving"
              @click="save"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
