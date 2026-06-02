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

export interface AppVersion {
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

export async function requireAdmin(event: H3Event) {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })
  return session.user
}

export function readVersion(): AppVersion {
  try {
    return JSON.parse(readFileSync(VERSION_FILE, 'utf8')) as AppVersion
  } catch {
    return { sha: 'dev', builtAt: '' }
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
