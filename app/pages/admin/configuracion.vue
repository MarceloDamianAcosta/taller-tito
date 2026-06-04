<script setup lang="ts">
import { buildBrandCss, NEUTRAL_FAMILIES } from '~/plugins/brand'

definePageMeta({ middleware: 'admin', title: 'Configuración' })

interface BrandConfig {
  nombreParte1: string
  nombreParte2: string
  colorPrimarioLight: string
  colorPrimarioEscalaLight: string[]
  colorPrimarioDark: string
  colorPrimarioEscalaDark: string[]
  colorFondoLight: string
  colorFondoDark: string
  colorParte2TextoLight: string
  colorParte2TextoDark: string
  colorParte2EscalaLight: string[]
  colorParte2EscalaDark: string[]
  colorTerciario: string
  logoPath: string | null
}

const { brand } = useAppBrand()
const { data: serverBrand, refresh } = await useFetch<BrandConfig>('/api/brand')
if (serverBrand.value && !brand.value) brand.value = serverBrand.value

const form = reactive({
  nombreParte1: brand.value?.nombreParte1 ?? 'Mecanizados',
  nombreParte2: brand.value?.nombreParte2 ?? 'Schmidt',
  colorPrimarioLight: brand.value?.colorPrimarioLight ?? '#00A155',
  colorPrimarioDark: brand.value?.colorPrimarioDark ?? '#00A155',
  colorParte2LightAuto: (brand.value?.colorParte2TextoLight ?? 'auto') === 'auto',
  colorParte2LightHex: brand.value?.colorParte2TextoLight && brand.value.colorParte2TextoLight !== 'auto' ? brand.value.colorParte2TextoLight : '#0f172a',
  colorParte2DarkAuto: (brand.value?.colorParte2TextoDark ?? 'auto') === 'auto',
  colorParte2DarkHex: brand.value?.colorParte2TextoDark && brand.value.colorParte2TextoDark !== 'auto' ? brand.value.colorParte2TextoDark : '#f8fafc',
  colorTerciario: brand.value?.colorTerciario ?? 'slate'
})

const saving = ref(false)
const errorMsg = ref('')
const okMsg = ref('')

const logoFileInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const logoErrorMsg = ref('')

async function onLogoFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  logoErrorMsg.value = ''

  const okType = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)
  if (!okType) {
    logoErrorMsg.value = 'Tipo no permitido (PNG, JPG o SVG)'
    target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    logoErrorMsg.value = 'El archivo excede 2MB'
    target.value = ''
    return
  }

  logoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('archivo', file)
    const res = await $fetch<{ logoPath: string }>('/api/admin/brand/logo', { method: 'POST', body: fd })
    if (brand.value) brand.value = { ...brand.value, logoPath: res.logoPath }
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    logoErrorMsg.value = err.data?.message || 'Error al subir el logo'
  } finally {
    logoUploading.value = false
    target.value = ''
  }
}

async function quitarLogo() {
  if (!confirm('¿Quitar el logo?')) return
  logoErrorMsg.value = ''
  logoUploading.value = true
  try {
    await $fetch('/api/admin/brand/logo', { method: 'DELETE' })
    if (brand.value) brand.value = { ...brand.value, logoPath: null }
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    logoErrorMsg.value = err.data?.message || 'Error al quitar el logo'
  } finally {
    logoUploading.value = false
  }
}

const presetsPrimario = [
  { label: 'Verde', hex: '#00A155' },
  { label: 'Azul', hex: '#2563eb' },
  { label: 'Rojo', hex: '#dc2626' },
  { label: 'Naranja', hex: '#ea580c' },
  { label: 'Violeta', hex: '#9333ea' },
  { label: 'Gris', hex: '#475569' }
]

