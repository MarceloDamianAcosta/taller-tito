<script setup lang="ts">
definePageMeta({ middleware: 'admin', title: 'Usuarios' })

const { user: currentUser } = useUserSession()

const { data: users, refresh } = await useFetch<any[]>('/api/admin/usuarios')

const showModal = ref(false)
const editingUser = ref<any>(null)
const saving = ref(false)
const error = ref('')
const passwordError = ref('')

const createForm = reactive({ nombre: '', username: '', password: '', rol: 'technician' as 'admin' | 'technician' })
const editForm = reactive({ nombre: '', rol: 'technician' as 'admin' | 'technician', activo: true })
const passwordForm = reactive({ newPassword: '', confirm: '' })

const rolOptions = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Técnico', value: 'technician' }
]

function openCreate() {
  editingUser.value = null
  Object.assign(createForm, { nombre: '', username: '', password: '', rol: 'technician' })
  error.value = ''
  showModal.value = true
}

function openEdit(u: any) {
  editingUser.value = u
  Object.assign(editForm, { nombre: u.name, rol: u.role, activo: u.active })
  Object.assign(passwordForm, { newPassword: '', confirm: '' })
  error.value = ''
  passwordError.value = ''
  showModal.value = true
}

async function saveCreate() {
  if (!createForm.nombre.trim() || !createForm.username.trim() || !createForm.password) {
    error.value = 'Completá todos los campos obligatorios'
    return
  }
  if (createForm.password.length < 8) { error.value = 'La contraseña debe tener al menos 8 caracteres'; return }
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/usuarios', {
      method: 'POST',
      body: { nombre: createForm.nombre.trim(), username: createForm.username.trim().toLowerCase(), password: createForm.password, role: createForm.rol }
    })
    await refresh()
    showModal.value = false
  } catch (e: any) {
    error.value = e.data?.message || 'Error al crear usuario'
  } finally {
    saving.value = false
  }
}

