interface BrandConfig {
  nombreParte1: string
  nombreParte2: string
  colorPrimario: string
  colorPrimarioEscala: string[]
  colorFondo: string
  colorFondoOscuro: string
  colorParte2Texto: string
}

const SCALE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

export function buildBrandCss(b: BrandConfig): string {
  const scale = b.colorPrimarioEscala
    .map((hex, i) => `--brand-${SCALE_KEYS[i]}:${hex};`)
    .join('')
  const parte2Light = b.colorParte2Texto === 'auto' ? '#0f172a' : b.colorParte2Texto
  const parte2Dark = b.colorParte2Texto === 'auto' ? '#f8fafc' : b.colorParte2Texto
  return `:root{${scale}--brand-fondo:${b.colorFondo};--brand-fondo-oscuro:${b.colorFondoOscuro};--brand-parte2:${parte2Light};}html.dark{--brand-parte2:${parte2Dark};}`
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
