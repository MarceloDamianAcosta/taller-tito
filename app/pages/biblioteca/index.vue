<script setup lang="ts">
const toast = useToast()

const search = ref('')
const uploadModalOpen = ref(false)
const deleteTarget = ref<{ id: number, nombre: string } | null>(null)
const deleteConfirmOpen = ref(false)

const uploadForm = reactive({ nombre: '', file: null as File | null })
const uploadError = ref('')
const uploading = ref(false)
const deleting = ref(false)

const { data: archivos, refresh } = await useFetch('/api/biblioteca', {
  query: computed(() => ({ q: search.value || undefined })),
  watch: [search]
})

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  uploadForm.file = input.files?.[0] ?? null
}

function openUploadModal() {
  uploadForm.nombre = ''
  uploadForm.file = null
  uploadError.value = ''
  uploadModalOpen.value = true
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
    await $fetch('/api/biblioteca', { method: 'POST', body: fd })
    uploadModalOpen.value = false
    await refresh()
    toast.add({ title: 'Archivo subido correctamente', color: 'success' })
  } catch (e: any) {
    uploadError.value = e.data?.message || 'Error al subir el archivo'
  } finally {
    uploading.value = false
  }
}

function confirmDelete(id: number, nombre: string) {
  deleteTarget.value = { id, nombre }
  deleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/biblioteca/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteConfirmOpen.value = false
    deleteTarget.value = null
    await refresh()
    toast.add({ title: 'Archivo eliminado', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Error al eliminar', color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Biblioteca de Archivos
      </h1>
      <UButton
        label="Subir archivo"
        icon="i-lucide-upload"
        @click="openUploadModal"
      />
    </div>

    <UInput
      v-model="search"
      placeholder="Buscar por nombre..."
      icon="i-lucide-search"
      class="max-w-sm"
    />

    <div
      v-if="archivos && archivos.length > 0"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <UCard
        v-for="archivo in archivos"
        :key="archivo.id"
        class="overflow-hidden"
      >
        <div class="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded -mx-4 -mt-4 mb-3">
          <img
            v-if="archivo.tipo === 'imagen'"
            :src="`/api/archivos/${archivo.archivo}`"
            :alt="archivo.nombre"
            class="w-full h-full object-cover"
          >
          <UIcon
            v-else
            name="i-lucide-file-text"
            class="size-14 text-red-500"
          />
        </div>

        <p
          class="text-sm font-medium text-gray-900 dark:text-white truncate"
          :title="archivo.nombre"
        >
          {{ archivo.nombre }}
        </p>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ formatDate(archivo.createdAt) }}
        </p>

        <div class="flex items-center justify-between mt-2">
          <UBadge
            :label="archivo.tipo === 'pdf' ? 'PDF' : 'Imagen'"
            :color="archivo.tipo === 'pdf' ? 'error' : 'success'"
            variant="subtle"
            size="sm"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            aria-label="Eliminar"
            @click="confirmDelete(archivo.id, archivo.nombre)"
          />
        </div>
      </UCard>
    </div>

    <div
      v-else-if="archivos && archivos.length === 0"
      class="text-center py-12 text-gray-500"
    >
      <UIcon
        name="i-lucide-image-off"
        class="size-12 mx-auto mb-3 text-gray-300"
      />
      <p>No hay archivos en la biblioteca</p>
    </div>

    <UModal
      v-model:open="uploadModalOpen"
      title="Subir archivo"
    >
      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="submitUpload"
        >
          <UFormField
            label="Nombre"
            name="nombre"
            required
          >
            <UInput
              v-model="uploadForm.nombre"
              placeholder="Nombre descriptivo"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Archivo"
            name="archivo"
            required
          >
            <label class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <UIcon
                name="i-lucide-upload-cloud"
                class="size-8 text-gray-400 mb-1"
              />
              <span class="text-sm text-gray-500">
                {{ uploadForm.file ? uploadForm.file.name : 'Imagen o PDF' }}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                class="sr-only"
                @change="onFileChange"
              >
            </label>
          </UFormField>

          <UAlert
            v-if="uploadError"
            color="error"
            :description="uploadError"
          />

          <div class="flex justify-end gap-2 pt-1">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="outline"
              @click="uploadModalOpen = false"
            />
            <UButton
              type="submit"
              label="Subir"
              icon="i-lucide-upload"
              :loading="uploading"
            />
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteConfirmOpen"
      title="Eliminar archivo"
    >
      <template #body>
        <p class="text-sm text-gray-700 dark:text-gray-300">
          ¿Eliminás el archivo <strong>{{ deleteTarget?.nombre }}</strong>? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end gap-2 mt-4">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="outline"
            @click="deleteConfirmOpen = false"
          />
          <UButton
            label="Eliminar"
            color="error"
            icon="i-lucide-trash-2"
            :loading="deleting"
            @click="executeDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