// "Color terciario" = neutro de toda la app (fondo de página, sidebar, navbar y cards).
// Acotado a las familias de neutro que sirven en light y dark. sampleLight/sampleDark son
// solo para el swatch de la UI (escalón claro y oscuro de cada familia).
const presetsTerciario = [
  { label: 'Pizarra', key: 'slate', sampleLight: '#e2e8f0', sampleDark: '#0f172a' },
  { label: 'Gris', key: 'gray', sampleLight: '#e5e7eb', sampleDark: '#111827' },
  { label: 'Grafito', key: 'zinc', sampleLight: '#e4e4e7', sampleDark: '#18181b' },
  { label: 'Neutro', key: 'neutral', sampleLight: '#e5e5e5', sampleDark: '#171717' },
  { label: 'Arena', key: 'stone', sampleLight: '#e7e5e4', sampleDark: '#1c1917' }
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

// El fondo ya no se elige a mano: deriva del color terciario (escalón 100 en light,
// 950 en dark de la familia elegida). Se usa en la vista previa, el contraste y el payload.
const fondoLightEff = computed(() => (NEUTRAL_FAMILIES[form.colorTerciario] ?? NEUTRAL_FAMILIES.slate!)[1]!)
const fondoDarkEff = computed(() => (NEUTRAL_FAMILIES[form.colorTerciario] ?? NEUTRAL_FAMILIES.slate!)[10]!)

const contrasteLight = computed(() => contrast(form.colorPrimarioLight, fondoLightEff.value))
const contrasteDark = computed(() => contrast(form.colorPrimarioDark, fondoDarkEff.value))
const contrasteLightOk = computed(() => contrasteLight.value >= 3)
const contrasteDarkOk = computed(() => contrasteDark.value >= 3)

const parte2LightPreview = computed(() => form.colorParte2LightAuto ? '#0f172a' : form.colorParte2LightHex)
const parte2DarkPreview = computed(() => form.colorParte2DarkAuto ? '#f8fafc' : form.colorParte2DarkHex)

function copiarLightADark() {
  form.colorPrimarioDark = form.colorPrimarioLight
  form.colorParte2DarkAuto = form.colorParte2LightAuto
  form.colorParte2DarkHex = form.colorParte2LightHex
}

function copiarDarkALight() {
  form.colorPrimarioLight = form.colorPrimarioDark
  form.colorParte2LightAuto = form.colorParte2DarkAuto
  form.colorParte2LightHex = form.colorParte2DarkHex
}

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
        colorPrimarioLight: form.colorPrimarioLight,
        colorPrimarioDark: form.colorPrimarioDark,
        // Fondo derivado del color terciario (la API aún lo persiste como columna legacy).
        colorFondoLight: fondoLightEff.value,
        colorFondoDark: fondoDarkEff.value,
        colorParte2TextoLight: form.colorParte2LightAuto ? 'auto' : form.colorParte2LightHex,
        colorParte2TextoDark: form.colorParte2DarkAuto ? 'auto' : form.colorParte2DarkHex,
        colorTerciario: form.colorTerciario
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
  <div class="max-w-4xl mx-auto space-y-6">
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
        <p class="text-sm text-muted">
          Así se va a ver con los colores que elegiste. Cada panel respeta su modo.
        </p>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          class="rounded-lg p-6 border border-default"
          :style="{ background: fondoLightEff }"
        >
          <div class="flex items-center gap-2 mb-3">
            <UIcon
              name="i-lucide-sun"
              :style="{ color: parte2LightPreview }"
            />
            <span
              class="text-sm font-medium"
              :style="{ color: parte2LightPreview }"
            >Modo claro</span>
          </div>
          <div class="flex items-center justify-center gap-2">
            <span
              class="text-2xl font-bold"
              :style="{ color: form.colorPrimarioLight }"
            >{{ form.nombreParte1 }}</span>
            <span
              class="text-2xl font-bold"
              :style="{ color: parte2LightPreview }"
            >{{ form.nombreParte2 }}</span>
          </div>
          <div class="mt-3 flex justify-center">
            <span
              class="px-3 py-1 rounded text-sm font-medium text-white"
              :style="{ background: form.colorPrimarioLight }"
            >Botón ejemplo</span>
          </div>
        </div>
        <div
          class="rounded-lg p-6"
          :style="{ background: fondoDarkEff }"
        >
          <div class="flex items-center gap-2 mb-3">
            <UIcon
              name="i-lucide-moon"
              :style="{ color: parte2DarkPreview }"
            />
            <span
              class="text-sm font-medium"
              :style="{ color: parte2DarkPreview }"
            >Modo oscuro</span>
          </div>
          <div class="flex items-center justify-center gap-2">
            <span
              class="text-2xl font-bold"
              :style="{ color: form.colorPrimarioDark }"
            >{{ form.nombreParte1 }}</span>
            <span
              class="text-2xl font-bold"
              :style="{ color: parte2DarkPreview }"
            >{{ form.nombreParte2 }}</span>
          </div>
          <div class="mt-3 flex justify-center">
            <span
              class="px-3 py-1 rounded text-sm font-medium text-white"
              :style="{ background: form.colorPrimarioDark }"
            >Botón ejemplo</span>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Nombre del taller
        </h2>
        <p class="text-sm text-muted">
          Este nombre aparece en el logo del sidebar, login y en la pestaña del navegador.
        </p>
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
          Logo
        </h2>
        <p class="text-sm text-muted">
          Imagen PNG, JPG o SVG, máximo 2MB. Se muestra al lado del nombre en el header y en el login.
        </p>
      </template>

      <UAlert
        v-if="logoErrorMsg"
        class="mb-3"
        icon="i-lucide-circle-alert"
        color="error"
        variant="soft"
        :title="logoErrorMsg"
      />

      <div class="flex items-center gap-4 flex-wrap">
        <div class="h-16 w-32 flex items-center justify-center rounded-lg border border-default bg-elevated overflow-hidden">
          <img
            v-if="brand?.logoPath"
            :src="brand.logoPath"
            alt="Logo actual"
            class="max-h-full max-w-full object-contain"
          >
          <span
            v-else
            class="text-xs text-muted"
          >Sin logo</span>
        </div>
        <div class="flex items-center gap-2">
          <input
            ref="logoFileInput"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            class="hidden"
            @change="onLogoFileChange"
          >
          <UButton
            size="sm"
            color="primary"
            icon="i-lucide-upload"
            :loading="logoUploading"
            @click="logoFileInput?.click()"
          >
            {{ brand?.logoPath ? 'Cambiar logo' : 'Subir logo' }}
          </UButton>
          <UButton
            v-if="brand?.logoPath"
            size="sm"
            color="error"
            variant="outline"
            icon="i-lucide-trash-2"
            :loading="logoUploading"
            @click="quitarLogo"
          >
            Quitar
          </UButton>
        </div>
      </div>
    </UCard>

    <div class="flex items-center justify-end gap-2">
      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-arrow-right"
        @click="copiarLightADark"
      >
        Copiar claro → oscuro
      </UButton>
      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-arrow-left"
        @click="copiarDarkALight"
      >
        Copiar oscuro → claro
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-sun"
              class="size-5"
            />
            <h2 class="font-semibold">
              Modo claro
            </h2>
          </div>
        </template>
        <div class="space-y-5">
          <div>
            <p class="text-sm font-medium mb-2">
              Color principal
            </p>
            <div class="flex items-center gap-3">
              <input
                v-model="form.colorPrimarioLight"
                type="color"
                class="h-10 w-16 rounded border border-default cursor-pointer"
              >
              <UInput
                v-model="form.colorPrimarioLight"
                placeholder="#00A155"
                class="font-mono flex-1"
              />
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <button
                v-for="p in presetsPrimario"
                :key="'pl-' + p.hex"
                type="button"
                class="flex items-center gap-1.5 px-2 py-1 rounded-md border border-default hover:bg-elevated text-xs"
                @click="form.colorPrimarioLight = p.hex"
              >
                <span
                  class="inline-block w-3 h-3 rounded"
                  :style="{ background: p.hex }"
                />
                {{ p.label }}
              </button>
            </div>
            <div class="flex items-center gap-2 text-xs mt-2">
              <UIcon
                :name="contrasteLightOk ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'"
                :class="contrasteLightOk ? 'text-success' : 'text-warning'"
              />
              <span :class="contrasteLightOk ? 'text-success' : 'text-warning'">
                Contraste: {{ contrasteLight.toFixed(2) }}{{ !contrasteLightOk ? ' (bajo)' : '' }}
              </span>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium mb-2">
              Color "{{ form.nombreParte2 }}" (parte 2)
            </p>
            <UCheckbox
              v-model="form.colorParte2LightAuto"
              label="Automático (negro)"
            />
            <div
              v-if="!form.colorParte2LightAuto"
              class="flex items-center gap-3 mt-2"
            >
              <input
                v-model="form.colorParte2LightHex"
                type="color"
                class="h-10 w-16 rounded border border-default cursor-pointer"
              >
              <UInput
                v-model="form.colorParte2LightHex"
                placeholder="#0f172a"
                class="font-mono flex-1"
              />
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-moon"
              class="size-5"
            />
            <h2 class="font-semibold">
              Modo oscuro
            </h2>
          </div>
        </template>
        <div class="space-y-5">
          <div>
            <p class="text-sm font-medium mb-2">
              Color principal
            </p>
            <div class="flex items-center gap-3">
              <input
                v-model="form.colorPrimarioDark"
                type="color"
                class="h-10 w-16 rounded border border-default cursor-pointer"
              >
              <UInput
                v-model="form.colorPrimarioDark"
                placeholder="#00A155"
                class="font-mono flex-1"
              />
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <button
                v-for="p in presetsPrimario"
                :key="'pd-' + p.hex"
                type="button"
                class="flex items-center gap-1.5 px-2 py-1 rounded-md border border-default hover:bg-elevated text-xs"
                @click="form.colorPrimarioDark = p.hex"
              >
                <span
                  class="inline-block w-3 h-3 rounded"
                  :style="{ background: p.hex }"
                />
                {{ p.label }}
              </button>
            </div>
            <div class="flex items-center gap-2 text-xs mt-2">
              <UIcon
                :name="contrasteDarkOk ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'"
                :class="contrasteDarkOk ? 'text-success' : 'text-warning'"
              />
              <span :class="contrasteDarkOk ? 'text-success' : 'text-warning'">
                Contraste: {{ contrasteDark.toFixed(2) }}{{ !contrasteDarkOk ? ' (bajo)' : '' }}
              </span>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium mb-2">
              Color "{{ form.nombreParte2 }}" (parte 2)
            </p>
            <UCheckbox
              v-model="form.colorParte2DarkAuto"
              label="Automático (blanco)"
            />
            <div
              v-if="!form.colorParte2DarkAuto"
              class="flex items-center gap-3 mt-2"
            >
              <input
                v-model="form.colorParte2DarkHex"
                type="color"
                class="h-10 w-16 rounded border border-default cursor-pointer"
              >
              <UInput
                v-model="form.colorParte2DarkHex"
                placeholder="#f8fafc"
                class="font-mono flex-1"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Color terciario (fondo, menú y paneles)
        </h2>
        <p class="text-sm text-muted">
          El tono neutro de toda la app: el fondo de la página, el menú lateral, la barra
          superior y las tarjetas. En modo claro el fondo queda un gris suave (no blanco puro)
          para no cansar la vista y las tarjetas resaltan en blanco; en oscuro, el tono
          profundo que ya conocés. Una sola elección sirve para ambos modos.
        </p>
      </template>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in presetsTerciario"
          :key="p.key"
          type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
          :class="form.colorTerciario === p.key ? 'border-primary ring-2 ring-primary/30' : 'border-default hover:bg-elevated'"
          @click="form.colorTerciario = p.key"
        >
          <span class="flex shrink-0">
            <span
              class="inline-block w-4 h-6 rounded-l border border-default"
              :style="{ background: p.sampleLight }"
            />
            <span
              class="inline-block w-4 h-6 rounded-r border border-l-0 border-default"
              :style="{ background: p.sampleDark }"
            />
          </span>
          <span class="text-sm font-medium">{{ p.label }}</span>
        </button>
      </div>
    </UCard>

    <div class="flex justify-end gap-2 sticky bottom-2 bg-default/80 backdrop-blur p-2 rounded-lg">
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
