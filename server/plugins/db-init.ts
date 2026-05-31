import { bootstrapPromise } from '../db/index'

export default defineNitroPlugin(async () => {
  await bootstrapPromise
})
