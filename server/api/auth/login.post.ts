import bcrypt from 'bcryptjs'
import { db } from '../../db/index'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event)
  if (!username || !password) throw createError({ statusCode: 400, message: 'Datos incompletos' })

  const user = db.select().from(users).where(eq(users.username, username)).get()
  if (!user || !user.active) throw createError({ statusCode: 401, message: 'Usuario o contraseña incorrectos' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw createError({ statusCode: 401, message: 'Usuario o contraseña incorrectos' })

  await setUserSession(event, {
    user: { id: user.id, username: user.username, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword }
  })
  return { ok: true, mustChangePassword: user.mustChangePassword }
})
