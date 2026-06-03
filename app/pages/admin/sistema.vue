<script setup lang="ts">
definePageMeta({ middleware: 'admin', title: 'Sistema' })

interface AppVersion { version: string, sha: string, builtAt: string }
interface VersionResponse {
  current: AppVersion
  updateAvailable: boolean
  lastCheck: string | null
}
interface UpdateStatus {
  phase: string
  result?: string
  oldSha?: string
  targetSha?: string
  startedAt?: string
  finishedAt?: string
  message?: string
}

const { data: info, refresh: refreshVersion } = await useFetch<VersionResponse>('/api/admin/sistema/version')

const status = ref<UpdateStatus>({ phase: 'idle' })
const polling = ref(false)
const reconnecting = ref(false)
const checking = ref(false)
const showConfirm = ref(false)
const actionError = ref('')

// watchingRun: pedimos un update y lo seguimos hasta el resultado. prevStartedAt
// guarda el startedAt de la corrida anterior para distinguir cuándo arrancó la nueva
// (evita cortar el polling al leer un status viejo antes de que el agente arranque).
const watchingRun = ref(false)
const prevStartedAt = ref<string | undefined>(undefined)
const TERMINAL_PHASES = ['done', 'rolled_back', 'failed', 'up_to_date']
// Resultado de la corrida recién terminada EN ESTA SESIÓN. Mientras esté seteado,
// la card muestra solo ese resultado (no el "hay update / al día"). Se limpia al
// volver a buscar actualizaciones.
const lastResult = ref<string | null>(null)

// Fases del pipeline en orden, con etiqueta amigable.
const STEPS = [
  { key: 'backing_up', label: 'Respaldando datos' },
  { key: 'pulling', label: 'Descargando' },
  { key: 'building', label: 'Compilando' },
  { key: 'restarting', label: 'Reiniciando' },
  { key: 'health_check', label: 'Verificando' }
]
const ACTIVE_PHASES = ['checking', 'backing_up', 'pulling', 'building', 'restarting', 'health_check']

const isUpdating = computed(() => ACTIVE_PHASES.includes(status.value.phase))
// Mostramos la tarjeta de progreso desde que pedimos el update hasta el resultado,
// aunque el server se reinicie o el agente tarde en arrancar.
const showProgress = computed(() => watchingRun.value || isUpdating.value)
// Prioridad de la card (cuando no hay progreso): si hay update genuinamente nuevo
// se ofrece (salvo que el último resultado sea un rollback/fallo, donde mostramos
// eso); si no, el resultado recién terminado; si no, "al día".
const showAvailable = computed(() =>
  !showProgress.value && !!info.value?.updateAvailable && (lastResult.value === null || lastResult.value === 'done')
)
const showResult = computed(() => !showProgress.value && lastResult.value !== null && !showAvailable.value)
const currentStepIndex = computed(() => STEPS.findIndex(s => s.key === status.value.phase))

function shortSha(sha?: string) {
  if (!sha || sha === 'dev') return sha || '—'
  return sha.slice(0, 7)
}

function versionLabel(version?: string) {
  if (!version || version === 'dev') return version || '—'
  return `v${version}`
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR')
}

let pollTimer: ReturnType<typeof setTimeout> | null = null

async function pollStatus() {
  try {
    status.value = await $fetch<UpdateStatus>('/api/admin/sistema/status')
    reconnecting.value = false
  } catch {
    // El server se está reiniciando (fase restarting) → seguimos intentando.
    reconnecting.value = true
  }

  // Terminó la corrida que pedimos (fase terminal y startedAt distinto al previo).
  const terminoNuestraCorrida = watchingRun.value && !reconnecting.value
    && TERMINAL_PHASES.includes(status.value.phase)
    && status.value.startedAt !== prevStartedAt.value
  if (terminoNuestraCorrida) {
    watchingRun.value = false
    polling.value = false
    lastResult.value = status.value.phase
    await refreshVersion()
    // Tras un update exitoso, re-chequeamos para que updateAvailable deje de
    // apuntar a la versión recién instalada (y detecte si hay otra más nueva).
    if (status.value.phase === 'done') runCheck().catch(() => {})
    return
  }

  if (watchingRun.value || isUpdating.value || reconnecting.value) {
    pollTimer = setTimeout(pollStatus, 2000)
  } else {
    polling.value = false
    await refreshVersion()
  }
}

function startPolling() {
  if (polling.value) return
  polling.value = true
  reconnecting.value = false
  pollStatus()
}

// Dispara el check en el host y refresca hasta que remote.json cambie (lastCheck).
async function runCheck() {
  const before = info.value?.lastCheck
  await $fetch('/api/admin/sistema/check', { method: 'POST' })
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 1500))
    await refreshVersion()
    if (info.value?.lastCheck && info.value.lastCheck !== before) break
  }
}

async function buscarActualizaciones() {
  actionError.value = ''
  lastResult.value = null // al volver a buscar, dejamos de mostrar el resultado anterior
  checking.value = true
  try {
    await runCheck()
  } catch (e: unknown) {
    actionError.value = (e as { data?: { message?: string } }).data?.message || 'No se pudo comprobar'
  } finally {
    checking.value = false
  }
}

