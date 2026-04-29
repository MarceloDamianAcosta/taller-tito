<script setup lang="ts">
const emit = defineEmits<{
  created: [payload: { id: number; nombre: string; unidad: string }]
}>()

const modalOpen = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const form = reactive({
  nombre: '',
  unidad: '',
  tipo: ''
})

const unidadOptions = [
  { label: 'kg', value: 'kg' },
  { label: 'cm²', value: 'cm2' },
  { label: 'm', value: 'mts' },
  { label: 'm²', value: 'mts2' },
  { label: 'litros', value: 'lts' }
]

function open() {
  form.nombre = ''
  form.unidad = ''
  form.tipo = ''
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
    const result = await $fetch<{ id: number; nombre: string; unidad: string }>('/api/materiales', {
      method: 'POST',
      body: {
        nombre: form.nombre.trim(),
        unidad: form.unidad,
        tipo: form.tipo.trim() || null
      }
    })
    emit('created', { id: result.id, nombre: result.nombre, unidad: result.unidad })
    modalOpen.value = false
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-plus"
      size="sm"
      color="neutral"
      variant="subtle"
      aria-label="Agregar material"
      @click="open"
    />

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-4 space-y-4">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Agregar material</h2>

          <div class="space-y-3">
            <UFormField label="Nombre" required>
              <UInput v-model="form.nombre" placeholder="Ej: Chapa 2mm" class="w-full" />
            </UFormField>

            <UFormField label="Unidad" required>
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
              <UInput v-model="form.tipo" placeholder="Ej: Metal, Lubricante" class="w-full" />
            </UFormField>
          </div>

          <UAlert v-if="errorMsg" color="error" :description="errorMsg" />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="modalOpen = false"
            />
            <UButton
              label="Agregar"
              :loading="saving"
              @click="save"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
