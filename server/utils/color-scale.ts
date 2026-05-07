const SCALE_LIGHTNESS: Record<string, number> = {
  50: 97,
  100: 93,
  200: 86,
  300: 76,
  400: 64,
  500: 52,
  600: 43,
  700: 35,
  800: 28,
  900: 22,
  950: 13
}

export const SCALE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
export type ScaleKey = typeof SCALE_KEYS[number]

function lightnessFor(key: ScaleKey): number {
  return SCALE_LIGHTNESS[key] as number
}

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n))
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '').trim()
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Color hex inválido: ${hex}`)
  const num = parseInt(full, 16)
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s * 100, l * 100]
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else if (hp < 6) [r, g, b] = [c, 0, x]
  const m = ln - c / 2
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

export function generateScale(baseHex: string): string[] {
  const [r, g, b] = hexToRgb(baseHex)
  const [h, s] = rgbToHsl(r, g, b)
  return SCALE_KEYS.map((key) => {
    const l = lightnessFor(key)
    const adjustedS = l > 90 || l < 15 ? s * 0.7 : s
    const [nr, ng, nb] = hslToRgb(h, adjustedS, l)
    return rgbToHex(nr, ng, nb)
  })
}

export function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const [r, g, b] = channels as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA)
  const lb = relativeLuminance(hexB)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}
