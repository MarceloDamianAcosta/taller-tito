<script setup lang="ts">
const form = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (form.newPassword !== form.confirm) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  if (form.newPassword.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/me/password', {
      method: 'PATCH',
      body: { currentPassword: form.currentPassword, newPassword: form.newPassword }
    })
    await navigateTo('/')
  } catch (e: any) {
    error.value = e.data?.message || 'Error al cambiar contraseña'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold">Cambiar contraseña</h1>
        <p class="mt-1 text-sm text-gray-500">Por seguridad, cambiá tu contraseña antes de continuar.</p>
      </template>

      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="Contraseña actual" name="current">
          <UInput v-model="form.currentPassword" type="password" class="w-full" />
        </UFormField>

        <UFormField label="Nueva contraseña" name="new">
          <UInput v-model="form.newPassword" type="password" class="w-full" />
        </UFormField>

        <UFormField label="Confirmar nueva contraseña" name="confirm">
          <UInput v-model="form.confirm" type="password" class="w-full" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />

        <UButton
          type="submit"
          label="Cambiar contraseña"
          class="w-full justify-center"
          :loading="loading"
        />
      </form>
    </UCard>
  </div>
</template>
