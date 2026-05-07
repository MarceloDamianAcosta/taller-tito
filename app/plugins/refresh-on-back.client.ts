export default defineNuxtPlugin(() => {
  let isPopNavigation = false

  window.addEventListener('popstate', () => {
    isPopNavigation = true
  })

  const router = useRouter()
  router.afterEach(async () => {
    if (!isPopNavigation) return
    isPopNavigation = false
    await refreshNuxtData()
  })
})
