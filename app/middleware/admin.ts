export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (user.value?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Acceso denegado' })
  }
})
