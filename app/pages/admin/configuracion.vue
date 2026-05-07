<script setup lang="ts">
import { buildBrandCss } from '~/plugins/brand'

definePageMeta({ middleware: 'admin', title: 'Configuración' })

interface BrandConfig {
  nombreParte1: string
  nombreParte2: string
  colorPrimario: string
  colorPrimarioEscala: string[]
  colorFondo: string
  colorFondoOscuro: string
  colorParte2Texto: string
}

const { brand } = useAppBrand()
const { data: serverBrand, refresh } = await useFetch<BrandConfig>('/api/brand')
if (serverBrand.value && !brand.value) brand.value = serverBrand.value

const form = reactive({
  nombreParte1: brand.value?.nombreParte1 ?? 'Mecanizados',
  nombreParte2: brand.value?.nombreParte2 ?? 'Schmidt',
  colorPrimario: brand.value?.colorPrimario ?? '#00A155',
  colorFondo: brand.value?.colorFondo ?? '#f9fafb',
  colorFondoOscuro: brand.value?.colorFondoOscuro ?? '#020617',
  colorParte2Auto: (brand.value?.colorParte2Texto ?? 'auto') === 'auto',
  colorParte2Texto: brand.value?.colorParte2Texto && brand.value.colorParte2Texto !== 'auto' ? brand.value.colorParte2Texto : '#0f172a'
})

const saving = ref(false)
const errorMsg = ref('')
const okMsg = ref('')

const presetsPrimario = [
  { label: 'Verde', hex: '#00A155' },
  { label: 'Azul', hex: '#2563eb' },
  { label: 'Rojo', hex: '#dc2626' },
  { label: 'Naranja', hex: '#ea580c' },
  { label: 'Violeta', hex: '#9333ea' },
  { label: 'Gris', hex: '#475569' }
]

const presetsFondoClaro = [
  { label: 'Gris claro', hex: '#f9fafb' },
  { label: 'Blanco', hex: '#ffffff' },
  { label: 'Beige', hex: '#fafaf9' },
  { label: 'Azul claro', hex: '#eff6ff' }
]

const presetsFondoOscuro = [
  { label: 'Slate', hex: '#020617' },
  { label: 'Negro', hex: '#0a0a0a' },
  { label: 'Azul noche', hex: '#0f172a' }
]

