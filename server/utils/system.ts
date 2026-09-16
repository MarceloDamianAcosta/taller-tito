import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import type { H3Event } from 'h3'

// Canal de control compartido con el agente host (auto-update). En prod es el
// bind mount ./control:/app/control; en dev es <proyecto>/control. version.json
// lo hornea el Dockerfile en build (en dev no existe → 'dev').
const CONTROL_DIR = join(process.cwd(), 'control')
const VERSION_FILE = join(process.cwd(), 'version.json')

// Fases que escribe taller-updater.sh mientras corre. Las terminales no.
export const ACTIVE_PHASES = ['checking', 'backing_up', 'pulling', 'building', 'restarting', 'health_check'] as const
// Fases activas de taller-port.sh (cambio de puerto).
export const ACTIVE_PORT_PHASES = ['applying', 'health_check', 'restarting'] as const

export interface AppVersion {
  version: string
  sha: string
  builtAt: string
}

export interface RemoteInfo {
  branch: string
  localSha: string
  remoteSha: string
  updateAvailable: boolean
  checkedAt: string
  error?: string
}

export interface UpdateStatus {
  phase: string
  result?: string
  oldSha?: string
  targetSha?: string
  startedAt?: string
  finishedAt?: string
  message?: string
}

export interface BackupStatus {
  phase: string
  result?: string
  fileName?: string
  startedAt?: string
  finishedAt?: string
  message?: string
}

export interface PortStatus {
  phase: string
  result?: string
  oldPort?: number
  targetPort?: number | null
  startedAt?: string
  finishedAt?: string
  message?: string
}

// Fases activas de taller-restore.sh (restaurar un backup subido desde la app).
export const ACTIVE_RESTORE_PHASES = ['backing_up', 'restoring', 'health_check'] as const

export interface RestoreStatus {
  phase: string
  result?: string
  preRestoreBackup?: string
  startedAt?: string
  finishedAt?: string
  message?: string
}

export async function requireAdmin(event: H3Event) {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })
  return session.user
}

export function readVersion(): AppVersion {
  try {
    const parsed = JSON.parse(readFileSync(VERSION_FILE, 'utf8')) as Partial<AppVersion>
    return { version: parsed.version || 'dev', sha: parsed.sha || 'dev', builtAt: parsed.builtAt || '' }
  } catch {
    return { version: 'dev', sha: 'dev', builtAt: '' }
  }
}

export function readControl<T>(name: string): T | null {
  const p = join(CONTROL_DIR, name)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    return null
  }
}

// Escritura atómica (tmp + rename) para que el agente nunca lea un JSON a medias.
export function writeRequest(name: string, payload: Record<string, unknown>) {
  mkdirSync(CONTROL_DIR, { recursive: true })
  const p = join(CONTROL_DIR, name)
  const tmp = `${p}.tmp`
  writeFileSync(tmp, JSON.stringify(payload))
  renameSync(tmp, p)
}

// Update, backup manual, cambio de puerto y restore tocan el mismo contenedor
// `prod` desde el host — solo uno a la vez. Antes de disparar cualquiera de los
// cuatro, chequear que no haya otro corriendo.
export function anyOperationActive(): string | null {
  const update = readControl<UpdateStatus>('status.json')
  if (update?.phase && (ACTIVE_PHASES as readonly string[]).includes(update.phase)) {
    return 'Hay una actualización en curso'
  }
  const backup = readControl<BackupStatus>('backup-status.json')
  if (backup?.phase === 'running') {
    return 'Hay un backup en curso'
  }
  const port = readControl<PortStatus>('port-status.json')
  if (port?.phase && (ACTIVE_PORT_PHASES as readonly string[]).includes(port.phase)) {
    return 'Hay un cambio de puerto en curso'
  }
  const restore = readControl<RestoreStatus>('restore-status.json')
  if (restore?.phase && (ACTIVE_RESTORE_PHASES as readonly string[]).includes(restore.phase)) {
    return 'Hay una restauración en curso'
  }
  return null
}

// P llega al proceso vía `env_file: .env` en docker-compose.yml — así el server
// sabe en qué puerto lo está publicando el host sin tener que preguntarle.
export function currentPort(): number {
  const p = Number(process.env.P)
  return Number.isInteger(p) && p > 0 ? p : 3000
}
