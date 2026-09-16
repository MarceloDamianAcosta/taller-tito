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
interface BackupEntry {
  name: string
  dbFile: string
  dbSize: number
  uploadsFile: string | null
  uploadsSize: number | null
  mtime: string
}
interface BackupStatus {
  phase: string
  result?: string
  fileName?: string
  startedAt?: string
  finishedAt?: string
  message?: string
}
interface PortStatus {
  phase: string
  result?: string
  oldPort?: number
  targetPort?: number | null
  startedAt?: string
  finishedAt?: string
  message?: string
}
interface PortInfo {
  current: number
  status: PortStatus
}
interface RestoreStatus {
  phase: string
  result?: string
  preRestoreBackup?: string
  startedAt?: string
  finishedAt?: string
  message?: string
}
interface RestorePending {
  dbSize: number
  hasUploads: boolean
  uploadsSize: number | null
}
interface RestoreStatusResponse {
  status: RestoreStatus
  pending: RestorePending | null
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

function fmtSize(bytes: number | null) {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
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

// ── Backups (listado + backup manual) ───────────────────────────────────────
const { data: backups, refresh: refreshBackups } = await useFetch<BackupEntry[]>('/api/admin/sistema/backups')

const backupStatus = ref<BackupStatus>({ phase: 'idle' })
const backupPolling = ref(false)
const backupReconnecting = ref(false)
const backupWatching = ref(false)
const backupPrevStartedAt = ref<string | undefined>(undefined)
const backupResult = ref<string | null>(null)
const backupError = ref('')
const showBackupConfirm = ref(false)
const BACKUP_TERMINAL_PHASES = ['done', 'failed']

const isBackingUp = computed(() => backupStatus.value.phase === 'running')
const showBackupProgress = computed(() => backupWatching.value || isBackingUp.value)

let backupPollTimer: ReturnType<typeof setTimeout> | null = null

async function pollBackupStatus() {
  try {
    backupStatus.value = await $fetch<BackupStatus>('/api/admin/sistema/backup-status')
    backupReconnecting.value = false
  } catch {
    backupReconnecting.value = true
  }

  const terminoNuestraCorrida = backupWatching.value && !backupReconnecting.value
    && BACKUP_TERMINAL_PHASES.includes(backupStatus.value.phase)
    && backupStatus.value.startedAt !== backupPrevStartedAt.value
  if (terminoNuestraCorrida) {
    backupWatching.value = false
    backupPolling.value = false
    backupResult.value = backupStatus.value.phase
    await refreshBackups()
    return
  }

  if (backupWatching.value || isBackingUp.value || backupReconnecting.value) {
    backupPollTimer = setTimeout(pollBackupStatus, 2000)
  } else {
    backupPolling.value = false
  }
}

function startBackupPolling() {
  if (backupPolling.value) return
  backupPolling.value = true
  backupReconnecting.value = false
  pollBackupStatus()
}

async function confirmarBackup() {
  backupError.value = ''
  backupResult.value = null
  try {
    backupPrevStartedAt.value = backupStatus.value.startedAt
    await $fetch('/api/admin/sistema/backup', { method: 'POST' })
    showBackupConfirm.value = false
    backupWatching.value = true
    backupStatus.value = { phase: 'running', message: 'Iniciando…' }
    startBackupPolling()
  } catch (e: unknown) {
    backupError.value = (e as { data?: { message?: string } }).data?.message || 'No se pudo iniciar el backup'
  }
}

// ── Puerto de la app ─────────────────────────────────────────────────────────
const { data: portInfo } = await useFetch<PortInfo>('/api/admin/sistema/port-status')

const portStatus = ref<PortStatus>(portInfo.value?.status ?? { phase: 'idle' })
const portPolling = ref(false)
const portReconnecting = ref(false)
const portWatching = ref(false)
const portPrevStartedAt = ref<string | undefined>(undefined)
const portResult = ref<string | null>(null)
const portError = ref('')
const showPortConfirm = ref(false)
const portInput = ref<number | null>(null)
const PORT_ACTIVE_PHASES = ['applying', 'health_check', 'restarting']
const PORT_TERMINAL_PHASES = ['done', 'rolled_back', 'failed']
const PORT_REDIRECT_SECONDS = 40

// Una vez que se pide el cambio, la propia pestaña queda apuntando al puerto
// VIEJO: cuando el contenedor se recrea, ese puerto deja de existir del todo
// (no es un reinicio en el mismo puerto como un update) y el polling de estado
// nunca va a poder "terminar bien" desde acá. Por eso, en paralelo, armamos una
// cuenta regresiva fija que redirige solo a la URL con el puerto nuevo.
const redirectCountdown = ref<number | null>(null)
const redirectTarget = ref('')
let redirectTimer: ReturnType<typeof setInterval> | null = null

function startRedirectCountdown(port: number) {
  redirectTarget.value = `${window.location.protocol}//${window.location.hostname}:${port}${window.location.pathname}`
  redirectCountdown.value = PORT_REDIRECT_SECONDS
  if (redirectTimer) clearInterval(redirectTimer)
  redirectTimer = setInterval(() => {
    if (redirectCountdown.value === null) return
    redirectCountdown.value -= 1
    if (redirectCountdown.value <= 0) {
      clearInterval(redirectTimer!)
      window.location.href = redirectTarget.value
    }
  }, 1000)
}

const isPortChanging = computed(() => PORT_ACTIVE_PHASES.includes(portStatus.value.phase))
const showPortProgress = computed(() => portWatching.value || isPortChanging.value)

let portPollTimer: ReturnType<typeof setTimeout> | null = null

async function pollPortStatus() {
  try {
    const p = await $fetch<PortInfo>('/api/admin/sistema/port-status')
    portInfo.value = p
    portStatus.value = p.status
    portReconnecting.value = false
  } catch {
    portReconnecting.value = true
  }

  const terminoNuestraCorrida = portWatching.value && !portReconnecting.value
    && PORT_TERMINAL_PHASES.includes(portStatus.value.phase)
    && portStatus.value.startedAt !== portPrevStartedAt.value
  if (terminoNuestraCorrida) {
    portWatching.value = false
    portPolling.value = false
    portResult.value = portStatus.value.phase
    return
  }

  if (portWatching.value || isPortChanging.value || portReconnecting.value) {
    portPollTimer = setTimeout(pollPortStatus, 2000)
  } else {
    portPolling.value = false
  }
}

function startPortPolling() {
  if (portPolling.value) return
  portPolling.value = true
  portReconnecting.value = false
  pollPortStatus()
}

function abrirConfirmarPuerto() {
  portError.value = ''
  if (!portInput.value || !Number.isInteger(portInput.value) || portInput.value < 1 || portInput.value > 65535) {
    portError.value = 'Puerto inválido (1-65535)'
    return
  }
  if (portInput.value === portInfo.value?.current) {
    portError.value = 'Ya está usando ese puerto'
    return
  }
  showPortConfirm.value = true
}

async function confirmarPuerto() {
  portError.value = ''
  portResult.value = null
  try {
    portPrevStartedAt.value = portStatus.value.startedAt
    const targetPort = portInput.value!
    await $fetch('/api/admin/sistema/port', { method: 'POST', body: { port: targetPort } })
    showPortConfirm.value = false
    portWatching.value = true
    portStatus.value = { phase: 'applying', message: 'Iniciando…' }
    startPortPolling()
    startRedirectCountdown(targetPort)
  } catch (e: unknown) {
    portError.value = (e as { data?: { message?: string } }).data?.message || 'No se pudo iniciar el cambio de puerto'
  }
}

// ── Restaurar un backup subido ──────────────────────────────────────────────
const { data: restoreInfo, refresh: refreshRestoreInfo } = await useFetch<RestoreStatusResponse>('/api/admin/sistema/restore-status')

const restoreStatus = ref<RestoreStatus>(restoreInfo.value?.status ?? { phase: 'idle' })
const restorePending = ref<RestorePending | null>(restoreInfo.value?.pending ?? null)
const restoreDbFile = ref<File | null>(null)
const restoreUploadsFile = ref<File | null>(null)
const restoreDbInputEl = ref<HTMLInputElement | null>(null)
const restoreUploadsInputEl = ref<HTMLInputElement | null>(null)
const restoreUploading = ref(false)
const restoreError = ref('')
const showRestoreConfirm = ref(false)
const restoreConfirmText = ref('')
const restorePolling = ref(false)
const restoreReconnecting = ref(false)
const restoreWatching = ref(false)
const restorePrevStartedAt = ref<string | undefined>(undefined)
const restoreResult = ref<string | null>(null)

const RESTORE_STEPS = [
  { key: 'backing_up', label: 'Respaldando el estado actual' },
  { key: 'restoring', label: 'Restaurando' },
  { key: 'health_check', label: 'Verificando' }
]
const RESTORE_ACTIVE_PHASES = ['backing_up', 'restoring', 'health_check']
const RESTORE_TERMINAL_PHASES = ['done', 'failed']

const isRestoring = computed(() => RESTORE_ACTIVE_PHASES.includes(restoreStatus.value.phase))
const showRestoreProgress = computed(() => restoreWatching.value || isRestoring.value)
const restoreStepIndex = computed(() => RESTORE_STEPS.findIndex(s => s.key === restoreStatus.value.phase))

let restorePollTimer: ReturnType<typeof setTimeout> | null = null

function onRestoreDbChange(e: Event) {
  restoreDbFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}
function onRestoreUploadsChange(e: Event) {
  restoreUploadsFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function subirRestore() {
  restoreError.value = ''
  if (!restoreDbFile.value) {
    restoreError.value = 'Elegí el archivo .db'
    return
  }
  restoreUploading.value = true
  try {
    const fd = new FormData()
    fd.append('db', restoreDbFile.value)
    if (restoreUploadsFile.value) fd.append('uploads', restoreUploadsFile.value)
    await $fetch('/api/admin/sistema/restore-upload', { method: 'POST', body: fd })
    await refreshRestoreInfo()
    restorePending.value = restoreInfo.value?.pending ?? null
    restoreDbFile.value = null
    restoreUploadsFile.value = null
  } catch (e: unknown) {
    restoreError.value = (e as { data?: { message?: string } }).data?.message || 'No se pudo subir el archivo'
  } finally {
    restoreUploading.value = false
  }
}

async function pollRestoreStatus() {
  try {
    const r = await $fetch<RestoreStatusResponse>('/api/admin/sistema/restore-status')
    restoreStatus.value = r.status
    restorePending.value = r.pending
    restoreReconnecting.value = false
  } catch {
    restoreReconnecting.value = true
  }

  const terminoNuestraCorrida = restoreWatching.value && !restoreReconnecting.value
    && RESTORE_TERMINAL_PHASES.includes(restoreStatus.value.phase)
    && restoreStatus.value.startedAt !== restorePrevStartedAt.value
  if (terminoNuestraCorrida) {
    restoreWatching.value = false
    restorePolling.value = false
    restoreResult.value = restoreStatus.value.phase
    await refreshBackups()
    return
  }

  if (restoreWatching.value || isRestoring.value || restoreReconnecting.value) {
    restorePollTimer = setTimeout(pollRestoreStatus, 2000)
  } else {
    restorePolling.value = false
  }
}

function startRestorePolling() {
  if (restorePolling.value) return
  restorePolling.value = true
  restoreReconnecting.value = false
  pollRestoreStatus()
}

async function confirmarRestore() {
  restoreError.value = ''
  restoreResult.value = null
  try {
    restorePrevStartedAt.value = restoreStatus.value.startedAt
    await $fetch('/api/admin/sistema/restore', { method: 'POST', body: { confirm: restoreConfirmText.value } })
    showRestoreConfirm.value = false
    restoreConfirmText.value = ''
    restoreWatching.value = true
    restoreStatus.value = { phase: 'backing_up', message: 'Iniciando…' }
    startRestorePolling()
  } catch (e: unknown) {
    restoreError.value = (e as { data?: { message?: string } }).data?.message || 'No se pudo iniciar el restore'
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

  // Ídem para un backup manual ya en curso.
  try {
    backupStatus.value = await $fetch<BackupStatus>('/api/admin/sistema/backup-status')
    if (isBackingUp.value) {
      backupPrevStartedAt.value = undefined
      backupWatching.value = true
      startBackupPolling()
    }
  } catch { /* ignore */ }

  // Ídem para un cambio de puerto ya en curso.
  try {
    const p = await $fetch<PortInfo>('/api/admin/sistema/port-status')
    portInfo.value = p
    portStatus.value = p.status
    if (isPortChanging.value) {
      portPrevStartedAt.value = undefined
      portWatching.value = true
      startPortPolling()
    }
  } catch { /* ignore */ }

  // Ídem para un restore ya en curso.
  try {
    const r = await $fetch<RestoreStatusResponse>('/api/admin/sistema/restore-status')
    restoreStatus.value = r.status
    restorePending.value = r.pending
    if (isRestoring.value) {
      restorePrevStartedAt.value = undefined
      restoreWatching.value = true
      startRestorePolling()
    }
  } catch { /* ignore */ }
})

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
  if (backupPollTimer) clearTimeout(backupPollTimer)
  if (portPollTimer) clearTimeout(portPollTimer)
  if (restorePollTimer) clearTimeout(restorePollTimer)
  if (redirectTimer) clearInterval(redirectTimer)
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

    <!-- Respaldos -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h2 class="font-semibold text-gray-900 dark:text-white">
            Respaldos
          </h2>
          <UButton
            label="Hacer backup ahora"
            icon="i-lucide-database-backup"
            color="neutral"
            variant="subtle"
            :loading="isBackingUp"
            :disabled="showBackupProgress || showProgress || showPortProgress || showRestoreProgress"
            @click="showBackupConfirm = true"
          />
        </div>
      </template>

      <UAlert
        v-if="backupError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="backupError"
        class="mb-4"
      />

      <div
        v-if="showBackupProgress"
        class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 py-2"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 text-primary animate-spin shrink-0"
        />
        <span>{{ backupReconnecting ? 'Reiniciando, reconectando…' : (backupStatus.message || 'Respaldando…') }}</span>
      </div>

      <template v-else>
        <UAlert
          v-if="backupResult === 'done'"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          :title="backupStatus.message || 'Backup completado.'"
          class="mb-4"
        />
        <UAlert
          v-else-if="backupResult === 'failed'"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="backupStatus.message || 'El backup falló.'"
          class="mb-4"
        />

        <div
          v-if="backups && backups.length"
          class="divide-y divide-gray-200 dark:divide-gray-700"
        >
          <div
            v-for="b in backups"
            :key="b.name"
            class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white font-mono">
                {{ b.name }}
              </p>
              <p class="text-xs text-gray-400">
                {{ fmtDate(b.mtime) }} · {{ fmtSize(b.dbSize) }}<span v-if="b.uploadsFile"> + {{ fmtSize(b.uploadsSize) }} de archivos</span>
              </p>
            </div>
            <div class="flex gap-3 text-sm">
              <a
                :href="`/api/admin/sistema/backups/${b.dbFile}`"
                target="_blank"
                class="text-primary hover:underline"
              >
                Descargar DB
              </a>
              <a
                v-if="b.uploadsFile"
                :href="`/api/admin/sistema/backups/${b.uploadsFile}`"
                target="_blank"
                class="text-primary hover:underline"
              >
                Descargar archivos
              </a>
            </div>
          </div>
        </div>
        <p
          v-else
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          Todavía no hay backups.
        </p>
      </template>
    </UCard>

    <!-- Modal de confirmación de backup -->
    <UModal v-model:open="showBackupConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            ¿Hacer un backup ahora?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            La app se desconecta un momento mientras se respalda la base de datos y
            los archivos adjuntos. Vuelve sola cuando termina.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              @click="showBackupConfirm = false"
            />
            <UButton
              label="Hacer backup"
              icon="i-lucide-database-backup"
              @click="confirmarBackup"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Puerto -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-900 dark:text-white">
          Puerto de la app
        </h2>
      </template>

      <UAlert
        v-if="portError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="portError"
        class="mb-4"
      />

      <div
        v-if="showPortProgress"
        class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 py-2"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 text-primary animate-spin shrink-0"
        />
        <span>{{ portReconnecting ? 'Reiniciando, reconectando…' : (portStatus.message || 'Aplicando…') }}</span>
      </div>

      <UAlert
        v-if="redirectCountdown !== null"
        color="info"
        variant="subtle"
        icon="i-lucide-clock"
        class="mb-4"
      >
        <template #title>
          Te vamos a redirigir en {{ redirectCountdown }}s a
          <a
            :href="redirectTarget"
            class="font-mono underline"
          >{{ redirectTarget }}</a>
        </template>
        <template #description>
          Si carga en blanco o da error, esperá unos segundos más y actualizá esa página vos mismo — todavía puede estar terminando de arrancar.
        </template>
      </UAlert>

      <template v-else>
        <UAlert
          v-if="portResult === 'done'"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          :title="portStatus.message || 'Puerto cambiado.'"
          class="mb-4"
        />
        <UAlert
          v-else-if="portResult === 'rolled_back'"
          color="warning"
          variant="subtle"
          icon="i-lucide-undo-2"
          :title="portStatus.message || 'No respondió; se mantuvo el puerto anterior.'"
          class="mb-4"
        />
        <UAlert
          v-else-if="portResult === 'failed'"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="portStatus.message || 'Falló el cambio de puerto.'"
          class="mb-4"
        />

        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Puerto actual
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ portInfo?.current ?? '—' }}
            </p>
          </div>
          <UInput
            v-model.number="portInput"
            type="number"
            min="1"
            max="65535"
            placeholder="Puerto nuevo"
            class="sm:w-40"
          />
          <UButton
            label="Cambiar puerto"
            icon="i-lucide-plug"
            :disabled="showProgress || showBackupProgress || showRestoreProgress"
            @click="abrirConfirmarPuerto"
          />
        </div>
      </template>
    </UCard>

