<script setup lang="ts">
definePageMeta({})

interface OTArchivo {
  id: number
  otId: number
  bibliotecaId: number
  nombre: string | null
  archivo: string | null
  tipo: string | null
  createdAt: string | null
}

interface OTMaterial {
  id: number
  otId: number | null
  materialId: number
  materialNombre: string | null
  unidad: string | null
  fecha: string
  proveedor: string
  cantidad: number
  problemas: string | null
}

interface OT {
  nroOt: number
  clienteId: number
  clienteNombre: string | null
  clienteTelefono: string | null
  descripcion: string
  queSeControla: string | null
  maquinas: { id: number, nombre: string }[]
  fechaIngreso: string
  fechaPrometida: string
  fechaInicio: string | null
  fechaFinalizacion: string | null
  fechaEntrega: string | null
  tiempoEstimadoHs: number | null
  tiempoRealHs: number | null
  motivoRetraso: string | null
  estado: string
  motivoAnulacion: string | null
  observaciones: string | null
  clienteConforme: boolean | null
  createdAt: string
  materiales: OTMaterial[]
  archivos: OTArchivo[]
}

interface Cliente { id: number, nombre: string }
interface Maquina { id: number, nombre: string }
interface CatMaterial { id: number, nombre: string, unidad: string }
interface Operario { id: number, nombre: string }

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: ot, refresh } = await useFetch<OT>(() => `/api/workorders/${id.value}`)

const { data: clientesData } = await useFetch<Cliente[]>('/api/clientes', { query: { activo: 'true' } })
const { data: maquinasData } = await useFetch<Maquina[]>('/api/machines')
const { data: catMateriales } = await useFetch<CatMaterial[]>('/api/materiales', { query: { activo: 'true' } })
const { data: operariosData } = await useFetch<Operario[]>('/api/operarios', { query: { activo: 'true' } })

const isEditing = ref(false)
const savingEdit = ref(false)
const editError = ref('')

const editForm = reactive({
  cliente_id: undefined as number | undefined,
  descripcion: '',
  que_se_controla: '',
  maquina_ids: [] as number[],
  fecha_ingreso: '',
  fecha_prometida: '',
  fecha_inicio: '',
  fecha_finalizacion: '',
  fecha_entrega: '',
  tiempo_estimado_hs: '',
  tiempo_real_hs: '',
  motivo_retraso: '',
  observaciones: '',
  cliente_conforme: null as boolean | null
})

function startEdit() {
  if (!ot.value) return
  const o = ot.value
  editForm.cliente_id = o.clienteId
  editForm.descripcion = o.descripcion
  editForm.que_se_controla = o.queSeControla ?? ''
  editForm.maquina_ids = o.maquinas.map(m => m.id)
  editForm.fecha_ingreso = o.fechaIngreso
  editForm.fecha_prometida = o.fechaPrometida ?? ''
  editForm.fecha_inicio = o.fechaInicio ?? ''
  editForm.fecha_finalizacion = o.fechaFinalizacion ?? ''
  editForm.fecha_entrega = o.fechaEntrega ?? ''
  editForm.tiempo_estimado_hs = o.tiempoEstimadoHs !== null ? String(o.tiempoEstimadoHs) : ''
  editForm.tiempo_real_hs = o.tiempoRealHs !== null ? String(o.tiempoRealHs) : ''
  editForm.motivo_retraso = o.motivoRetraso ?? ''
  editForm.observaciones = o.observaciones ?? ''
  editForm.cliente_conforme = o.clienteConforme ?? null
  isEditing.value = true
  editError.value = ''
}

function cancelEdit() {
  isEditing.value = false
  editError.value = ''
}

