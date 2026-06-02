// Estado global para "trabar" el botón atrás durante un paso obligatorio a medias
// (ej. el modal de operario al recepcionar una OT). Mientras blocked === true, el
// plugin back-navigation cancela el back para que el paso no quede sin completar.
export function useBackGuard() {
  const blocked = useState('backGuardBlocked', () => false)
  return { blocked }
}
