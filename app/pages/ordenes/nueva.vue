<script setup lang="ts">
definePageMeta({ title: 'Nueva OT' })

interface Cliente { id: number, nombre: string }
interface Maquina { id: number, nombre: string }

const router = useRouter()
const saving = ref(false)
const errorMsg = ref('')
const selectedArchivoIds = ref<number[]>([])

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  cliente_id: undefined as number | undefined,
  descripcion: '',
  material: '',
  cantidad: '',
  maquina_id: undefined as number | undefined,
  fecha_ingreso: today,
  fecha_prometida: '',
  tiempo_estimado_hs: '',
  observaciones: ''
})

const { data: clientesData } = await useFetch<Cliente[]>('/api/clientes', {
  query: { activo: 'true' }
})
const { data: maquinasData } = await useFetch<Maquina[]>('/api/machines')

const clienteOptions = computed(() =>
  (clientesData.value ?? []).map(c => ({ label: c.nombre, value: c.id }))
)

const maquinaOptions = computed(() => [
  { label: 'Sin máquina', value: null },
  ...(maquinasData.value ?? []).map(m => ({ label: m.nombre, value: m.id }))
])

function onClienteCreated(payload: { id: number, nombre: string }) {
  clientesData.value = [...(clientesData.value ?? []), payload]
  form.cliente_id = payload.id as number | undefined
}

async function submit() {
  errorMsg.value = ''
  if (!form.cliente_id && form.cliente_id !== 0) { errorMsg.value = 'Seleccioná un cliente'; return }
  if (!form.descripcion.trim()) { errorMsg.value = 'La descripción es obligatoria'; return }
  if (!form.fecha_prometida) { errorMsg.value = 'La fecha prometida es obligatoria'; return }

  saving.value = true
  try {
    const created = await $fetch<{ nroOt: number }>('/api/workorders', {
      method: 'POST',
      body: {
        cliente_id: form.cliente_id ?? null,
        descripcion: form.descripcion.trim(),
        material: form.material.trim() || null,
        cantidad: form.cantidad !== '' ? Number(form.cantidad) : null,
        maquina_id: form.maquina_id ?? null,
        fecha_ingreso: form.fecha_ingreso,
        fecha_prometida: form.fecha_prometida,
        tiempo_estimado_hs: form.tiempo_estimado_hs !== '' ? Number(form.tiempo_estimado_hs) : null,
        observaciones: form.observaciones.trim() || null
      }
    })

    if (selectedArchivoIds.value.length > 0) {
      await $fetch(`/api/workorders/${created.nroOt}/archivos`, {
        method: 'POST',
        body: { biblioteca_ids: selectedArchivoIds.value }
      })
    }

    await router.push(`/ordenes/${created.nroOt}`)
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        to="/ordenes"
      />
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Nueva Orden de Trabajo
      </h1>
    </div>

    <form
      class="space-y-4"
      @submit.prevent="submit"
    >
      <UFormField
        label="Cliente"
        required
      >
        <div class="flex items-center gap-2">
          <USelect
            v-model="form.cliente_id"
            :items="clienteOptions"
            value-key="value"
            label-key="label"
            placeholder="Seleccionar cliente"
            class="flex-1"
          />
          <ClientesQuickAdd @created="onClienteCreated" />
        </div>
      </UFormField>

      <UFormField
        label="Descripción"
        required
      >
        <UTextarea
          v-model="form.descripcion"
          placeholder="Descripción del trabajo a realizar"
          class="w-full"
          :rows="3"
        />
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Material">
          <UInput
            v-model="form.material"
            placeholder="Ej: Chapa 2mm"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Cantidad">
          <UInput
            v-model="form.cantidad"
            type="number"
            min="0"
            placeholder="Ej: 10"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField label="Máquina">
        <USelect
          v-model="form.maquina_id"
          :items="maquinaOptions"
          value-key="value"
          label-key="label"
          placeholder="Sin máquina"
          class="w-full"
        />
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="Fecha de ingreso"
          required
        >
          <UInput
            v-model="form.fecha_ingreso"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Fecha prometida"
          required
        >
          <UInput
            v-model="form.fecha_prometida"
            type="date"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField label="Tiempo estimado (hs)">
        <UInput
          v-model="form.tiempo_estimado_hs"
          type="number"
          min="0"
          step="0.5"
          placeholder="Ej: 8.5"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Observaciones">
        <UTextarea
          v-model="form.observaciones"
          placeholder="Observaciones opcionales"
          class="w-full"
          :rows="3"
        />
      </UFormField>

      <UAlert
        v-if="errorMsg"
        color="error"
        :description="errorMsg"
      />

      <div class="flex justify-end gap-3 pt-2">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="subtle"
          to="/ordenes"
        />
        <UButton
          type="submit"
          label="Crear OT"
          icon="i-lucide-save"
          :loading="saving"
        />
      </div>
    </form>
  </div>
</template>
