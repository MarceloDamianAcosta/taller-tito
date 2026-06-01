// Liveness check público. Lo usa el agente host (taller-updater.sh) para confirmar
// que la app levantó bien tras un rebuild antes de dar el update por exitoso.
export default defineEventHandler(() => ({ ok: true }))
