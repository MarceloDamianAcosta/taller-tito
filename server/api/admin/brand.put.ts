import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index'
import { brandConfig } from '../../db/schema'
import { generateScale, hexToRgb } from '../../utils/color-scale'

const SLATE_SCALE = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617']

function parte2Scale(value: string): string[] {
  if (value === 'auto') return SLATE_SCALE
  try { return generateScale(value) } catch { return SLATE_SCALE }
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function validateHex(value: unknown, field: string): string {
  if (typeof value !== 'string' || !HEX_RE.test(value.trim())) {
    throw createError({ statusCode: 400, message: `Color ${field} inválido (use formato hex #RRGGBB)` })
  }
  return value.trim()
}

function validateText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: `Campo ${field} requerido` })
  }
  const trimmed = value.trim()
  if (trimmed.length < 1) throw createError({ statusCode: 400, message: `Campo ${field} no puede estar vacío` })
  if (trimmed.length > max) throw createError({ statusCode: 400, message: `Campo ${field} excede ${max} caracteres` })
  return trimmed
}

function validateParte2(value: unknown, field: string): string {
  if (value === 'auto' || value == null) return 'auto'
  return validateHex(value, field)
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  const body = await readBody(event)

  const nombreParte1 = validateText(body?.nombreParte1, 'nombreParte1', 40)
  const nombreParte2 = validateText(body?.nombreParte2, 'nombreParte2', 40)
  const colorPrimarioLight = validateHex(body?.colorPrimarioLight, 'primario claro')
  const colorPrimarioDark = validateHex(body?.colorPrimarioDark, 'primario oscuro')
  const colorFondoLight = validateHex(body?.colorFondoLight, 'fondo claro')
  const colorFondoDark = validateHex(body?.colorFondoDark, 'fondo oscuro')
  const colorParte2TextoLight = validateParte2(body?.colorParte2TextoLight, 'parte2 claro')
  const colorParte2TextoDark = validateParte2(body?.colorParte2TextoDark, 'parte2 oscuro')

  hexToRgb(colorPrimarioLight)
  hexToRgb(colorPrimarioDark)
  const escalaLight = generateScale(colorPrimarioLight)
  const escalaDark = generateScale(colorPrimarioDark)

  const updated = db.update(brandConfig).set({
    nombreParte1,
    nombreParte2,
    colorPrimarioLight,
    colorPrimarioEscalaLight: JSON.stringify(escalaLight),
    colorPrimarioDark,
    colorPrimarioEscalaDark: JSON.stringify(escalaDark),
    colorFondoLight,
    colorFondoDark,
    colorParte2TextoLight,
    colorParte2TextoDark,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(brandConfig.id, 1)).run()

  if (updated.changes === 0) {
    db.insert(brandConfig).values({
      id: 1,
      nombreParte1,
      nombreParte2,
      colorPrimarioLight,
      colorPrimarioEscalaLight: JSON.stringify(escalaLight),
      colorPrimarioDark,
      colorPrimarioEscalaDark: JSON.stringify(escalaDark),
      colorFondoLight,
      colorFondoDark,
      colorParte2TextoLight,
      colorParte2TextoDark
    }).run()
  }

  const current = db.select({ logoPath: brandConfig.logoPath }).from(brandConfig).where(eq(brandConfig.id, 1)).get()

  return {
    nombreParte1,
    nombreParte2,
    colorPrimarioLight,
    colorPrimarioEscalaLight: escalaLight,
    colorPrimarioDark,
    colorPrimarioEscalaDark: escalaDark,
    colorFondoLight,
    colorFondoDark,
    colorParte2TextoLight,
    colorParte2TextoDark,
    colorParte2EscalaLight: parte2Scale(colorParte2TextoLight),
    colorParte2EscalaDark: parte2Scale(colorParte2TextoDark),
    logoPath: current?.logoPath ? `/api/branding/${current.logoPath}` : null
  }
})
