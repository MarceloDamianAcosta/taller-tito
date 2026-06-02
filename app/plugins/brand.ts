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
  logoPath: string | null
}

const SCALE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

function buildVarsBlock(
  escalaPrimario: string[],
  escalaParte2: string[],
  fondo: string,
  parte2Texto: string,
  modeIsDark: boolean
): string {
  const brandVars = escalaPrimario.map((hex, i) => `--brand-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiPrimaryVars = escalaPrimario.map((hex, i) => `--ui-color-primary-${SCALE_KEYS[i]}:${hex};`).join('')
  const brandParte2Vars = escalaParte2.map((hex, i) => `--brand-parte2-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiSecondaryVars = escalaParte2.map((hex, i) => `--ui-color-secondary-${SCALE_KEYS[i]}:${hex};`).join('')
  const parte2 = parte2Texto === 'auto' ? (modeIsDark ? '#f8fafc' : '#0f172a') : parte2Texto
  return `${brandVars}${uiPrimaryVars}${brandParte2Vars}${uiSecondaryVars}--brand-fondo:${fondo};--brand-parte2:${parte2};`
}

export function buildBrandCss(b: BrandConfig): string {
  const lightBlock = buildVarsBlock(b.colorPrimarioEscalaLight, b.colorParte2EscalaLight, b.colorFondoLight, b.colorParte2TextoLight, false)
  const darkBlock = buildVarsBlock(b.colorPrimarioEscalaDark, b.colorParte2EscalaDark, b.colorFondoDark, b.colorParte2TextoDark, true)
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
