export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, session } = useUserSession()
  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }
  if (loggedIn.value && to.path === '/login') {
    return navigateTo('/')
  }
  if (loggedIn.value && session.value?.user?.mustChangePassword && to.path !== '/cambiar-password') {
    return navigateTo('/cambiar-password')
  }
})
