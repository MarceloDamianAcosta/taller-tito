import bcrypt from 'bcryptjs'
import { db } from '../../../db/index'
import { users } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const { currentPassword, newPassword } = await readBody(event)
  if (!currentPassword || !newPassword) throw createError({ statusCode: 400, message: 'Datos incompletos' })
  if (newPassword.length < 8) throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres' })

  const user = db.select().from(users).where(eq(users.id, session.user.id)).get()
  if (!user) throw createError({ statusCode: 404, message: 'Usuario no encontrado' })

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw createError({ statusCode: 401, message: 'Contraseña actual incorrecta' })

  const hash = await bcrypt.hash(newPassword, 12)
  db.update(users).set({ passwordHash: hash, mustChangePassword: false }).where(eq(users.id, user.id)).run()

  await setUserSession(event, {
    user: { ...session.user, mustChangePassword: false }
  })

  return { ok: true }
})