async function confirmarActualizar() {
  actionError.value = ''
  lastResult.value = null
  try {
    prevStartedAt.value = status.value.startedAt // startedAt de la corrida anterior
    await $fetch('/api/admin/sistema/update', { method: 'POST' })
    showConfirm.value = false
    watchingRun.value = true
    status.value = { phase: 'checking', message: 'Iniciando…' }
    startPolling()
  } catch (e: unknown) {
    actionError.value = (e as { data?: { message?: string } }).data?.message || 'No se pudo iniciar la actualización'
  }
}

onMounted(async () => {
  // Si entramos con un update ya en curso, retomamos el seguimiento.
  try {
    status.value = await $fetch<UpdateStatus>('/api/admin/sistema/status')
    if (isUpdating.value) {
      prevStartedAt.value = undefined // cualquier fase terminal de esta corrida cuenta como nueva
      watchingRun.value = true
      startPolling()
    }
  } catch { /* ignore */ }
})

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
      Sistema
    </h1>

    <!-- Versión actual -->
    <UCard>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Versión instalada
          </p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ versionLabel(info?.current.version) }}
          </p>
          <p class="text-xs text-gray-400">
            Compilada: {{ fmtDate(info?.current.builtAt) }}
          </p>
          <p class="text-xs text-gray-400 font-mono">
            Commit: {{ shortSha(info?.current.sha) }}
          </p>
        </div>
        <UButton
          label="Buscar actualizaciones"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="subtle"
          :loading="checking"
          :disabled="showProgress"
          @click="buscarActualizaciones"
        />
      </div>
    </UCard>

    <UAlert
      v-if="actionError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      :title="actionError"
    />

    <!-- 1) Hay una actualización genuinamente nueva → ofrecerla (prioridad) -->
    <UCard v-if="showAvailable">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-sparkles"
            class="size-6 text-primary shrink-0 mt-0.5"
          />
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">
              Hay una versión nueva disponible
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Al actualizar, la app se va a reiniciar. Puede tardar 1–2 minutos.
            </p>
          </div>
        </div>
        <UButton
          label="Actualizar ahora"
          icon="i-lucide-download"
          @click="showConfirm = true"
        />
      </div>
    </UCard>

    <!-- 2) Resultado de la corrida recién terminada (esta sesión) -->
    <UCard v-else-if="showResult">
      <UAlert
        v-if="lastResult === 'done'"
        color="success"
        variant="subtle"
        icon="i-lucide-check"
        :title="status.message || 'Actualización completada.'"
      />
      <UAlert
        v-else-if="lastResult === 'rolled_back'"
        color="warning"
        variant="subtle"
        icon="i-lucide-undo-2"
        :title="status.message || 'Se restauró la versión anterior.'"
      />
      <UAlert
        v-else-if="lastResult === 'failed'"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="status.message || 'La actualización falló.'"
      />
      <UAlert
        v-else
        color="info"
        variant="subtle"
        icon="i-lucide-check"
        :title="status.message || 'Ya estabas en la última versión.'"
      />
    </UCard>

    <!-- 3) Al día -->
    <UCard v-else-if="!showProgress">
      <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <UIcon
          name="i-lucide-check-circle-2"
          class="size-5 text-green-500"
        />
        <span>Estás en la última versión.</span>
        <span
          v-if="info?.lastCheck"
          class="text-xs text-gray-400"
        >
          (comprobado {{ fmtDate(info.lastCheck) }})
        </span>
      </div>
    </UCard>

    <!-- Progreso del update en curso -->
    <UCard v-else>
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 text-primary animate-spin"
          />
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">
              Actualizando la aplicación…
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ reconnecting ? 'Reiniciando, reconectando…' : (status.message || '') }}
            </p>
          </div>
        </div>

        <ul class="space-y-2">
          <li
            v-for="(step, i) in STEPS"
            :key="step.key"
            class="flex items-center gap-3 text-sm"
          >
            <UIcon
              v-if="currentStepIndex > i"
              name="i-lucide-check-circle-2"
              class="size-5 text-green-500 shrink-0"
            />
            <UIcon
              v-else-if="currentStepIndex === i"
              name="i-lucide-loader-circle"
              class="size-5 text-primary animate-spin shrink-0"
            />
            <UIcon
              v-else
              name="i-lucide-circle"
              class="size-5 text-gray-300 dark:text-gray-600 shrink-0"
            />
            <span
              :class="currentStepIndex >= i ? 'text-gray-900 dark:text-white' : 'text-gray-400'"
            >
              {{ step.label }}
            </span>
          </li>
        </ul>

        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-info"
          title="No cierres esta ventana ni apagues el equipo hasta que termine."
        />
      </div>
    </UCard>

    <!-- Modal de confirmación -->
    <UModal v-model:open="showConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            ¿Actualizar la aplicación?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Se hará un respaldo de los datos y la app se reiniciará. Puede tardar
            1–2 minutos. Si algo sale mal, se restaura sola la versión anterior.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              @click="showConfirm = false"
            />
            <UButton
              label="Actualizar ahora"
              icon="i-lucide-download"
              @click="confirmarActualizar"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
