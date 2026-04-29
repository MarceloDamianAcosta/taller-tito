import bcrypt from 'bcryptjs'
import { db } from '../../db/index'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  const { username, name, password, role } = await readBody(event)

  if (!username || !name || !password || !role) {
    throw createError({ statusCode: 400, message: 'Datos incompletos' })
  }
  if (!/^[a-z0-9]{3,20}$/.test(username)) {
    throw createError({ statusCode: 400, message: 'El usuario debe tener entre 3 y 20 caracteres alfanuméricos en minúsculas' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres' })
  }
  if (!['admin', 'technician'].includes(role)) {
    throw createError({ statusCode: 400, message: 'Rol inválido' })
  }

  const existing = db.select().from(users).where(eq(users.username, username)).get()
  if (existing) throw createError({ statusCode: 409, message: 'El nombre de usuario ya existe' })

  const hash = await bcrypt.hash(password, 12)
  const result = db.insert(users).values({ username, name, passwordHash: hash, role }).run()

  return { ok: true, id: result.lastInsertRowid }
})