async function saveEdit() {
  editError.value = ''
  savingEdit.value = true
  try {
    await $fetch(`/api/workorders/${id.value}`, {
      method: 'PATCH',
      body: {
        cliente_id: editForm.cliente_id ?? null,
        descripcion: editForm.descripcion,
        que_se_controla: editForm.que_se_controla.trim() || null,
        maquina_ids: editForm.maquina_ids,
        fecha_ingreso: editForm.fecha_ingreso,
        fecha_prometida: editForm.fecha_prometida || null,
        fecha_inicio: editForm.fecha_inicio || null,
        fecha_finalizacion: editForm.fecha_finalizacion || null,
        fecha_entrega: editForm.fecha_entrega || null,
        tiempo_estimado_hs: editForm.tiempo_estimado_hs !== '' ? Number(editForm.tiempo_estimado_hs) : null,
        tiempo_real_hs: editForm.tiempo_real_hs !== '' ? Number(editForm.tiempo_real_hs) : null,
        motivo_retraso: editForm.motivo_retraso || null,
        observaciones: editForm.observaciones || null,
        cliente_conforme: editForm.cliente_conforme
      }
    })
    isEditing.value = false
    await refresh()
  } catch (e: any) {
    editError.value = e.data?.message || 'Error al guardar'
  } finally {
    savingEdit.value = false
  }
}

const savingEstado = ref(false)
const estadoError = ref('')
const showForceModal = ref(false)
const pendingEstado = ref('')
const clienteConformeEntrega = ref<boolean | null>(null)

// Selección de operario al cambiar estado (TITO-115)
const showOperarioModal = ref(false)
const operarioModalEstado = ref('')
const selectedOperarioId = ref<number | undefined>(undefined)
const operarioModalError = ref('')

const operarioOptions = computed(() =>
  (operariosData.value ?? []).map(o => ({ label: o.nombre, value: o.id }))
)

function onOperarioCreated(payload: { id: number, nombre: string }) {
  operariosData.value = [...(operariosData.value ?? []), payload]
  selectedOperarioId.value = payload.id
}

// Abre el modal "¿qué operario hizo este trabajo?" antes de confirmar el cambio.
function pedirOperario(next: string) {
  operarioModalEstado.value = next
  selectedOperarioId.value = undefined
  operarioModalError.value = ''
  showOperarioModal.value = true
}

async function confirmarCambioEstado() {
  if (!selectedOperarioId.value) {
    operarioModalError.value = 'Elegí el operario'
    return
  }
  await cambiarEstado(operarioModalEstado.value)
}

const estadosNormales = ['Recepcionado', 'En proceso', 'Finalizado', 'Entregado'] as const
type EstadoNormal = typeof estadosNormales[number]
const estadoOptions = estadosNormales.map(e => ({ label: e, value: e }))

const targetEstado = ref<EstadoNormal>('Recepcionado')
watch(() => ot.value?.estado, (e) => {
  if (e && e !== 'Anulada' && (estadosNormales as readonly string[]).includes(e)) {
    targetEstado.value = e as EstadoNormal
  } else if (e === 'Anulada') {
    targetEstado.value = 'Recepcionado'
  }
}, { immediate: true })

async function cambiarEstado(next: string, force = false) {
  estadoError.value = ''
  operarioModalError.value = ''
  savingEstado.value = true
  try {
    const body: Record<string, unknown> = { estado: next, operario_id: selectedOperarioId.value ?? null }
    if (force) body.force = true
    if (next === 'Entregado' && clienteConformeEntrega.value !== null) {
      body.cliente_conforme = clienteConformeEntrega.value
    }
    await $fetch(`/api/workorders/${id.value}`, { method: 'PATCH', body })
    showForceModal.value = false
    showOperarioModal.value = false
    await refresh()
  } catch (e: any) {
    if (e.status === 409 && e.data?.warning === 'sin_control_calidad') {
      // Operario ya elegido; pasamos a confirmar la entrega sin CC.
      pendingEstado.value = next
      showOperarioModal.value = false
      showForceModal.value = true
    } else if (showOperarioModal.value) {
      operarioModalError.value = e.data?.message || 'Error al cambiar estado'
    } else {
      estadoError.value = e.data?.message || 'Error al cambiar estado'
    }
  } finally {
    savingEstado.value = false
  }
}

