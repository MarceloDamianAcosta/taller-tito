import { requireAdmin, readVersion, readControl, type RemoteInfo } from '../../../utils/system'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const current = readVersion()
  const remote = readControl<RemoteInfo>('remote.json')
  return {
    current,
    remote,
    updateAvailable: remote?.updateAvailable ?? false,
    lastCheck: remote?.checkedAt ?? null
  }
})
