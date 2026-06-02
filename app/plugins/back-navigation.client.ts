// Comportamiento del botón "atrás" (TITO-120):
// - Detecta navegación hacia atrás con history.state.position (lo mantiene Vue
//   Router), confiable y sin depender del orden de listeners de popstate.
// - Si hay un paso obligatorio a medias (useBackGuard.blocked === true) → cancela
//   el atrás para que no quede incompleto.
// - En cualquier otro caso, el atrás lleva SIEMPRE al dashboard (nunca al login).
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { blocked } = useBackGuard()

  let lastPos = (history.state?.position as number | undefined) ?? 0

  router.beforeEach((to) => {
    const pos = (history.state?.position as number | undefined) ?? 0
    const isBack = pos < lastPos
    if (!isBack) return true

    if (blocked.value) return false // paso obligatorio: no dejar salir
    if (to.path !== '/') return '/' // atrás → dashboard
    return true // ya estamos en el dashboard: piso, no ir al login
  })

  router.afterEach(() => {
    lastPos = (history.state?.position as number | undefined) ?? 0
  })
})
