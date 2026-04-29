import { db } from '../../db/index'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  return db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    role: users.role,
    active: users.active,
    mustChangePassword: users.mustChangePassword,
    createdAt: users.createdAt
  }).from(users).all()
})
