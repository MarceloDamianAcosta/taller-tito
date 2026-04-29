<script setup lang="ts">
const emit = defineEmits<{
  created: [payload: { id: number, nombre: string }]
}>()

const modalOpen = ref(false)
const nombre = ref('')
const saving = ref(false)
const error = ref('')

function open() {
  nombre.value = ''
  error.value = ''
  modalOpen.value = true
}

async function save() {
  error.value = ''
  if (!nombre.value.trim()) {
    error.value = 'El nombre es obligatorio'
    return
  }
  saving.value = true
  try {
    const created = await $fetch<{ id: number, nombre: string }>('/api/clientes', {
      method: 'POST',
      body: { nombre: nombre.value.trim() }
    })
    modalOpen.value = false
    emit('created', { id: created.id, nombre: created.nombre })
  } catch (e: any) {
    error.value = e.data?.message || 'Error al crear el cliente'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="inline-flex">
    <UButton
      icon="i-lucide-plus"
      size="sm"
      color="neutral"
      variant="outline"
      label="Nuevo cliente"
      @click="open"
    />

    <UModal
      v-model:open="modalOpen"
      title="Nuevo cliente rápido"
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
              v-model="nombre"
              placeholder="Nombre del cliente"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            :description="error"
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
              label="Crear"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
