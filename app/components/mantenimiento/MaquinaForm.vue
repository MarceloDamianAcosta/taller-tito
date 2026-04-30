<script setup lang="ts">
interface Maquina {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
}

const props = defineProps<{ machine?: Maquina }>()
const emit = defineEmits<{ saved: [] }>()

const form = reactive({
  nombre: props.machine?.nombre ?? '',
  descripcion: props.machine?.descripcion ?? '',
  activo: props.machine?.activo ?? true
})

const saving = ref(false)
const error = ref('')

async function save() {
  if (!form.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  saving.value = true
  error.value = ''
  try {
    if (props.machine) {
      await $fetch(`/api/machines/${props.machine.id}`, {
        method: 'PATCH',
        body: { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, activo: form.activo }
      })
    } else {
      await $fetch('/api/machines', {
        method: 'POST',
        body: { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null }
      })
    }
    emit('saved')
  } catch (e: any) {
    error.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UFormField
      label="Nombre"
      required
    >
      <UInput
        v-model="form.nombre"
        class="w-full"
        placeholder="Ej: Torno CNC #1"
      />
    </UFormField>

    <UFormField label="Descripción">
      <UTextarea
        v-model="form.descripcion"
        :rows="2"
        class="w-full"
        placeholder="Descripción opcional"
      />
    </UFormField>

    <div
      v-if="machine"
      class="flex items-center gap-3"
    >
      <USwitch v-model="form.activo" />
      <span class="text-sm text-gray-700 dark:text-gray-300">Activa</span>
    </div>

    <UAlert
      v-if="error"
      color="error"
      :description="error"
    />

    <div class="flex gap-2 justify-end pt-2">
      <UButton
        label="Guardar"
        :loading="saving"
        @click="save"
      />
    </div>
  </div>
</template>
