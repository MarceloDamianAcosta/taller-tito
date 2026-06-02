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
  que_se_controla: '',
  maquina_ids: [] as number[],
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

const maquinaOptions = computed(() =>
  (maquinasData.value ?? []).map(m => ({ label: m.nombre, value: m.id }))
)

function onClienteCreated(payload: { id: number, nombre: string }) {
  clientesData.value = [...(clientesData.value ?? []), payload]
  form.cliente_id = payload.id as number | undefined
}

// Operario que recepciona la OT (TITO-114): se pide en un modal al confirmar el alta.
interface Operario { id: number, nombre: string }
const { data: operariosData } = await useFetch<Operario[]>('/api/operarios', { query: { activo: 'true' } })
const operarioOptions = computed(() =>
  (operariosData.value ?? []).map(o => ({ label: o.nombre, value: o.id }))
)
const showOperarioModal = ref(false)
const selectedOperarioId = ref<number | undefined>(undefined)
const operarioModalError = ref('')

// Mientras el modal de operario está abierto, el botón atrás queda trabado (TITO-120).
const { blocked } = useBackGuard()
watch(showOperarioModal, (open) => { blocked.value = open })
onUnmounted(() => { blocked.value = false })

function onOperarioCreated(payload: { id: number, nombre: string }) {
  operariosData.value = [...(operariosData.value ?? []), payload]
  selectedOperarioId.value = payload.id
}

// Paso 1: validar el formulario y abrir el modal de operario.
function pedirOperario() {
  errorMsg.value = ''
  if (!form.cliente_id && form.cliente_id !== 0) { errorMsg.value = 'Seleccioná un cliente'; return }
  if (!form.descripcion.trim()) { errorMsg.value = 'La descripción es obligatoria'; return }
  selectedOperarioId.value = undefined
  operarioModalError.value = ''
  showOperarioModal.value = true
}

// Paso 2: elegido el operario, crear la OT (queda en Recepcionado + historial).
async function confirmarCrear() {
  if (!selectedOperarioId.value) { operarioModalError.value = 'Elegí el operario'; return }
  saving.value = true
  try {
    const created = await $fetch<{ nroOt: number }>('/api/workorders', {
      method: 'POST',
      body: {
        cliente_id: form.cliente_id ?? null,
        descripcion: form.descripcion.trim(),
        que_se_controla: form.que_se_controla.trim() || null,
        maquina_ids: form.maquina_ids,
        fecha_ingreso: form.fecha_ingreso,
        fecha_prometida: form.fecha_prometida || null,
        tiempo_estimado_hs: form.tiempo_estimado_hs !== '' ? Number(form.tiempo_estimado_hs) : null,
        observaciones: form.observaciones.trim() || null,
        operario_id: selectedOperarioId.value
      }
    })

    if (selectedArchivoIds.value.length > 0) {
      await $fetch(`/api/workorders/${created.nroOt}/archivos`, {
        method: 'POST',
        body: { biblioteca_ids: selectedArchivoIds.value }
      })
    }

    showOperarioModal.value = false
    await router.push(`/ordenes/${created.nroOt}`)
  } catch (e: any) {
    operarioModalError.value = e.data?.message || 'Error al guardar'
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
      @submit.prevent="pedirOperario"
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

      <UFormField label="¿Qué se controla?">
        <UTextarea
          v-model="form.que_se_controla"
          placeholder="Criterios de control de calidad planificados (ej: medidas, tolerancias, acabado…)"
          class="w-full"
          :rows="3"
        />
        <template #help>
          <span class="text-xs text-gray-500">Opcional. Definí ahora qué se va a controlar al finalizar la OT.</span>
        </template>
      </UFormField>

      <UFormField label="Máquinas">
        <USelectMenu
          v-model="form.maquina_ids"
          :items="maquinaOptions"
          value-key="value"
          label-key="label"
          multiple
          placeholder="Sin máquinas"
          class="w-full"
        />
        <template #help>
          <span class="text-xs text-gray-500">Podés elegir una o más. Dejalo vacío si no aplica.</span>
        </template>
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="Fecha de ingreso"
          required
        >
          <DateField v-model="form.fecha_ingreso" />
        </UFormField>

        <UFormField label="Fecha prometida">
          <DateField v-model="form.fecha_prometida" />
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

    <UModal
      v-model:open="showOperarioModal"
      :dismissible="false"
    >
      <template #content>
        <div class="p-5 space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            ¿Qué operario recepcionó la OT?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            La OT se crea en estado "Recepcionado". Queda registrado en el historial.
          </p>
          <UFormField
            label="Operario"
            required
          >
            <div class="flex items-center gap-2">
              <USelectMenu
                v-model="selectedOperarioId"
                :items="operarioOptions"
                value-key="value"
                label-key="label"
                placeholder="Elegí el operario"
                class="flex-1"
              />
              <OperariosQuickAdd @created="onOperarioCreated" />
            </div>
          </UFormField>
          <UAlert
            v-if="operarioModalError"
            color="error"
            :description="operarioModalError"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="showOperarioModal = false"
            />
            <UButton
              label="Crear OT"
              icon="i-lucide-save"
              :loading="saving"
              @click="confirmarCrear"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
