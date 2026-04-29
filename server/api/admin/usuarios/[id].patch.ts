import bcrypt from 'bcryptjs'
import { db } from '../../../db/index'
import { users } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const { name, role, active, newPassword } = body

  const target = db.select().from(users).where(eq(users.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Usuario no encontrado' })

  if (active === false && id === session.user.id) {
    throw createError({ statusCode: 400, message: 'No podés desactivar tu propio usuario' })
  }

  if (role !== undefined && !['admin', 'technician'].includes(role)) {
    throw createError({ statusCode: 400, message: 'Rol inválido' })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (role !== undefined) updates.role = role
  if (active !== undefined) updates.active = active

  if (newPassword !== undefined) {
    if (newPassword.length < 8) throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres' })
    updates.passwordHash = await bcrypt.hash(newPassword, 12)
    updates.mustChangePassword = false
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Sin cambios para aplicar' })
  }

  db.update(users).set(updates).where(eq(users.id, id)).run()
  return { ok: true }
})
