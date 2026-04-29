<script setup lang="ts">
const props = defineProps<{
  modelValue: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const toast = useToast()
const modalOpen = ref(false)
const activeTab = ref('biblioteca')

const localSelected = ref<number[]>([...props.modelValue])

const uploadForm = reactive({ nombre: '', file: null as File | null })
const uploadError = ref('')
const uploading = ref(false)

const { data: archivos, refresh: refreshArchivos } = useFetch('/api/biblioteca')

watch(() => props.modelValue, (val) => {
  localSelected.value = [...val]
})

function openModal() {
  localSelected.value = [...props.modelValue]
  activeTab.value = 'biblioteca'
  uploadForm.nombre = ''
  uploadForm.file = null
  uploadError.value = ''
  modalOpen.value = true
}

function toggleFile(id: number) {
  const idx = localSelected.value.indexOf(id)
  if (idx === -1) {
    localSelected.value = [...localSelected.value, id]
  } else {
    localSelected.value = localSelected.value.filter(x => x !== id)
  }
}

function confirm() {
  emit('update:modelValue', [...localSelected.value])
  modalOpen.value = false
}

function removeId(id: number) {
  emit('update:modelValue', props.modelValue.filter(x => x !== id))
}

function getArchivo(id: number) {
  return archivos.value?.find(a => a.id === id)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  uploadForm.file = input.files?.[0] ?? null
}

async function submitUpload() {
  uploadError.value = ''
  if (!uploadForm.nombre.trim()) {
    uploadError.value = 'El nombre es obligatorio'
    return
  }
  if (!uploadForm.file) {
    uploadError.value = 'Seleccioná un archivo'
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('nombre', uploadForm.nombre.trim())
    fd.append('archivo', uploadForm.file)
    const created = await $fetch<{ id: number }>('/api/biblioteca', { method: 'POST', body: fd })
    await refreshArchivos()
    localSelected.value = [...localSelected.value, created.id]
    uploadForm.nombre = ''
    uploadForm.file = null
    activeTab.value = 'biblioteca'
    toast.add({ title: 'Archivo subido y seleccionado', color: 'success' })
  } catch (e: any) {
    uploadError.value = e.data?.message || 'Error al subir el archivo'
  } finally {
    uploading.value = false
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const tabs = [
  { key: 'biblioteca', label: 'Biblioteca' },
  { key: 'subir', label: 'Subir nuevo' }
]
</script>

<template>
  <div class="space-y-2">
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <span
        v-for="id in modelValue"
        :key="id"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
      >
        <UIcon
          :name="getArchivo(id)?.tipo === 'pdf' ? 'i-lucide-file-text' : 'i-lucide-image'"
          class="size-3"
        />
        {{ getArchivo(id)?.nombre ?? `Archivo #${id}` }}
        <button type="button" class="hover:opacity-70 ml-1" aria-label="Quitar" @click="removeId(id)">
          <UIcon name="i-lucide-x" class="size-3" />
        </button>
      </span>
    </div>

    <UButton
      label="Adjuntar archivos"
      icon="i-lucide-paperclip"
      color="neutral"
      variant="outline"
      size="sm"
      @click="openModal"
    />

    <UModal v-model:open="modalOpen" title="Adjuntar archivos" class="max-w-2xl">
      <template #body>
        <div class="space-y-4">
          <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              :class="activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeTab === 'biblioteca'">
            <div v-if="archivos && archivos.length > 0" class="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-80 overflow-y-auto pr-1">
              <button
                v-for="archivo in archivos"
                :key="archivo.id"
                type="button"
                class="relative rounded-lg border-2 transition-colors overflow-hidden text-left"
                :class="localSelected.includes(archivo.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
                @click="toggleFile(archivo.id)"
              >
                <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <img
                    v-if="archivo.tipo === 'imagen'"
                    :src="`/api/archivos/${archivo.archivo}`"
                    :alt="archivo.nombre"
                    class="w-full h-full object-cover"
                  />
                  <UIcon v-else name="i-lucide-file-text" class="size-10 text-red-500" />
                </div>
                <div class="p-1.5">
                  <p class="text-xs font-medium truncate text-gray-900 dark:text-white" :title="archivo.nombre">
                    {{ archivo.nombre }}
                  </p>
                  <p class="text-xs text-gray-400">{{ formatDate(archivo.createdAt) }}</p>
                </div>
                <div
                  v-if="localSelected.includes(archivo.id)"
                  class="absolute top-1 right-1 size-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <UIcon name="i-lucide-check" class="size-3 text-white" />
                </div>
              </button>
            </div>
            <div v-else class="text-center py-8 text-gray-500 text-sm">
              No hay archivos en la biblioteca
            </div>
          </div>

          <div v-if="activeTab === 'subir'" class="space-y-4">
            <form @submit.prevent="submitUpload">
              <div class="space-y-3">
                <UFormField label="Nombre" name="nombre" required>
                  <UInput v-model="uploadForm.nombre" placeholder="Nombre descriptivo" class="w-full" />
                </UFormField>

                <UFormField label="Archivo" name="archivo" required>
                  <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <UIcon name="i-lucide-upload-cloud" class="size-7 text-gray-400 mb-1" />
                    <span class="text-xs text-gray-500">
                      {{ uploadForm.file ? uploadForm.file.name : 'JPG, PNG o PDF — máx 10MB' }}
                    </span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" class="sr-only" @change="onFileChange" />
                  </label>
                </UFormField>

                <UAlert v-if="uploadError" color="error" :description="uploadError" />

                <UButton type="submit" label="Subir y seleccionar" icon="i-lucide-upload" class="w-full justify-center" :loading="uploading" />
              </div>
            </form>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <UButton label="Cancelar" color="neutral" variant="outline" @click="modalOpen = false" />
            <UButton
              :label="`Confirmar (${localSelected.length})`"
              icon="i-lucide-check"
              @click="confirm"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
