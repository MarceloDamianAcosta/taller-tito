<script setup lang="ts">
interface Registro {
  id: number
  maquinaId: number
  fecha: string
  tipo: 'Preventivo' | 'Correctivo'
  descripcion: string
  responsable: string | null
  proximaFecha: string | null
}

const props = defineProps<{
  maquinaId?: number
  record?: Registro
}>()

const emit = defineEmits<{ saved: [] }>()

const { data: maquinas } = await useFetch('/api/machines')

const form = reactive({
  maquina_id: props.maquinaId ?? props.record?.maquinaId ?? null as number | null,
  fecha: props.record?.fecha ?? new Date().toISOString().slice(0, 10),
  tipo: props.record?.tipo ?? '' as 'Preventivo' | 'Correctivo' | '',
  descripcion: props.record?.descripcion ?? '',
  responsable: props.record?.responsable ?? '',
  proxima_fecha: props.record?.proximaFecha ?? ''
})

const saving = ref(false)
const error = ref('')

const maquinaOptions = computed(() =>
  (maquinas.value as any[] ?? []).map((m: any) => ({ label: m.nombre, value: m.id }))
)

async function save() {
  if (!form.maquina_id) { error.value = 'Seleccioná una máquina'; return }
  if (!form.tipo) { error.value = 'Seleccioná el tipo'; return }
  if (!form.descripcion.trim()) { error.value = 'La descripción es obligatoria'; return }

  saving.value = true
  error.value = ''
  try {
    const body = {
      maquina_id: form.maquina_id,
      fecha: form.fecha,
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
      responsable: form.responsable.trim() || null,
      proxima_fecha: form.proxima_fecha || null
    }
    if (props.record) {
      await $fetch(`/api/mantenimiento/${props.record.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/mantenimiento', { method: 'POST', body })
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
      v-if="!maquinaId"
      label="Máquina"
      required
    >
      <USelect
        v-model="form.maquina_id"
        :items="maquinaOptions"
        value-key="value"
        label-key="label"
        placeholder="Seleccioná una máquina"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Fecha"
      required
    >
      <UInput
        v-model="form.fecha"
        type="date"
        class="w-full"
      />
    </UFormField>

    <div>
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Tipo <span class="text-red-500">*</span></span>
      <div class="flex gap-2">
        <UButton
          label="Preventivo"
          size="sm"
          :color="form.tipo === 'Preventivo' ? 'primary' : 'neutral'"
          :variant="form.tipo === 'Preventivo' ? 'solid' : 'subtle'"
          @click="form.tipo = 'Preventivo'"
        />
        <UButton
          label="Correctivo"
          size="sm"
          :color="form.tipo === 'Correctivo' ? 'warning' : 'neutral'"
          :variant="form.tipo === 'Correctivo' ? 'solid' : 'subtle'"
          @click="form.tipo = 'Correctivo'"
        />
      </div>
    </div>

    <UFormField
      label="Descripción"
      required
    >
      <UTextarea
        v-model="form.descripcion"
        :rows="3"
        class="w-full"
        placeholder="Describir el mantenimiento realizado o a realizar"
      />
    </UFormField>

    <UFormField label="Responsable">
      <UInput
        v-model="form.responsable"
        class="w-full"
        placeholder="Nombre del responsable"
      />
    </UFormField>

    <UFormField label="Próxima revisión">
      <UInput
        v-model="form.proxima_fecha"
        type="date"
        class="w-full"
      />
    </UFormField>

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
