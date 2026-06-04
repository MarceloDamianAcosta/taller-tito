interface BrandConfig {
  nombreParte1: string
  nombreParte2: string
  colorPrimarioLight: string
  colorPrimarioEscalaLight: string[]
  colorPrimarioDark: string
  colorPrimarioEscalaDark: string[]
  colorFondoLight: string
  colorFondoDark: string
  colorParte2TextoLight: string
  colorParte2TextoDark: string
  colorParte2EscalaLight: string[]
  colorParte2EscalaDark: string[]
  colorTerciario: string
  logoPath: string | null
}

const SCALE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

// Familias de neutro ("color terciario") acotadas: escalas Tailwind 50→950.
// Una sola escala sirve para light y dark (Nuxt UI usa el escalón claro u oscuro
// según el modo). Default 'slate' = lo que la app usaba antes.
export const NEUTRAL_FAMILIES: Record<string, string[]> = {
  slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
  gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'],
  zinc: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b'],
  neutral: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0a0a0a'],
  stone: ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09']
}

function buildVarsBlock(
  escalaPrimario: string[],
  escalaParte2: string[],
  escalaNeutral: string[],
  parte2Texto: string,
  modeIsDark: boolean
): string {
  const brandVars = escalaPrimario.map((hex, i) => `--brand-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiPrimaryVars = escalaPrimario.map((hex, i) => `--ui-color-primary-${SCALE_KEYS[i]}:${hex};`).join('')
  const brandParte2Vars = escalaParte2.map((hex, i) => `--brand-parte2-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiSecondaryVars = escalaParte2.map((hex, i) => `--ui-color-secondary-${SCALE_KEYS[i]}:${hex};`).join('')
  const brandNeutralVars = escalaNeutral.map((hex, i) => `--brand-neutral-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiNeutralVars = escalaNeutral.map((hex, i) => `--ui-color-neutral-${SCALE_KEYS[i]}:${hex};`).join('')
  const parte2 = parte2Texto === 'auto' ? (modeIsDark ? '#f8fafc' : '#0f172a') : parte2Texto
  // El fondo de la página deriva del "color terciario" (neutro elegido): en light un gris
  // claro perceptible (escalón 200 — claramente distinto del blanco y con tinte visible
  // entre familias; el 100 quedaba casi blanco e indistinguible); en dark el tono profundo
  // (escalón 950). Las cards/sidebar quedan en --ui-bg (blanco en light, neutral-900 en
  // dark) y "flotan" sobre el fondo → jerarquía real.
  const brandFondo = modeIsDark ? 'var(--ui-color-neutral-950)' : 'var(--ui-color-neutral-200)'
  // En dark forzamos que primario/secundario usen el color elegido (escalón 500) en vez del
  // 400 que Nuxt UI toma por defecto. En light no hace falta override de superficie.
  const modeOverrides = modeIsDark
    ? '--ui-primary:var(--ui-color-primary-500);--ui-secondary:var(--ui-color-secondary-500);'
    : ''
  return `${brandVars}${uiPrimaryVars}${brandParte2Vars}${uiSecondaryVars}${brandNeutralVars}${uiNeutralVars}--brand-fondo:${brandFondo};--brand-parte2:${parte2};${modeOverrides}`
}

export function buildBrandCss(b: BrandConfig): string {
  const escalaNeutral = NEUTRAL_FAMILIES[b.colorTerciario] ?? NEUTRAL_FAMILIES.slate!
  const lightBlock = buildVarsBlock(b.colorPrimarioEscalaLight, b.colorParte2EscalaLight, escalaNeutral, b.colorParte2TextoLight, false)
  const darkBlock = buildVarsBlock(b.colorPrimarioEscalaDark, b.colorParte2EscalaDark, escalaNeutral, b.colorParte2TextoDark, true)
  // Especificidad elevada (`html:root` / `html.dark:root`) para ganarle a los
  // valores de fábrica de main.css (`:root` / `html.dark`), que cargan después.
  // Sin esto, --brand-fondo/--brand-parte2 del usuario quedan pisados por el default.
  return `html:root{${lightBlock}}html.dark:root{${darkBlock}}`
}

export default defineNuxtPlugin(async () => {
  const brand = useState<BrandConfig | null>('brand', () => null)
  if (!brand.value) {
    try {
      brand.value = await $fetch<BrandConfig>('/api/brand')
    } catch {
      return
    }
  }
  if (!brand.value) return

  useHead({
    style: [{ id: 'brand-vars', innerHTML: buildBrandCss(brand.value) }]
  })
})
