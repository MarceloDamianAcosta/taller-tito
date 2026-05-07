import { db } from '../../db/index'
import { brandConfig } from '../../db/schema'

const DEFAULT_SCALE = ['#EFFDF5', '#D9FBE8', '#B3F5D1', '#75EDAE', '#00DC82', '#00C16A', '#00A155', '#007F45', '#016538', '#0A5331', '#052E16']

export default defineEventHandler(() => {
  const row = db.select().from(brandConfig).get()
  if (!row) {
    return {
      nombreParte1: 'Mecanizados',
      nombreParte2: 'Schmidt',
      colorPrimarioLight: '#00A155',
      colorPrimarioEscalaLight: DEFAULT_SCALE,
      colorPrimarioDark: '#00A155',
      colorPrimarioEscalaDark: DEFAULT_SCALE,
      colorFondoLight: '#f9fafb',
      colorFondoDark: '#020617',
      colorParte2TextoLight: 'auto',
      colorParte2TextoDark: 'auto'
    }
  }
  return {
    nombreParte1: row.nombreParte1,
    nombreParte2: row.nombreParte2,
    colorPrimarioLight: row.colorPrimarioLight,
    colorPrimarioEscalaLight: JSON.parse(row.colorPrimarioEscalaLight) as string[],
    colorPrimarioDark: row.colorPrimarioDark,
    colorPrimarioEscalaDark: JSON.parse(row.colorPrimarioEscalaDark) as string[],
    colorFondoLight: row.colorFondoLight,
    colorFondoDark: row.colorFondoDark,
    colorParte2TextoLight: row.colorParte2TextoLight,
    colorParte2TextoDark: row.colorParte2TextoDark
  }
})
