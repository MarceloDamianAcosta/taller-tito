import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index'
import { brandConfig } from '../../db/schema'
import { generateScale, hexToRgb } from '../../utils/color-scale'

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

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  const body = await readBody(event)

  const nombreParte1 = validateText(body?.nombreParte1, 'nombreParte1', 40)
  const nombreParte2 = validateText(body?.nombreParte2, 'nombreParte2', 40)
  const colorPrimario = validateHex(body?.colorPrimario, 'primario')
  const colorFondo = validateHex(body?.colorFondo, 'fondo')
  const colorFondoOscuro = validateHex(body?.colorFondoOscuro, 'fondoOscuro')

  let colorParte2Texto: string
  if (body?.colorParte2Texto === 'auto' || body?.colorParte2Texto == null) {
    colorParte2Texto = 'auto'
  } else {
    colorParte2Texto = validateHex(body.colorParte2Texto, 'parte2Texto')
  }

  hexToRgb(colorPrimario)
  const escala = generateScale(colorPrimario)

  const updated = db.update(brandConfig).set({
    nombreParte1,
    nombreParte2,
    colorPrimario,
    colorPrimarioEscala: JSON.stringify(escala),
    colorFondo,
    colorFondoOscuro,
    colorParte2Texto,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(brandConfig.id, 1)).run()

  if (updated.changes === 0) {
    db.insert(brandConfig).values({
      id: 1,
      nombreParte1,
      nombreParte2,
      colorPrimario,
      colorPrimarioEscala: JSON.stringify(escala),
      colorFondo,
      colorFondoOscuro,
      colorParte2Texto
    }).run()
  }

  return {
    nombreParte1,
    nombreParte2,
    colorPrimario,
    colorPrimarioEscala: escala,
    colorFondo,
    colorFondoOscuro,
    colorParte2Texto
  }
})
