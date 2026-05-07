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
}

export function useAppBrand() {
  const brand = useState<BrandConfig | null>('brand', () => null)
  const nombreCompleto = computed(() => {
    if (!brand.value) return 'Mecanizados Schmidt'
    return `${brand.value.nombreParte1} ${brand.value.nombreParte2}`.trim()
  })
  return { brand, nombreCompleto }
}