async function saveEdit() {
  if (!editForm.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (!editForm.activo && editingUser.value?.id === currentUser.value?.id) {
    error.value = 'No podés desactivarte a vos mismo'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/admin/usuarios/${editingUser.value.id}`, {
      method: 'PATCH',
      body: { name: editForm.nombre.trim(), role: editForm.rol, active: editForm.activo }
    })
    await refresh()
    showModal.value = false
  } catch (e: any) {
    error.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
    passwordError.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirm) {
    passwordError.value = 'Las contraseñas no coinciden'
    return
  }
  saving.value = true
  passwordError.value = ''
  try {
    await $fetch(`/api/admin/usuarios/${editingUser.value.id}`, {
      method: 'PATCH',
      body: { password: passwordForm.newPassword }
    })
    passwordForm.newPassword = ''
    passwordForm.confirm = ''
  } catch (e: any) {
    passwordError.value = e.data?.message || 'Error al cambiar contraseña'
  } finally {
    saving.value = false
  }
}

function roleColor(role: string): 'secondary' | 'primary' {
  return role === 'admin' ? 'secondary' : 'primary'
}

function roleLabel(role: string) {
  return role === 'admin' ? 'Admin' : 'Técnico'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Usuarios
      </h1>
      <UButton
        label="Nuevo usuario"
        icon="i-lucide-user-plus"
        @click="openCreate"
      />
    </div>

    <div class="hidden md:block">
      <UCard>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <th class="pb-3 font-medium">
                Nombre
              </th>
              <th class="pb-3 font-medium">
                Usuario
              </th>
              <th class="pb-3 font-medium">
                Rol
              </th>
              <th class="pb-3 font-medium">
                Estado
              </th>
              <th class="pb-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="u in users"
              :key="u.id"
              :class="!u.active ? 'opacity-60' : ''"
            >
              <td class="py-3 font-medium text-gray-900 dark:text-white">
                {{ u.name }}
              </td>
              <td class="py-3 text-gray-500">
                {{ u.username }}
              </td>
              <td class="py-3">
                <UBadge
                  :color="roleColor(u.role)"
                  variant="subtle"
                  size="sm"
                >
                  {{ roleLabel(u.role) }}
                </UBadge>
              </td>
              <td class="py-3">
                <UBadge
                  :color="u.active ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ u.active ? 'Activo' : 'Inactivo' }}
                </UBadge>
              </td>
              <td class="py-3 text-right">
                <UButton
                  label="Editar"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="openEdit(u)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </div>

    <div class="md:hidden space-y-3">
      <UCard
        v-for="u in users"
        :key="u.id"
        :class="!u.active ? 'opacity-60' : ''"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ u.name }}
            </p>
            <p class="text-sm text-gray-500">
              @{{ u.username }}
            </p>
            <div class="flex gap-2 mt-2">
              <UBadge
                :color="roleColor(u.role)"
                variant="subtle"
                size="sm"
              >
                {{ roleLabel(u.role) }}
              </UBadge>
              <UBadge
                :color="u.active ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ u.active ? 'Activo' : 'Inactivo' }}
              </UBadge>
            </div>
          </div>
          <UButton
            label="Editar"
            size="sm"
            color="neutral"
            variant="subtle"
            @click="openEdit(u)"
          />
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showModal">
      <template #content>
        <div class="p-6 space-y-4">
          <template v-if="!editingUser">
            <h3 class="text-base font-semibold">
              Nuevo usuario
            </h3>
            <UFormField
              label="Nombre"
              required
            >
              <UInput
                v-model="createForm.nombre"
                class="w-full"
                placeholder="Nombre completo"
              />
            </UFormField>
            <UFormField
              label="Usuario"
              required
            >
              <UInput
                v-model="createForm.username"
                class="w-full"
                placeholder="usuario (sin espacios)"
              />
            </UFormField>
            <UFormField
              label="Contraseña"
              required
            >
              <UInput
                v-model="createForm.password"
                type="password"
                class="w-full"
                placeholder="Mínimo 8 caracteres"
              />
            </UFormField>
            <UFormField label="Rol">
              <USelect
                v-model="createForm.rol"
                :items="rolOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
            <UAlert
              v-if="error"
              color="error"
              :description="error"
            />
            <div class="flex gap-2 justify-end">
              <UButton
                label="Cancelar"
                color="neutral"
                variant="subtle"
                @click="showModal = false"
              />
              <UButton
                label="Crear usuario"
                :loading="saving"
                @click="saveCreate"
              />
            </div>
          </template>

          <template v-else>
            <h3 class="text-base font-semibold">
              Editar usuario
            </h3>
            <UFormField
              label="Nombre"
              required
            >
              <UInput
                v-model="editForm.nombre"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Rol">
              <USelect
                v-model="editForm.rol"
                :items="rolOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
            <div class="flex items-center gap-3">
              <UToggle v-model="editForm.activo" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Activo</span>
            </div>
            <UAlert
              v-if="error"
              color="error"
              :description="error"
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
                @click="saveEdit"
              />
            </div>

            <hr class="border-gray-200 dark:border-gray-700 my-2">

            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Cambiar contraseña
            </h4>
            <UFormField label="Nueva contraseña">
              <UInput
                v-model="passwordForm.newPassword"
                type="password"
                class="w-full"
                placeholder="Mínimo 8 caracteres"
              />
            </UFormField>
            <UFormField label="Confirmar contraseña">
              <UInput
                v-model="passwordForm.confirm"
                type="password"
                class="w-full"
              />
            </UFormField>
            <UAlert
              v-if="passwordError"
              color="error"
              :description="passwordError"
            />
            <UButton
              label="Cambiar contraseña"
              size="sm"
              color="neutral"
              variant="subtle"
              :loading="saving"
              @click="changePassword"
            />
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>
