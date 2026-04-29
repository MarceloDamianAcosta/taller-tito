<script setup lang="ts">
interface ControlCalidad {
  id: number
  otId: number
  queSeControla: string
  instrumento: string | null
  resultado: 'OK' | 'NO OK'
  accion: string | null
  cumpleFuncion: boolean
  obsCalidad: string | null
  huboReproceso: boolean
  fechaControl: string
}

const props = defineProps<{ otId: number }>()

const { data: calidad, refresh } = await useFetch<ControlCalidad | null>(
  () => `/api/workorders/${props.otId}/calidad`
)

const isEditing = ref(!calidad.value)
const saving = ref(false)
const saveError = ref('')

const form = reactive({
  que_se_controla: '',
  instrumento: '',
  resultado: '' as 'OK' | 'NO OK' | '',
  accion: '',
  cumple_funcion: false,
  hubo_reproceso: false,
  obs_calidad: '',
  fecha_control: new Date().toISOString().slice(0, 10)
})

function populateForm(data: ControlCalidad) {
  form.que_se_controla = data.queSeControla
  form.instrumento = data.instrumento ?? ''
  form.resultado = data.resultado
  form.accion = data.accion ?? ''
  form.cumple_funcion = data.cumpleFuncion
  form.hubo_reproceso = data.huboReproceso
  form.obs_calidad = data.obsCalidad ?? ''
  form.fecha_control = data.fechaControl
}

if (calidad.value) {
  populateForm(calidad.value)
}

function startEdit() {
  if (calidad.value) populateForm(calidad.value)
  saveError.value = ''
  isEditing.value = true
}

function cancelEdit() {
  saveError.value = ''
  isEditing.value = false
}