async function confirmarEntregaForzada() {
  await cambiarEstado(pendingEstado.value, true)
}

const showAnularModal = ref(false)
const motivoAnulacion = ref('')
const operarioAnularId = ref<number | undefined>(undefined)
const anularError = ref('')
const anulando = ref(false)

function openAnular() {
  motivoAnulacion.value = ''
  operarioAnularId.value = undefined
  anularError.value = ''
  showAnularModal.value = true
}

async function confirmarAnulacion() {
  if (!motivoAnulacion.value.trim()) { anularError.value = 'Indicá el motivo'; return }
  if (!operarioAnularId.value) { anularError.value = 'Elegí el operario'; return }
  anulando.value = true
  anularError.value = ''
  try {
    await $fetch(`/api/workorders/${id.value}`, {
      method: 'PATCH',
      body: { estado: 'Anulada', motivo_anulacion: motivoAnulacion.value.trim(), operario_id: operarioAnularId.value }
    })
    showAnularModal.value = false
    await refresh()
  } catch (e: any) {
    anularError.value = e.data?.message || 'Error al anular'
  } finally {
    anulando.value = false
  }
}

const addingMaterial = ref(false)
const savingMaterial = ref(false)
const materialError = ref('')

const matForm = reactive({
  material_id: undefined as number | undefined,
  cantidad: '',
  proveedor: 'Yo mismo',
  proveedorOtro: '',
  fecha: new Date().toISOString().slice(0, 10),
  problemas: ''
})

const proveedorOptions = [
  { label: 'Yo mismo', value: 'Yo mismo' },
  { label: 'Cliente', value: 'Cliente' },
  { label: 'Otro', value: 'Otro' }
]

const catMatOptions = computed(() =>
  (catMateriales.value ?? []).map(m => ({ label: `${m.nombre} (${m.unidad})`, value: m.id }))
)

function onMaterialCreated(payload: { id: number, nombre: string, unidad: string }) {
  catMateriales.value = [...(catMateriales.value ?? []), { id: payload.id, nombre: payload.nombre, unidad: payload.unidad }]
  matForm.material_id = payload.id
}

async function addMaterial() {
  materialError.value = ''
  if (matForm.material_id === undefined) { materialError.value = 'Seleccioná un material'; return }
  if (matForm.cantidad === '' || matForm.cantidad === null) { materialError.value = 'La cantidad es obligatoria'; return }
  savingMaterial.value = true
  try {
    const proveedor = matForm.proveedor === 'Otro' ? matForm.proveedorOtro.trim() || 'Otro' : matForm.proveedor
    await $fetch(`/api/workorders/${id.value}/materiales`, {
      method: 'POST',
      body: {
        material_id: matForm.material_id ?? null,
        cantidad: Number(matForm.cantidad),
        proveedor,
        fecha: matForm.fecha,
        problemas: matForm.problemas.trim() || null
      }
    })
    addingMaterial.value = false
    matForm.material_id = undefined
    matForm.cantidad = ''
    matForm.proveedor = 'Yo mismo'
    matForm.proveedorOtro = ''
    matForm.problemas = ''
    await refresh()
  } catch (e: any) {
    materialError.value = e.data?.message || 'Error al agregar material'
  } finally {
    savingMaterial.value = false
  }
}

const selectedArchivoIds = ref<number[]>([])

async function onArchivosSelected(ids: number[]) {
  if (!ids.length) return
  try {
    await $fetch(`/api/workorders/${id.value}/archivos`, {
      method: 'POST',
      body: { biblioteca_ids: ids }
    })
    selectedArchivoIds.value = []
    await refresh()
  } catch {}
}

async function removeArchivo(archivoId: number) {
  try {
    await $fetch(`/api/workorders/${id.value}/archivos/${archivoId}`, { method: 'DELETE' })
    await refresh()
  } catch {}
}

const clienteOptions = computed(() =>
  (clientesData.value ?? []).map(c => ({ label: c.nombre, value: c.id }))
)

