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
  material: string | null
  cantidad: number | null
  maquinaId: number | null
  maquinaNombre: string | null
  fechaIngreso: string
  fechaPrometida: string
  fechaInicio: string | null
  fechaFinalizacion: string | null
  fechaEntrega: string | null
  tiempoEstimadoHs: number | null
  tiempoRealHs: number | null
  motivoRetraso: string | null
  estado: string
  observaciones: string | null
  clienteConforme: boolean | null
  createdAt: string
  materiales: OTMaterial[]
  archivos: OTArchivo[]
}

interface Cliente { id: number; nombre: string }
interface Maquina { id: number; nombre: string }
interface CatMaterial { id: number; nombre: string; unidad: string }

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: ot, refresh } = await useFetch<OT>(() => `/api/workorders/${id.value}`)

const { data: clientesData } = await useFetch<Cliente[]>('/api/clientes', { query: { activo: 'true' } })
const { data: maquinasData } = await useFetch<Maquina[]>('/api/machines')
const { data: catMateriales } = await useFetch<CatMaterial[]>('/api/materiales', { query: { activo: 'true' } })

const isEditing = ref(false)
const savingEdit = ref(false)
const editError = ref('')

const editForm = reactive({
  cliente_id: undefined as number | undefined,
  descripcion: '',
  material: '',
  cantidad: '',
  maquina_id: undefined as number | undefined,
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
  editForm.material = o.material ?? ''
  editForm.cantidad = o.cantidad !== null ? String(o.cantidad) : ''
  editForm.maquina_id = o.maquinaId ?? undefined
  editForm.fecha_ingreso = o.fechaIngreso
  editForm.fecha_prometida = o.fechaPrometida
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
        material: editForm.material || null,
        cantidad: editForm.cantidad !== '' ? Number(editForm.cantidad) : null,
        maquina_id: editForm.maquina_id ?? null,
        fecha_ingreso: editForm.fecha_ingreso,
        fecha_prometida: editForm.fecha_prometida,
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

const estadoTransitions: Record<string, { label: string; next: string }> = {
  'Recepcionado': { label: 'Marcar En proceso', next: 'En proceso' },
  'En proceso': { label: 'Marcar Finalizado en stock', next: 'Finalizado en stock' },
  'Finalizado en stock': { label: 'Marcar Entregado', next: 'Entregado' }
}

async function cambiarEstado(next: string, force = false) {
  estadoError.value = ''
  savingEstado.value = true
  try {
    const body: Record<string, unknown> = { estado: next }
    if (force) body.force = true
    if (next === 'Entregado' && clienteConformeEntrega.value !== null) {
      body.cliente_conforme = clienteConformeEntrega.value
    }
    await $fetch(`/api/workorders/${id.value}`, { method: 'PATCH', body })
    showForceModal.value = false
    await refresh()
  } catch (e: any) {
    if (e.status === 409 && e.data?.warning === 'sin_control_calidad') {
      pendingEstado.value = next
      showForceModal.value = true
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

function onMaterialCreated(payload: { id: number; nombre: string; unidad: string }) {
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

const maquinaOptions = computed(() => [
  { label: 'Sin máquina', value: null },
  ...(maquinasData.value ?? []).map(m => ({ label: m.nombre, value: m.id }))
])

function onClienteCreatedEdit(payload: { id: number; nombre: string }) {
  clientesData.value = [...(clientesData.value ?? []), payload]
  editForm.cliente_id = payload.id
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const transition = computed(() => ot.value ? estadoTransiciones[ot.value.estado] : null)
const estadoTransiciones = estadoTransitions
</script>

<template>
  <div v-if="ot" class="space-y-6 max-w-4xl">
    <div class="flex items-center gap-3 flex-wrap">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/ordenes" />
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white flex-1">
        OT #{{ ot.nroOt }} — <span class="font-normal">{{ ot.descripcion }}</span>
      </h1>
      <OrdenesStatusBadge :estado="ot.estado" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Información</h2>
            <div v-if="!isEditing" class="flex gap-2">
              <UButton label="Editar" icon="i-lucide-pencil" size="sm" color="neutral" variant="subtle" @click="startEdit" />
            </div>
            <div v-else class="flex gap-2">
              <UButton label="Cancelar" size="sm" color="neutral" variant="subtle" @click="cancelEdit" />
              <UButton label="Guardar" size="sm" icon="i-lucide-save" :loading="savingEdit" @click="saveEdit" />
            </div>
          </div>

          <div v-if="!isEditing" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Cliente</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.clienteNombre || '—' }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Máquina</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.maquinaNombre || '—' }}</p>
            </div>
            <div class="sm:col-span-2">
              <span class="text-gray-500 dark:text-gray-400">Descripción</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.descripcion }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Material</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.material || '—' }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Cantidad</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.cantidad ?? '—' }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha ingreso</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(ot.fechaIngreso) }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha prometida</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(ot.fechaPrometida) }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha inicio</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(ot.fechaInicio) }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha finalización</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(ot.fechaFinalizacion) }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fecha entrega</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(ot.fechaEntrega) }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Tiempo estimado (hs)</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.tiempoEstimadoHs ?? '—' }}</p>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Tiempo real (hs)</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.tiempoRealHs ?? '—' }}</p>
            </div>
            <div v-if="ot.motivoRetraso" class="sm:col-span-2">
              <span class="text-gray-500 dark:text-gray-400">Motivo de retraso</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.motivoRetraso }}</p>
            </div>
            <div v-if="ot.observaciones" class="sm:col-span-2">
              <span class="text-gray-500 dark:text-gray-400">Observaciones</span>
              <p class="font-medium text-gray-900 dark:text-white">{{ ot.observaciones }}</p>
            </div>
            <div v-if="ot.estado === 'Entregado'" class="sm:col-span-2">
              <span class="text-gray-500 dark:text-gray-400">Cliente conforme</span>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ ot.clienteConforme === true ? '👍 Sí' : ot.clienteConforme === false ? '👎 No' : '—' }}
              </p>
            </div>
          </div>

          <div v-else class="space-y-3">
            <UFormField label="Cliente" required>
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

            <UFormField label="Descripción" required>
              <UTextarea v-model="editForm.descripcion" class="w-full" :rows="2" />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Material">
                <UInput v-model="editForm.material" class="w-full" />
              </UFormField>
              <UFormField label="Cantidad">
                <UInput v-model="editForm.cantidad" type="number" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Máquina">
              <USelect
                v-model="editForm.maquina_id"
                :items="maquinaOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Fecha ingreso">
                <UInput v-model="editForm.fecha_ingreso" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Fecha prometida">
                <UInput v-model="editForm.fecha_prometida" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Fecha inicio">
                <UInput v-model="editForm.fecha_inicio" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Fecha finalización">
                <UInput v-model="editForm.fecha_finalizacion" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Fecha entrega">
                <UInput v-model="editForm.fecha_entrega" type="date" class="w-full" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Tiempo estimado (hs)">
                <UInput v-model="editForm.tiempo_estimado_hs" type="number" step="0.5" class="w-full" />
              </UFormField>
              <UFormField label="Tiempo real (hs)">
                <UInput v-model="editForm.tiempo_real_hs" type="number" step="0.5" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Motivo de retraso">
              <UInput v-model="editForm.motivo_retraso" class="w-full" />
            </UFormField>

            <UFormField label="Observaciones">
              <UTextarea v-model="editForm.observaciones" class="w-full" :rows="2" />
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

            <UAlert v-if="editError" color="error" :description="editError" />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Materiales utilizados</h2>
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

          <div v-if="ot.materiales.length > 0" class="space-y-2">
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
                <p v-if="mat.problemas" class="text-xs text-red-500">{{ mat.problemas }}</p>
              </div>
            </div>
          </div>
          <p v-else-if="!addingMaterial" class="text-sm text-gray-500 dark:text-gray-400">Sin materiales registrados.</p>

          <div v-if="addingMaterial" class="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 space-y-3">
            <UFormField label="Material" required>
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
              <UFormField label="Cantidad" required>
                <UInput v-model="matForm.cantidad" type="number" min="0" step="0.01" class="w-full" />
              </UFormField>
              <UFormField label="Fecha">
                <UInput v-model="matForm.fecha" type="date" class="w-full" />
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
            <UFormField v-if="matForm.proveedor === 'Otro'" label="Nombre del proveedor">
              <UInput v-model="matForm.proveedorOtro" placeholder="Nombre del proveedor" class="w-full" />
            </UFormField>

            <UFormField label="Problemas">
              <UInput v-model="matForm.problemas" placeholder="Opcional" class="w-full" />
            </UFormField>

            <UAlert v-if="materialError" color="error" :description="materialError" />

            <div class="flex gap-2 justify-end">
              <UButton label="Cancelar" size="sm" color="neutral" variant="subtle" @click="addingMaterial = false" />
              <UButton label="Agregar" size="sm" :loading="savingMaterial" @click="addMaterial" />
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Archivos adjuntos</h2>
          </div>

          <div v-if="ot.archivos.length > 0" class="space-y-2">
            <div
              v-for="arch in ot.archivos"
              :key="arch.id"
              class="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div class="flex items-center gap-2">
                <UBadge :color="arch.tipo === 'pdf' ? 'error' : 'info'" variant="subtle" class="shrink-0">
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
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">Sin archivos adjuntos.</p>
        </div>

        <OrdenesControlCalidad :ot-id="ot.nroOt" />
        <OrdenesNoConformidades :ot-id="ot.nroOt" />
      </div>

      <div class="space-y-4">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Estado</h2>
          <OrdenesStatusBadge :estado="ot.estado" />

          <div v-if="transition">
            <div v-if="transition.next === 'Entregado'" class="space-y-3">
              <div>
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
                :label="transition.label"
                color="primary"
                class="w-full"
                :loading="savingEstado"
                @click="cambiarEstado(transition.next)"
              />
            </div>
            <UButton
              v-else
              :label="transition.label"
              color="primary"
              class="w-full"
              :loading="savingEstado"
              @click="cambiarEstado(transition.next)"
            />
          </div>

          <UAlert v-if="estadoError" color="error" :description="estadoError" />
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-sm space-y-2">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Resumen</h2>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Creada</span>
            <span>{{ formatDate(ot.createdAt?.slice(0, 10)) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Prometida</span>
            <span>{{ formatDate(ot.fechaPrometida) }}</span>
          </div>
          <div v-if="ot.tiempoEstimadoHs" class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Tiempo est.</span>
            <span>{{ ot.tiempoEstimadoHs }} hs</span>
          </div>
          <div v-if="ot.tiempoRealHs" class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Tiempo real</span>
            <span>{{ ot.tiempoRealHs }} hs</span>
          </div>
        </div>
      </div>
    </div>

    <UModal v-model:open="showForceModal">
      <template #content>
        <div class="p-5 space-y-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-alert-triangle" class="size-6 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Sin Control de Calidad</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ¿Seguro que querés marcar como Entregado? Todavía no completaste el Control de Calidad.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" color="neutral" variant="subtle" @click="showForceModal = false" />
            <UButton label="Marcar igual" color="warning" :loading="savingEstado" @click="confirmarEntregaForzada" />
          </div>
        </div>
      </template>
    </UModal>
  </div>

  <div v-else class="flex items-center justify-center py-20">
    <p class="text-gray-500 dark:text-gray-400">Orden de trabajo no encontrada.</p>
  </div>
</template>
