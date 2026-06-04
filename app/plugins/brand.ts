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
  colorTerciarioLight: string
  colorTerciarioDark: string
  colorTerciarioEscalaLight: string[]
  colorTerciarioEscalaDark: string[]
  logoPath: string | null
}

const SCALE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

// Defaults del secundario cuando viene 'auto' (datos viejos): el secundario ahora pinta el
// FONDO de la página, así que su fallback es un fondo claro/oscuro, no un color de texto.
const SECUNDARIO_AUTO_LIGHT = '#f9fafb'
const SECUNDARIO_AUTO_DARK = '#020617'

function buildVarsBlock(
  escalaPrimario: string[],
  escalaParte2: string[],
  escalaNeutral: string[],
  terciarioHex: string,
  secundarioTexto: string,
  modeIsDark: boolean
): string {
  const brandVars = escalaPrimario.map((hex, i) => `--brand-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiPrimaryVars = escalaPrimario.map((hex, i) => `--ui-color-primary-${SCALE_KEYS[i]}:${hex};`).join('')
  const brandParte2Vars = escalaParte2.map((hex, i) => `--brand-parte2-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiSecondaryVars = escalaParte2.map((hex, i) => `--ui-color-secondary-${SCALE_KEYS[i]}:${hex};`).join('')
  const brandNeutralVars = escalaNeutral.map((hex, i) => `--brand-neutral-${SCALE_KEYS[i]}:${hex};`).join('')
  const uiNeutralVars = escalaNeutral.map((hex, i) => `--ui-color-neutral-${SCALE_KEYS[i]}:${hex};`).join('')
  // El secundario es UN color que pinta el fondo de la página (--brand-fondo) y la "parte 2"
  // del nombre del logo (--brand-parte2). Mismo valor para ambos (decisión del modelo de 3 colores).
  const secundario = secundarioTexto === 'auto' ? (modeIsDark ? SECUNDARIO_AUTO_DARK : SECUNDARIO_AUTO_LIGHT) : secundarioTexto
  // El terciario pinta menú/navbar/tarjetas/bordes con EXACTAMENTE el color elegido (no un
  // escalón derivado): --ui-bg = el hex tal cual, en ambos modos. La escala (--ui-color-neutral-*)
  // sigue alimentando borde/texto/elevated. En light bajamos el borde a un escalón de la escala
  // para que tenga estructura; en dark Nuxt UI ya provee esos tonos.
  const surface = modeIsDark
    ? `--ui-bg:${terciarioHex};`
    : `--ui-bg:${terciarioHex};--ui-bg-muted:var(--ui-color-neutral-200);--ui-border:var(--ui-color-neutral-400);`
  return `${brandVars}${uiPrimaryVars}${brandParte2Vars}${uiSecondaryVars}${brandNeutralVars}${uiNeutralVars}--brand-fondo:${secundario};--brand-parte2:${secundario};${surface}`
}

export function buildBrandCss(b: BrandConfig): string {
  const lightBlock = buildVarsBlock(b.colorPrimarioEscalaLight, b.colorParte2EscalaLight, b.colorTerciarioEscalaLight, b.colorTerciarioLight, b.colorParte2TextoLight, false)
  const darkBlock = buildVarsBlock(b.colorPrimarioEscalaDark, b.colorParte2EscalaDark, b.colorTerciarioEscalaDark, b.colorTerciarioDark, b.colorParte2TextoDark, true)
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
