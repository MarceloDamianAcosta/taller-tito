interface BrandConfig {
  nombreParte1: string
  nombreParte2: string
  colorPrimario: string
  colorPrimarioEscala: string[]
  colorFondo: string
  colorFondoOscuro: string
  colorParte2Texto: string
}

export function useAppBrand() {
  const brand = useState<BrandConfig | null>('brand', () => null)
  const nombreCompleto = computed(() => {
    if (!brand.value) return 'Mecanizados Schmidt'
    return `${brand.value.nombreParte1} ${brand.value.nombreParte2}`.trim()
  })
  return { brand, nombreCompleto }
}