async function save() {
  saveError.value = ''
  if (!form.que_se_controla.trim()) { saveError.value = '¿Qué se controló? es obligatorio'; return }
  if (!form.resultado) { saveError.value = 'El resultado es obligatorio'; return }
  if (!form.fecha_control) { saveError.value = 'La fecha es obligatoria'; return }

  saving.value = true
  try {
    await $fetch(`/api/workorders/${props.otId}/calidad`, {
      method: 'POST',
      body: {
        que_se_controla: form.que_se_controla.trim(),
        instrumento: form.instrumento.trim() || null,
        resultado: form.resultado,
        accion: form.accion.trim() || null,
        cumple_funcion: form.cumple_funcion,
        hubo_reproceso: form.hubo_reproceso,
        obs_calidad: form.obs_calidad.trim() || null,
        fecha_control: form.fecha_control
      }
    })
    await refresh()
    if (calidad.value) populateForm(calidad.value)
    isEditing.value = false
  } catch (e: any) {
    saveError.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const borderClass = computed(() => {
  if (!calidad.value) return 'border-gray-200 dark:border-gray-800'
  return calidad.value.resultado === 'OK'
    ? 'border-green-400 dark:border-green-600'
    : 'border-red-400 dark:border-red-600'
})
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-4"
    :class="borderClass"
  >
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Control de Calidad</h2>
        <UBadge
          v-if="calidad"
          :color="calidad.resultado === 'OK' ? 'success' : 'error'"
          variant="subtle"
        >
          {{ calidad.resultado }}
        </UBadge>
      </div>
      <div v-if="!isEditing && calidad" class="flex gap-2">
        <UButton
          label="Editar"
          icon="i-lucide-pencil"
          size="sm"
          color="neutral"
          variant="subtle"
          @click="startEdit"
        />
      </div>
      <div v-else-if="isEditing && calidad" class="flex gap-2">
        <UButton label="Cancelar" size="sm" color="neutral" variant="subtle" @click="cancelEdit" />
        <UButton label="Guardar" size="sm" icon="i-lucide-save" :loading="saving" @click="save" />
      </div>
    </div>

    <div v-if="!isEditing && calidad" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div class="sm:col-span-2">
        <span class="text-gray-500 dark:text-gray-400">¿Qué se controló?</span>
        <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ calidad.queSeControla }}</p>
      </div>
      <div v-if="calidad.instrumento">
        <span class="text-gray-500 dark:text-gray-400">Instrumento</span>
        <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ calidad.instrumento }}</p>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">Fecha de control</span>
        <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ formatDate(calidad.fechaControl) }}</p>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">¿Cumple función?</span>
        <p class="font-medium mt-0.5" :class="calidad.cumpleFuncion ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
          {{ calidad.cumpleFuncion ? 'Sí' : 'No' }}
        </p>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">¿Hubo reproceso?</span>
        <p class="font-medium mt-0.5" :class="calidad.huboReproceso ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'">
          {{ calidad.huboReproceso ? 'Sí' : 'No' }}
        </p>
      </div>
      <div v-if="calidad.accion" class="sm:col-span-2">
        <span class="text-gray-500 dark:text-gray-400">Acción correctiva</span>
        <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ calidad.accion }}</p>
      </div>
      <div v-if="calidad.obsCalidad" class="sm:col-span-2">
        <span class="text-gray-500 dark:text-gray-400">Observaciones</span>
        <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ calidad.obsCalidad }}</p>
      </div>
    </div>

    <p v-else-if="!isEditing && !calidad" class="text-sm text-gray-500 dark:text-gray-400">
      Sin control de calidad registrado.
    </p>

    <div v-if="isEditing" class="space-y-3">
      <UFormField label="¿Qué se controló?" required>
        <UTextarea v-model="form.que_se_controla" class="w-full" :rows="2" placeholder="Descripción del control realizado" />
      </UFormField>

      <UFormField label="Instrumento">
        <UInput v-model="form.instrumento" class="w-full" placeholder="Ej: Calibre, pie de rey..." />
      </UFormField>

      <div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Resultado <span class="text-red-500">*</span></span>
        <div class="flex gap-2">
          <UButton
            label="OK"
            size="sm"
            :color="form.resultado === 'OK' ? 'success' : 'neutral'"
            :variant="form.resultado === 'OK' ? 'solid' : 'subtle'"
            @click="form.resultado = 'OK'"
          />
          <UButton
            label="NO OK"
            size="sm"
            :color="form.resultado === 'NO OK' ? 'error' : 'neutral'"
            :variant="form.resultado === 'NO OK' ? 'solid' : 'subtle'"
            @click="form.resultado = 'NO OK'"
          />
        </div>
      </div>

      <div
        v-if="form.resultado === 'NO OK'"
        class="border border-red-300 dark:border-red-700 rounded-lg p-3 bg-red-50 dark:bg-red-950/20"
      >
        <UFormField label="Acción correctiva">
          <UTextarea v-model="form.accion" class="w-full" :rows="2" placeholder="Describir la acción tomada" />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex items-center gap-3">
          <UCheckbox v-model="form.cumple_funcion" />
          <span class="text-sm text-gray-700 dark:text-gray-300">¿Cumple función?</span>
        </div>
        <div class="flex items-center gap-3">
          <UCheckbox v-model="form.hubo_reproceso" />
          <span class="text-sm text-gray-700 dark:text-gray-300">¿Hubo reproceso?</span>
        </div>
      </div>

      <UFormField label="Observaciones">
        <UTextarea v-model="form.obs_calidad" class="w-full" :rows="2" placeholder="Observaciones adicionales" />
      </UFormField>

      <UFormField label="Fecha de control" required>
        <UInput v-model="form.fecha_control" type="date" class="w-full" />
      </UFormField>

      <UAlert v-if="saveError" color="error" :description="saveError" />

      <div class="flex gap-2 justify-end">
        <UButton v-if="calidad" label="Cancelar" size="sm" color="neutral" variant="subtle" @click="cancelEdit" />
        <UButton label="Guardar" size="sm" icon="i-lucide-save" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>