    <!-- Modal de confirmación de puerto -->
    <UModal v-model:open="showPortConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            ¿Cambiar el puerto a {{ portInput }}?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            La app se reinicia para aplicarlo — vas a tener que volver a entrar
            usando <span class="font-mono">:{{ portInput }}</span> en la dirección.
            Si el puerto nuevo no responde, se restaura solo el anterior.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              @click="showPortConfirm = false"
            />
            <UButton
              label="Cambiar puerto"
              icon="i-lucide-plug"
              @click="confirmarPuerto"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Restaurar backup -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-gray-900 dark:text-white">
          Restaurar backup
        </h2>
      </template>

      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Esto reemplaza TODOS los datos actuales. Antes se hace un backup automático del estado previo, por si hay que deshacerlo."
        class="mb-4"
      />

      <UAlert
        v-if="restoreError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        :title="restoreError"
        class="mb-4"
      />

      <div
        v-if="showRestoreProgress"
        class="space-y-4"
      >
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 text-primary animate-spin shrink-0"
          />
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">
              Restaurando…
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ restoreReconnecting ? 'Reiniciando, reconectando…' : (restoreStatus.message || '') }}
            </p>
          </div>
        </div>

        <ul class="space-y-2">
          <li
            v-for="(step, i) in RESTORE_STEPS"
            :key="step.key"
            class="flex items-center gap-3 text-sm"
          >
            <UIcon
              v-if="restoreStepIndex > i"
              name="i-lucide-check-circle-2"
              class="size-5 text-green-500 shrink-0"
            />
            <UIcon
              v-else-if="restoreStepIndex === i"
              name="i-lucide-loader-circle"
              class="size-5 text-primary animate-spin shrink-0"
            />
            <UIcon
              v-else
              name="i-lucide-circle"
              class="size-5 text-gray-300 dark:text-gray-600 shrink-0"
            />
            <span
              :class="restoreStepIndex >= i ? 'text-gray-900 dark:text-white' : 'text-gray-400'"
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

      <template v-else>
        <UAlert
          v-if="restoreResult === 'done'"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          :title="restoreStatus.message || 'Restore completado.'"
          class="mb-4"
        />
        <UAlert
          v-else-if="restoreResult === 'failed'"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="restoreStatus.message || 'Falló el restore.'"
          class="mb-4"
        />

        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Base de datos (.db)
            </p>
            <input
              ref="restoreDbInputEl"
              type="file"
              accept=".db,application/x-sqlite3,application/vnd.sqlite3,application/octet-stream"
              class="hidden"
              :disabled="showProgress || showBackupProgress || showPortProgress"
              @change="onRestoreDbChange"
            >
            <UButton
              :label="restoreDbFile?.name || 'Elegir archivo .db'"
              icon="i-lucide-file-up"
              color="neutral"
              variant="subtle"
              :disabled="showProgress || showBackupProgress || showPortProgress"
              @click="restoreDbInputEl?.click()"
            />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Archivos adjuntos (opcional, .tar.gz)
            </p>
            <input
              ref="restoreUploadsInputEl"
              type="file"
              accept=".tar.gz,.gz,application/gzip,application/x-gzip"
              class="hidden"
              :disabled="showProgress || showBackupProgress || showPortProgress"
              @change="onRestoreUploadsChange"
            >
            <UButton
              :label="restoreUploadsFile?.name || 'Elegir archivo .tar.gz (opcional)'"
              icon="i-lucide-file-up"
              color="neutral"
              variant="subtle"
              :disabled="showProgress || showBackupProgress || showPortProgress"
              @click="restoreUploadsInputEl?.click()"
            />
          </div>
          <UButton
            label="Subir"
            icon="i-lucide-upload"
            color="neutral"
            variant="subtle"
            :loading="restoreUploading"
            :disabled="!restoreDbFile || showProgress || showBackupProgress || showPortProgress"
            @click="subirRestore"
          />

          <div
            v-if="restorePending"
            class="pt-3 border-t border-gray-200 dark:border-gray-700"
          >
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Listo para restaurar: {{ fmtSize(restorePending.dbSize) }}<span v-if="restorePending.hasUploads"> + {{ fmtSize(restorePending.uploadsSize) }} de archivos</span>
            </p>
            <UButton
              label="Restaurar ahora"
              icon="i-lucide-triangle-alert"
              color="error"
              class="mt-2"
              :disabled="showProgress || showBackupProgress || showPortProgress"
              @click="showRestoreConfirm = true"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- Modal de confirmación de restore -->
    <UModal v-model:open="showRestoreConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            ¿Restaurar este backup?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Esto reemplaza la base de datos y los archivos actuales por los que subiste.
            Se guarda un backup automático de antes de restaurar, pero si te arrepentís
            tenés que restaurar ESE backup vos mismo — no hay un "deshacer" con un click.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Escribí <span class="font-mono font-semibold">RESTAURAR</span> para confirmar:
          </p>
          <UInput
            v-model="restoreConfirmText"
            placeholder="RESTAURAR"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              @click="showRestoreConfirm = false; restoreConfirmText = ''"
            />
            <UButton
              label="Restaurar"
              icon="i-lucide-triangle-alert"
              color="error"
              :disabled="restoreConfirmText !== 'RESTAURAR'"
              @click="confirmarRestore"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
