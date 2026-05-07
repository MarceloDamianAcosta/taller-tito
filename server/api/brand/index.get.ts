import { db } from '../../db/index'
import { brandConfig } from '../../db/schema'

export default defineEventHandler(() => {
  const row = db.select().from(brandConfig).get()
  if (!row) {
    return {
      nombreParte1: 'Mecanizados',
      nombreParte2: 'Schmidt',
      colorPrimario: '#00A155',
      colorPrimarioEscala: ['#EFFDF5', '#D9FBE8', '#B3F5D1', '#75EDAE', '#00DC82', '#00C16A', '#00A155', '#007F45', '#016538', '#0A5331', '#052E16'],
      colorFondo: '#f9fafb',
      colorFondoOscuro: '#020617',
      colorParte2Texto: 'auto'
    }
  }
  return {
    nombreParte1: row.nombreParte1,
    nombreParte2: row.nombreParte2,
    colorPrimario: row.colorPrimario,
    colorPrimarioEscala: JSON.parse(row.colorPrimarioEscala) as string[],
    colorFondo: row.colorFondo,
    colorFondoOscuro: row.colorFondoOscuro,
    colorParte2Texto: row.colorParte2Texto
  }
})
