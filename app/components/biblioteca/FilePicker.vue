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

interface PendingFile { id: string, file: File, nombre: string }
const pendingFiles = ref<PendingFile[]>([])
const uploadError = ref('')
const uploading = ref(false)
const uploadedCount = ref(0)

const { data: archivos, refresh: refreshArchivos } = useFetch('/api/biblioteca')

watch(() => props.modelValue, (val) => {
  localSelected.value = [...val]
})

function openModal() {
  localSelected.value = [...props.modelValue]
  activeTab.value = 'biblioteca'
  pendingFiles.value = []
  uploadError.value = ''
  modalOpen.value = true
}

function stripExt(name: string): string {
  return name.replace(/\.[^./\\]+$/, '')
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
  const files = input.files ? Array.from(input.files) : []
  pendingFiles.value = files.map(f => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file: f,
    nombre: stripExt(f.name)
  }))
  input.value = ''
}

function removePending(id: string) {
  pendingFiles.value = pendingFiles.value.filter(p => p.id !== id)
}

async function submitUpload() {
  uploadError.value = ''
  if (pendingFiles.value.length === 0) {
    uploadError.value = 'Seleccioná al menos un archivo'
    return
  }
  for (const p of pendingFiles.value) {
    if (!p.nombre.trim()) {
      uploadError.value = 'Cada archivo necesita un nombre'
      return
    }
  }
  uploading.value = true
  uploadedCount.value = 0
  const newIds: number[] = []
  try {
    for (const p of pendingFiles.value) {
      const fd = new FormData()
      fd.append('nombre', p.nombre.trim())
      fd.append('archivo', p.file)
      const created = await $fetch<{ id: number }>('/api/biblioteca', { method: 'POST', body: fd })
      newIds.push(created.id)
      uploadedCount.value++
    }
    await refreshArchivos()
    localSelected.value = [...localSelected.value, ...newIds]
    pendingFiles.value = []
    activeTab.value = 'biblioteca'
    toast.add({
      title: newIds.length === 1 ? 'Archivo subido y seleccionado' : `${newIds.length} archivos subidos y seleccionados`,
      color: 'success'
    })
  } catch (e: any) {
    uploadError.value = `${e.data?.message || 'Error al subir'}. Subidos: ${uploadedCount.value}/${pendingFiles.value.length}`
    if (newIds.length > 0) {
      await refreshArchivos()
      localSelected.value = [...localSelected.value, ...newIds]
    }
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
    <div
      v-if="modelValue.length > 0"
      class="flex flex-wrap gap-2"
    >
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
        <button
          type="button"
          class="hover:opacity-70 ml-1"
          aria-label="Quitar"
          @click="removeId(id)"
        >
          <UIcon
            name="i-lucide-x"
            class="size-3"
          />
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

    <UModal
      v-model:open="modalOpen"
      title="Adjuntar archivos"
      class="max-w-2xl"
    >
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
            <div
              v-if="archivos && archivos.length > 0"
              class="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-80 overflow-y-auto pr-1"
            >
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
                  >
                  <UIcon
                    v-else
                    name="i-lucide-file-text"
                    class="size-10 text-red-500"
                  />
                </div>
                <div class="p-1.5">
                  <p
                    class="text-xs font-medium truncate text-gray-900 dark:text-white"
                    :title="archivo.nombre"
                  >
                    {{ archivo.nombre }}
                  </p>
                  <p class="text-xs text-gray-400">
                    {{ formatDate(archivo.createdAt) }}
                  </p>
                </div>
                <div
                  v-if="localSelected.includes(archivo.id)"
                  class="absolute top-1 right-1 size-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-3 text-white"
                  />
                </div>
              </button>
            </div>
            <div
              v-else
              class="text-center py-8 text-gray-500 text-sm"
            >
              No hay archivos en la biblioteca
            </div>
          </div>

          <div
            v-if="activeTab === 'subir'"
            class="space-y-4"
          >
            <form @submit.prevent="submitUpload">
              <div class="space-y-3">
                <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <UIcon
                    name="i-lucide-upload-cloud"
                    class="size-7 text-gray-400 mb-1"
                  />
                  <span class="text-xs text-gray-500">
                    {{ pendingFiles.length > 0
                      ? `${pendingFiles.length} archivo(s) seleccionado(s) — agregar más`
                      : 'Imágenes o PDFs (uno o varios)' }}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    class="sr-only"
                    @change="onFileChange"
                  >
                </label>

                <ul
                  v-if="pendingFiles.length > 0"
                  class="space-y-2 max-h-60 overflow-y-auto pr-1"
                >
                  <li
                    v-for="p in pendingFiles"
                    :key="p.id"
                    class="flex items-center gap-2"
                  >
                    <UIcon
                      :name="p.file.type === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-image'"
                      class="size-4 shrink-0 text-gray-500"
                    />
                    <UInput
                      v-model="p.nombre"
                      class="flex-1"
                      placeholder="Nombre descriptivo"
                    />
                    <button
                      type="button"
                      class="size-7 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                      aria-label="Quitar"
                      @click="removePending(p.id)"
                    >
                      <UIcon
                        name="i-lucide-x"
                        class="size-4"
                      />
                    </button>
                  </li>
                </ul>

                <UAlert
                  v-if="uploadError"
                  color="error"
                  :description="uploadError"
                />

                <UButton
                  type="submit"
                  :label="pendingFiles.length > 1
                    ? `Subir ${pendingFiles.length} archivos`
                    : 'Subir y seleccionar'"
                  icon="i-lucide-upload"
                  class="w-full justify-center"
                  :loading="uploading"
                  :disabled="pendingFiles.length === 0"
                />
              </div>
            </form>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="outline"
              @click="modalOpen = false"
            />
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