const maquinaOptions = computed(() =>
  (maquinasData.value ?? []).map(m => ({ label: m.nombre, value: m.id }))
)

function onClienteCreatedEdit(payload: { id: number, nombre: string }) {
  clientesData.value = [...(clientesData.value ?? []), payload]
  editForm.cliente_id = payload.id
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Sin fecha'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
</script>

<template>
  <div
    v-if="ot"
    class="space-y-6 max-w-4xl"
  >
    <div class="flex items-center gap-3 flex-wrap">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        to="/ordenes"
      />
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white flex-1">
        OT #{{ ot.nroOt }} — <span class="font-normal">{{ ot.descripcion }}</span>
      </h1>
      <OrdenesStatusBadge :estado="ot.estado" />
    </div>

    <UAlert
      v-if="ot.estado === 'Anulada'"
      color="neutral"
      icon="i-lucide-ban"
      title="OT anulada"
      :description="ot.motivoAnulacion || 'Sin motivo registrado'"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              Información
            </h2>
            <div
              v-if="!isEditing && ot.estado !== 'Anulada'"
              class="flex gap-2"
            >
              <UButton
                label="Editar"
                icon="i-lucide-pencil"
                size="sm"
                color="neutral"
                variant="subtle"
                @click="startEdit"
              />
            </div>
            <div
              v-else
              class="flex gap-2"
            >
              <UButton
                label="Cancelar"
                size="sm"
                color="neutral"
                variant="subtle"
                @click="cancelEdit"
              />
              <UButton
                label="Guardar"
                size="sm"
                icon="i-lucide-save"
                :loading="savingEdit"
                @click="saveEdit"
              />
            </div>
          </div>

          <div
            v-if="!isEditing"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"
          >
            <div>
              <span class="text-gray-500 dark:text-gray-400">Cliente</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.clienteNombre || '—' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Máquinas</span>
              <p
                v-if="!ot.maquinas.length"
                class="font-medium text-gray-900 dark:text-white"
              >
                —
              </p>
              <div
                v-else
                class="flex flex-wrap gap-1.5 mt-0.5"
              >
                <UBadge
                  v-for="m in ot.maquinas"
                  :key="m.id"
                  color="neutral"
                  variant="subtle"
                >
                  {{ m.nombre }}
                </UBadge>
              </div>
            </div>
            <div class="sm:col-span-2">
              <span class="text-gray-500 dark:text-gray-400">Descripción</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.descripcion }}
              </p>
            </div>
            <div
              v-if="ot.queSeControla"
              class="sm:col-span-2"
            >
              <span class="text-gray-500 dark:text-gray-400">¿Qué se controla?</span>
              <p class="font-medium text-gray-900 dark:text-white whitespace-pre-line">
                {{ ot.queSeControla }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha ingreso</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ formatDate(ot.fechaIngreso) }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha prometida</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ formatDate(ot.fechaPrometida) }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha inicio</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ formatDate(ot.fechaInicio) }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha finalización</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ formatDate(ot.fechaFinalizacion) }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha entrega</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ formatDate(ot.fechaEntrega) }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Tiempo estimado (hs)</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.tiempoEstimadoHs ?? '—' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Tiempo real (hs)</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.tiempoRealHs ?? '—' }}
              </p>
            </div>
            <div
              v-if="ot.motivoRetraso"
              class="sm:col-span-2"
            >
              <span class="text-gray-500 dark:text-gray-400">Motivo de retraso</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.motivoRetraso }}
              </p>
            </div>
            <div
              v-if="ot.observaciones"
              class="sm:col-span-2"
            >
              <span class="text-gray-500 dark:text-gray-400">Observaciones</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.observaciones }}
              </p>
            </div>
            <div
              v-if="ot.estado === 'Entregado'"
              class="sm:col-span-2"
            >
              <span class="text-gray-500 dark:text-gray-400">Cliente conforme</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.clienteConforme === true ? '👍 Sí' : ot.clienteConforme === false ? '👎 No' : '—' }}
              </p>
            </div>
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <UFormField
              label="Cliente"
              required
            >
              <div class="flex items-center gap-2">
                <USelect
                  v-model="editForm.cliente_id"
                  :items="clienteOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Seleccionar cliente"
                  class="flex-1"
                />
                <ClientesQuickAdd @created="onClienteCreatedEdit" />
              </div>
            </UFormField>

            <UFormField
              label="Descripción"
              required
            >
              <UTextarea
                v-model="editForm.descripcion"
                class="w-full"
                :rows="2"
              />
            </UFormField>

            <UFormField label="¿Qué se controla?">
              <UTextarea
                v-model="editForm.que_se_controla"
                placeholder="Criterios de control de calidad planificados"
                class="w-full"
                :rows="3"
              />
              <template #help>
                <span class="text-xs text-gray-500">Opcional. Planificación de qué controlar al finalizar.</span>
              </template>
            </UFormField>

            <UFormField label="Máquinas">
              <USelectMenu
                v-model="editForm.maquina_ids"
                :items="maquinaOptions"
                value-key="value"
                label-key="label"
                multiple
                placeholder="Sin máquinas"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Fecha ingreso">
                <DateField v-model="editForm.fecha_ingreso" />
              </UFormField>
              <UFormField label="Fecha prometida">
                <DateField v-model="editForm.fecha_prometida" />
              </UFormField>
              <UFormField label="Fecha inicio">
                <DateField v-model="editForm.fecha_inicio" />
              </UFormField>
              <UFormField label="Fecha finalización">
                <DateField v-model="editForm.fecha_finalizacion" />
              </UFormField>
              <UFormField label="Fecha entrega">
                <DateField v-model="editForm.fecha_entrega" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Tiempo estimado (hs)">
                <UInput
                  v-model="editForm.tiempo_estimado_hs"
                  type="number"
                  step="0.5"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Tiempo real (hs)">
                <UInput
                  v-model="editForm.tiempo_real_hs"
                  type="number"
                  step="0.5"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Motivo de retraso">
              <UInput
                v-model="editForm.motivo_retraso"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Observaciones">
              <UTextarea
                v-model="editForm.observaciones"
                class="w-full"
                :rows="2"
              />
            </UFormField>

            <div v-if="ot.estado === 'Entregado'">
              <span class="text-sm text-gray-700 dark:text-gray-300 block mb-1">Cliente conforme</span>
              <div class="flex gap-2">
                <UButton
                  label="👍 Sí"
                  size="sm"
                  :color="editForm.cliente_conforme === true ? 'success' : 'neutral'"
                  :variant="editForm.cliente_conforme === true ? 'solid' : 'subtle'"
                  @click="editForm.cliente_conforme = true"
                />
                <UButton
                  label="👎 No"
                  size="sm"
                  :color="editForm.cliente_conforme === false ? 'error' : 'neutral'"
                  :variant="editForm.cliente_conforme === false ? 'solid' : 'subtle'"
                  @click="editForm.cliente_conforme = false"
                />
              </div>
            </div>

            <UAlert
              v-if="editError"
              color="error"
              :description="editError"
            />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              Materiales utilizados
            </h2>
            <UButton
              v-if="!addingMaterial"
              label="Agregar material"
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="subtle"
              @click="addingMaterial = true"
            />
          </div>

          <div
            v-if="ot.materiales.length > 0"
            class="space-y-2"
          >
            <div
              v-for="mat in ot.materiales"
              :key="mat.id"
              class="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div>
                <span class="font-medium text-gray-900 dark:text-white">{{ mat.materialNombre || '—' }}</span>
                <span class="text-gray-500 dark:text-gray-400 ml-1">({{ mat.unidad }})</span>
              </div>
              <div class="text-right text-gray-600 dark:text-gray-300">
                <span>{{ mat.cantidad }} · {{ mat.proveedor }} · {{ formatDate(mat.fecha) }}</span>
                <p
                  v-if="mat.problemas"
                  class="text-xs text-red-500"
                >
                  {{ mat.problemas }}
                </p>
              </div>
            </div>
          </div>
          <p
            v-else-if="!addingMaterial"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            Sin materiales registrados.
          </p>

          <div
            v-if="addingMaterial"
            class="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 space-y-3"
          >
            <UFormField
              label="Material"
              required
            >
              <div class="flex items-center gap-2">
                <USelect
                  v-model="matForm.material_id"
                  :items="catMatOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Seleccionar material"
                  class="flex-1"
                />
                <MaterialesQuickAdd @created="onMaterialCreated" />
              </div>
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField
                label="Cantidad"
                required
              >
                <UInput
                  v-model="matForm.cantidad"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Fecha">
                <DateField v-model="matForm.fecha" />
              </UFormField>
            </div>

            <UFormField label="Proveedor">
              <USelect
                v-model="matForm.proveedor"
                :items="proveedorOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
            <UFormField
              v-if="matForm.proveedor === 'Otro'"
              label="Nombre del proveedor"
            >
              <UInput
                v-model="matForm.proveedorOtro"
                placeholder="Nombre del proveedor"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Problemas">
              <UInput
                v-model="matForm.problemas"
                placeholder="Opcional"
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="materialError"
              color="error"
              :description="materialError"
            />

            <div class="flex gap-2 justify-end">
              <UButton
                label="Cancelar"
                size="sm"
                color="neutral"
                variant="subtle"
                @click="addingMaterial = false"
              />
              <UButton
                label="Agregar"
                size="sm"
                :loading="savingMaterial"
                @click="addMaterial"
              />
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              Archivos adjuntos
            </h2>
          </div>

          <div
            v-if="ot.archivos.length > 0"
            class="space-y-2"
          >
            <div
              v-for="arch in ot.archivos"
              :key="arch.id"
              class="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div class="flex items-center gap-2">
                <UBadge
                  :color="arch.tipo === 'pdf' ? 'error' : 'info'"
                  variant="subtle"
                  class="shrink-0"
                >
                  {{ arch.tipo || '—' }}
                </UBadge>
                <a
                  v-if="arch.archivo"
                  :href="`/api/archivos/${arch.archivo}`"
                  target="_blank"
                  class="text-primary hover:underline truncate max-w-xs"
                >
                  {{ arch.nombre || arch.archivo }}
                </a>
                <span v-else>{{ arch.nombre || '—' }}</span>
              </div>
              <UButton
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                aria-label="Quitar archivo"
                @click="removeArchivo(arch.id)"
              />
            </div>
          </div>
          <p
            v-else
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            Sin archivos adjuntos.
          </p>

          <div class="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <BibliotecaFilePicker v-model="selectedArchivoIds" />
            <UButton
              v-if="selectedArchivoIds.length > 0"
              size="sm"
              class="w-full"
              @click="onArchivosSelected(selectedArchivoIds)"
            >
              Vincular {{ selectedArchivoIds.length }} archivo(s) seleccionado(s)
            </UButton>
          </div>
        </div>

        <OrdenesControlCalidad :ot-id="ot.nroOt" />
        <OrdenesNoConformidades :ot-id="ot.nroOt" />
      </div>

      <div class="space-y-4">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Estado
          </h2>
          <OrdenesStatusBadge :estado="ot.estado" />

          <div class="space-y-3">
            <USelect
              v-model="targetEstado"
              :items="estadoOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />

            <div v-if="targetEstado === 'Entregado' && ot.estado !== 'Entregado'">
              <span class="text-sm text-gray-700 dark:text-gray-300 block mb-1">¿Cliente conforme?</span>
              <div class="flex gap-2">
                <UButton
                  label="👍 Sí"
                  size="sm"
                  :color="clienteConformeEntrega === true ? 'success' : 'neutral'"
                  :variant="clienteConformeEntrega === true ? 'solid' : 'subtle'"
                  @click="clienteConformeEntrega = true"
                />
                <UButton
                  label="👎 No"
                  size="sm"
                  :color="clienteConformeEntrega === false ? 'error' : 'neutral'"
                  :variant="clienteConformeEntrega === false ? 'solid' : 'subtle'"
                  @click="clienteConformeEntrega = false"
                />
              </div>
            </div>

            <UButton
              v-if="targetEstado !== ot.estado"
              :label="`Cambiar a ${targetEstado}`"
              color="primary"
              class="w-full"
              :loading="savingEstado"
              @click="pedirOperario(targetEstado)"
            />
          </div>

          <UAlert
            v-if="estadoError"
            color="error"
            :description="estadoError"
          />
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-sm space-y-2">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Resumen
          </h2>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Creada</span>
            <span>{{ formatDate(ot.createdAt?.slice(0, 10)) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Prometida</span>
            <span>{{ formatDate(ot.fechaPrometida) }}</span>
          </div>
          <div
            v-if="ot.tiempoEstimadoHs"
            class="flex justify-between"
          >
            <span class="text-gray-500 dark:text-gray-400">Tiempo est.</span>
            <span>{{ ot.tiempoEstimadoHs }} hs</span>
          </div>
          <div
            v-if="ot.tiempoRealHs"
            class="flex justify-between"
          >
            <span class="text-gray-500 dark:text-gray-400">Tiempo real</span>
            <span>{{ ot.tiempoRealHs }} hs</span>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Acciones
          </h2>
          <UButton
            v-if="ot.estado !== 'Anulada'"
            label="Anular OT"
            icon="i-lucide-ban"
            color="warning"
            variant="subtle"
            class="w-full justify-center"
            @click="openAnular"
          />
        </div>

        <OrdenesHistorialTimeline
          :ot-id="ot.nroOt"
          :estado="ot.estado"
        />
      </div>
    </div>

    <UModal v-model:open="showAnularModal">
      <template #content>
        <div class="p-5 space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            Anular OT #{{ ot.nroOt }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            La OT queda registrada con estado "Anulada" y no entra en los KPIs.
          </p>
          <UFormField
            label="Motivo"
            required
          >
            <UTextarea
              v-model="motivoAnulacion"
              :rows="3"
              class="w-full"
              placeholder="Ej: cliente canceló, error de carga, presupuesto rechazado…"
            />
          </UFormField>
          <UFormField
            label="Operario"
            required
          >
            <div class="flex items-center gap-2">
              <USelectMenu
                v-model="operarioAnularId"
                :items="operarioOptions"
                value-key="value"
                label-key="label"
                placeholder="¿Quién anula?"
                class="flex-1"
              />
              <OperariosQuickAdd @created="p => operarioAnularId = p.id" />
            </div>
          </UFormField>
          <UAlert
            v-if="anularError"
            color="error"
            :description="anularError"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="showAnularModal = false"
            />
            <UButton
              label="Anular"
              color="warning"
              :loading="anulando"
              @click="confirmarAnulacion"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showOperarioModal">
      <template #content>
        <div class="p-5 space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            ¿Qué operario hizo este trabajo?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Cambio de estado a "{{ operarioModalEstado }}". Queda registrado en el historial.
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
              :label="`Cambiar a ${operarioModalEstado}`"
              color="primary"
              :loading="savingEstado"
              @click="confirmarCambioEstado"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showForceModal">
      <template #content>
        <div class="p-5 space-y-4">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-6 text-yellow-500 shrink-0 mt-0.5"
            />
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Sin Control de Calidad
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ¿Seguro que querés marcar como Entregado? Todavía no completaste el Control de Calidad.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="showForceModal = false"
            />
            <UButton
              label="Marcar igual"
              color="warning"
              :loading="savingEstado"
              @click="confirmarEntregaForzada"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>

  <div
    v-else
    class="flex items-center justify-center py-20"
  >
    <p class="text-gray-500 dark:text-gray-400">
      Orden de trabajo no encontrada.
    </p>
  </div>
</template>
