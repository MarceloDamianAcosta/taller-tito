<script setup lang="ts">
interface NC {
  id: number
  otId: number
  fecha: string
  problema: string
  causa: string | null
  solucion: string | null
  accionPreventiva: string | null
}

const props = defineProps<{ otId: number }>()

const { data: ncs, refresh } = await useFetch<NC[]>(() => `/api/workorders/${props.otId}/nc`)

const expandedId = ref<number | null>(null)
const showModal = ref(false)
const editingNc = ref<NC | null>(null)
const saving = ref(false)
const saveError = ref('')

const emptyForm = () => ({
  fecha: new Date().toISOString().slice(0, 10),
  problema: '',
  causa: '',
  solucion: '',
  accion_preventiva: ''
})

const form = reactive(emptyForm())

function openCreate() {
  editingNc.value = null
  Object.assign(form, emptyForm())
  saveError.value = ''
  showModal.value = true
}

function openEdit(nc: NC) {
  editingNc.value = nc
  form.fecha = nc.fecha
  form.problema = nc.problema
  form.causa = nc.causa ?? ''
  form.solucion = nc.solucion ?? ''
  form.accion_preventiva = nc.accionPreventiva ?? ''
  saveError.value = ''
  showModal.value = true
}

async function save() {
  if (!form.problema.trim()) { saveError.value = 'El problema es obligatorio'; return }
  saving.value = true
  saveError.value = ''
  try {
    if (editingNc.value) {
      await $fetch(`/api/workorders/${props.otId}/nc/${editingNc.value.id}`, {
        method: 'PATCH',
        body: {
          fecha: form.fecha,
          problema: form.problema.trim(),
          causa: form.causa.trim() || null,
          solucion: form.solucion.trim() || null,
          accion_preventiva: form.accion_preventiva.trim() || null
        }
      })
    } else {
      await $fetch(`/api/workorders/${props.otId}/nc`, {
        method: 'POST',
        body: {
          fecha: form.fecha,
          problema: form.problema.trim(),
          causa: form.causa.trim() || null,
          solucion: form.solucion.trim() || null,
          accion_preventiva: form.accion_preventiva.trim() || null
        }
      })
    }
    await refresh()
    showModal.value = false
    await navigateTo('/')
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
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">
        No Conformidades
        <span class="ml-1 text-sm font-normal text-gray-500">({{ ncs?.length ?? 0 }})</span>
      </h2>
      <UButton
        label="Registrar No Conformidad"
        icon="i-lucide-plus"
        size="sm"
        @click="openCreate"
      />
    </div>

    <div
      v-if="!ncs?.length"
      class="text-sm text-gray-500 dark:text-gray-400"
    >
      Sin no conformidades registradas.
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <div
        v-for="nc in ncs"
        :key="nc.id"
        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        <button
          class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          @click="expandedId = expandedId === nc.id ? null : nc.id"
        >
          <div class="min-w-0">
            <span class="text-xs text-gray-500 block">{{ formatDate(nc.fecha) }}</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white truncate block">
              {{ nc.problema.length > 80 ? nc.problema.slice(0, 80) + '…' : nc.problema }}
            </span>
          </div>
          <UIcon
            :name="expandedId === nc.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="size-4 text-gray-400 shrink-0 ml-2"
          />
        </button>

        <div
          v-if="expandedId === nc.id"
          class="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700"
        >
          <div class="pt-3 space-y-2 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Problema</span>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">
                {{ nc.problema }}
              </p>
            </div>
            <div v-if="nc.causa">
              <span class="text-gray-500 dark:text-gray-400">Causa raíz</span>
              <p class="text-gray-900 dark:text-white mt-0.5">
                {{ nc.causa }}
              </p>
            </div>
            <div v-if="nc.solucion">
              <span class="text-gray-500 dark:text-gray-400">Solución</span>
              <p class="text-gray-900 dark:text-white mt-0.5">
                {{ nc.solucion }}
              </p>
            </div>
            <div v-if="nc.accionPreventiva">
              <span class="text-gray-500 dark:text-gray-400">Acción preventiva</span>
              <p class="text-gray-900 dark:text-white mt-0.5">
                {{ nc.accionPreventiva }}
              </p>
            </div>
          </div>
          <UButton
            label="Editar"
            icon="i-lucide-pencil"
            size="sm"
            color="neutral"
            variant="subtle"
            @click="openEdit(nc)"
          />
        </div>
      </div>
    </div>

    <UModal v-model:open="showModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-base font-semibold">
            {{ editingNc ? 'Editar No Conformidad' : 'Registrar No Conformidad' }}
          </h3>

          <UFormField
            label="Fecha"
            required
          >
            <DateField v-model="form.fecha" />
          </UFormField>

          <UFormField
            label="Problema detectado"
            required
          >
            <UTextarea
              v-model="form.problema"
              :rows="3"
              class="w-full"
              placeholder="Describir el problema encontrado"
            />
          </UFormField>

          <UFormField label="Causa raíz">
            <UTextarea
              v-model="form.causa"
              :rows="2"
              class="w-full"
              placeholder="¿Por qué ocurrió?"
            />
          </UFormField>

          <UFormField label="Solución aplicada">
            <UTextarea
              v-model="form.solucion"
              :rows="2"
              class="w-full"
              placeholder="¿Cómo se resolvió?"
            />
          </UFormField>

          <UFormField label="Acción preventiva">
            <UTextarea
              v-model="form.accion_preventiva"
              :rows="2"
              class="w-full"
              placeholder="¿Qué se hace para que no se repita?"
            />
          </UFormField>

          <UAlert
            v-if="saveError"
            color="error"
            :description="saveError"
          />

          <div class="flex gap-2 justify-end">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="showModal = false"
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