function relLuma(hex: string): number {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  const num = parseInt(full, 16)
  const channels = [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function contrast(a: string, b: string): number {
  const la = relLuma(a)
  const lb = relLuma(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

const contrastePrimarioFondo = computed(() => contrast(form.colorPrimario, form.colorFondo))
const contrastePrimarioFondoOscuro = computed(() => contrast(form.colorPrimario, form.colorFondoOscuro))

const contrasteOk = computed(() => contrastePrimarioFondo.value >= 3 && contrastePrimarioFondoOscuro.value >= 3)

function applyPreviewToDom(b: BrandConfig) {
  if (typeof document === 'undefined') return
  const css = buildBrandCss(b)
  let style = document.getElementById('brand-vars') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'brand-vars'
    document.head.appendChild(style)
  }
  style.innerHTML = css
}

async function guardar() {
  errorMsg.value = ''
  okMsg.value = ''
  if (!form.nombreParte1.trim() || !form.nombreParte2.trim()) {
    errorMsg.value = 'Los dos nombres son obligatorios'
    return
  }
  saving.value = true
  try {
    const res = await $fetch<BrandConfig>('/api/admin/brand', {
      method: 'PUT',
      body: {
        nombreParte1: form.nombreParte1.trim(),
        nombreParte2: form.nombreParte2.trim(),
        colorPrimario: form.colorPrimario,
        colorFondo: form.colorFondo,
        colorFondoOscuro: form.colorFondoOscuro,
        colorParte2Texto: form.colorParte2Auto ? 'auto' : form.colorParte2Texto
      }
    })
    brand.value = res
    applyPreviewToDom(res)
    await refresh()
    okMsg.value = 'Cambios guardados'
    setTimeout(() => (okMsg.value = ''), 3000)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    errorMsg.value = err.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold">
      Configuración del taller
    </h1>

    <UAlert
      v-if="errorMsg"
      icon="i-lucide-circle-alert"
      color="error"
      variant="soft"
      :title="errorMsg"
    />
    <UAlert
      v-if="okMsg"
      icon="i-lucide-circle-check"
      color="success"
      variant="soft"
      :title="okMsg"
    />

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Vista previa
        </h2>
      </template>
      <div
        class="rounded-lg p-6 flex items-center justify-center gap-2 border border-default"
        :style="{ background: form.colorFondo }"
      >
        <span
          class="text-2xl font-bold"
          :style="{ color: form.colorPrimario }"
        >{{ form.nombreParte1 }}</span>
        <span
          class="text-2xl font-bold"
          :style="{ color: form.colorParte2Auto ? '#0f172a' : form.colorParte2Texto }"
        >{{ form.nombreParte2 }}</span>
      </div>
      <div
        class="rounded-lg p-6 mt-2 flex items-center justify-center gap-2"
        :style="{ background: form.colorFondoOscuro }"
      >
        <span
          class="text-2xl font-bold"
          :style="{ color: form.colorPrimario }"
        >{{ form.nombreParte1 }}</span>
        <span
          class="text-2xl font-bold"
          :style="{ color: form.colorParte2Auto ? '#f8fafc' : form.colorParte2Texto }"
        >{{ form.nombreParte2 }}</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Nombre del taller
        </h2>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Parte 1 (color principal)">
          <UInput
            v-model="form.nombreParte1"
            placeholder="Mecanizados"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Parte 2 (color secundario)">
          <UInput
            v-model="form.nombreParte2"
            placeholder="Schmidt"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Color principal
        </h2>
        <p class="text-sm text-muted">
          Usado en botones, links, parte 1 del nombre, y todos los elementos destacados de la app.
        </p>
      </template>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <input
            v-model="form.colorPrimario"
            type="color"
            class="h-10 w-16 rounded border border-default cursor-pointer"
          >
          <UInput
            v-model="form.colorPrimario"
            placeholder="#00A155"
            class="font-mono"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in presetsPrimario"
            :key="p.hex"
            type="button"
            class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-default hover:bg-elevated text-sm"
            @click="form.colorPrimario = p.hex"
          >
            <span
              class="inline-block w-4 h-4 rounded"
              :style="{ background: p.hex }"
            />
            {{ p.label }}
          </button>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <UIcon
            :name="contrasteOk ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'"
            :class="contrasteOk ? 'text-success' : 'text-warning'"
          />
          <span :class="contrasteOk ? 'text-success' : 'text-warning'">
            Contraste sobre fondo claro: {{ contrastePrimarioFondo.toFixed(2) }} • oscuro: {{ contrastePrimarioFondoOscuro.toFixed(2) }}
            <template v-if="!contrasteOk">
              (mínimo recomendado: 3.0)
            </template>
          </span>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Fondo de la app
        </h2>
        <p class="text-sm text-muted">
          Aplica al login, dashboard y todas las pantallas.
        </p>
      </template>
      <div class="space-y-4">
        <div>
          <UFormField label="Fondo modo claro">
            <div class="flex items-center gap-3">
              <input
                v-model="form.colorFondo"
                type="color"
                class="h-10 w-16 rounded border border-default cursor-pointer"
              >
              <UInput
                v-model="form.colorFondo"
                placeholder="#f9fafb"
                class="font-mono"
              />
            </div>
          </UFormField>
          <div class="flex flex-wrap gap-2 mt-2">
            <button
              v-for="p in presetsFondoClaro"
              :key="p.hex"
              type="button"
              class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-default hover:bg-elevated text-sm"
              @click="form.colorFondo = p.hex"
            >
              <span
                class="inline-block w-4 h-4 rounded border border-default"
                :style="{ background: p.hex }"
              />
              {{ p.label }}
            </button>
          </div>
        </div>
        <div>
          <UFormField label="Fondo modo oscuro">
            <div class="flex items-center gap-3">
              <input
                v-model="form.colorFondoOscuro"
                type="color"
                class="h-10 w-16 rounded border border-default cursor-pointer"
              >
              <UInput
                v-model="form.colorFondoOscuro"
                placeholder="#020617"
                class="font-mono"
              />
            </div>
          </UFormField>
          <div class="flex flex-wrap gap-2 mt-2">
            <button
              v-for="p in presetsFondoOscuro"
              :key="p.hex"
              type="button"
              class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-default hover:bg-elevated text-sm"
              @click="form.colorFondoOscuro = p.hex"
            >
              <span
                class="inline-block w-4 h-4 rounded"
                :style="{ background: p.hex }"
              />
              {{ p.label }}
            </button>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Color parte 2 del nombre
        </h2>
        <p class="text-sm text-muted">
          Por defecto se ajusta automáticamente al modo claro/oscuro. Solo cambialo si querés un color específico.
        </p>
      </template>
      <div class="space-y-3">
        <UCheckbox
          v-model="form.colorParte2Auto"
          label="Automático según modo claro/oscuro"
        />
        <div
          v-if="!form.colorParte2Auto"
          class="flex items-center gap-3"
        >
          <input
            v-model="form.colorParte2Texto"
            type="color"
            class="h-10 w-16 rounded border border-default cursor-pointer"
          >
          <UInput
            v-model="form.colorParte2Texto"
            placeholder="#0f172a"
            class="font-mono"
          />
        </div>
      </div>
    </UCard>

    <div class="flex justify-end gap-2">
      <UButton
        :loading="saving"
        size="lg"
        color="primary"
        icon="i-lucide-save"
        @click="guardar"
      >
        Guardar cambios
      </UButton>
    </div>
  </div>
</template>
