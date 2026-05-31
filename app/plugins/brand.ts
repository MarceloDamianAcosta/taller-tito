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
  logoPath: string | null
}

const SCALE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

function buildVarsBlock(escala: string[], fondo: string, parte2Texto: string, modeIsDark: boolean): string {
  const brandVars = escala.map((hex, i) => `--brand-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiVars = escala.map((hex, i) => `--ui-color-primary-${SCALE_KEYS[i]}:${hex};`).join('')
  const parte2 = parte2Texto === 'auto' ? (modeIsDark ? '#f8fafc' : '#0f172a') : parte2Texto
  return `${brandVars}${uiVars}--brand-fondo:${fondo};--brand-parte2:${parte2};`
}

export function buildBrandCss(b: BrandConfig): string {
  const lightBlock = buildVarsBlock(b.colorPrimarioEscalaLight, b.colorFondoLight, b.colorParte2TextoLight, false)
  const darkBlock = buildVarsBlock(b.colorPrimarioEscalaDark, b.colorFondoDark, b.colorParte2TextoDark, true)
  return `:root{${lightBlock}}html.dark{${darkBlock}}`
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
