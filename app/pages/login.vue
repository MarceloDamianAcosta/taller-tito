<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const form = reactive({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean, mustChangePassword: boolean }>('/api/auth/login', {
      method: 'POST',
      body: form
    })
    const dest = res.mustChangePassword ? '/cambiar-password' : '/'
    await navigateTo(dest, { external: true })
  } catch (e: any) {
    error.value = e.data?.message || 'Usuario o contraseña incorrectos'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-xl font-semibold text-center">
        Iniciar sesión
      </h1>
    </template>

    <form
      class="space-y-4"
      @submit.prevent="submit"
    >
      <UFormField
        label="Usuario"
        name="username"
      >
        <UInput
          v-model="form.username"
          placeholder="usuario"
          autocomplete="username"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Contraseña"
        name="password"
      >
        <UInput
          v-model="form.password"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        :description="error"
      />

      <UButton
        type="submit"
        label="Ingresar"
        class="w-full justify-center"
        :loading="loading"
      />
    </form>
  </UCard>
</template>
