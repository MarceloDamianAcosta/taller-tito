import { readFile } from 'fs/promises'
import { join } from 'path'

const NAME_RE = /^logo_\d+\.(png|jpg|jpeg|svg)$/i

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml'
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')!
  if (!NAME_RE.test(filename)) {
    throw createError({ statusCode: 400, message: 'Nombre de archivo inválido' })
  }

  const filepath = join(process.cwd(), 'uploads', 'branding', filename)
  let buffer: Buffer
  try {
    buffer = await readFile(filepath)
  } catch {
    throw createError({ statusCode: 404, message: 'Archivo no encontrado' })
  }

  const ext = filename.split('.').pop()!.toLowerCase()
  setHeader(event, 'Content-Type', MIME[ext] || 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return buffer
})
