import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from './schema'
import {
  clientes,
  maquinas,
  catalogoMateriales,
  ordenTrabajo,
  otMaquinas,
  controlCalidad,
  noConformidades,
  materiales,
  registroMantenimiento
} from './schema'

type DB = BetterSQLite3Database<typeof schema>

export async function seedIfEmpty(db: DB) {
  if (process.env.AUTO_SEED !== 'true') return

  const clientesCount = db.select().from(clientes).all().length
  if (clientesCount > 0) return

  console.log('[seed] DB vacía + AUTO_SEED=true → cargando datos sintéticos...')

  const today = new Date()
  const iso = (offsetDays: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString().slice(0, 10)
  }

  const clientesIns = db.insert(clientes).values([
    { nombre: 'Industrias Ríos S.A.', telefono: '0342-4555111', email: 'contacto@rios.com.ar', notas: 'Cliente histórico, paga al contado' },
    { nombre: 'Talleres Bermúdez', telefono: '011-4789-2310', email: 'compras@bermudez.ar' },
    { nombre: 'Metalúrgica López', telefono: '0341-4123456', notas: 'Pide remito original' }
  ]).returning().all()

  const maquinasIns = db.insert(maquinas).values([
    { nombre: 'Torno paralelo CNC 1', descripcion: 'Torno Romi C420' },
    { nombre: 'Fresadora vertical 1', descripcion: 'Fresadora Bridgeport' },
    { nombre: 'Soldadora MIG 250A', descripcion: 'Soldadora Lincoln Power MIG' }
  ]).returning().all()

  const matIns = db.insert(catalogoMateriales).values([
    { nombre: 'Chapa SAE 1010 6mm', unidad: 'kg', tipo: 'Chapa' },
    { nombre: 'Chapa SAE 1010 3mm', unidad: 'kg', tipo: 'Chapa' },
    { nombre: 'Perfil ángulo 1" x 1/8"', unidad: 'mts', tipo: 'Perfil' },
    { nombre: 'Perfil UPN 80', unidad: 'mts', tipo: 'Perfil' },
    { nombre: 'Caño estructural 40x40x2', unidad: 'mts', tipo: 'Perfil' },
    { nombre: 'Varilla SAE 1020 Ø20', unidad: 'mts', tipo: 'Barra' },
    { nombre: 'Varilla SAE 1045 Ø30', unidad: 'mts', tipo: 'Barra' },
    { nombre: 'Electrodo 6013 2.5mm', unidad: 'kg', tipo: 'Consumible' },
    { nombre: 'Alambre MIG ER70S-6 1.0mm', unidad: 'kg', tipo: 'Consumible' },
    { nombre: 'Disco de corte 4.5"', unidad: 'kg', tipo: 'Herramental', notas: 'Norton standard' },
    { nombre: 'Buje de bronce SAE 660', unidad: 'kg', tipo: 'Bronce' },
    { nombre: 'Aceite refrigerante', unidad: 'lts', tipo: 'Insumo' }
  ]).returning().all()

  // 2 Recepcionado, 3 En proceso, 2 Finalizado (en stock), 2 Entregado, 1 Anulada
  const otsIns = db.insert(ordenTrabajo).values([
    { clienteId: clientesIns[0]!.id, descripcion: 'Reparación caja reductora', fechaIngreso: iso(-2), fechaPrometida: iso(7), estado: 'Recepcionado', tiempoEstimadoHs: 12 },
    { clienteId: clientesIns[1]!.id, descripcion: 'Fabricación de soporte para motor', fechaIngreso: iso(-1), fechaPrometida: iso(10), estado: 'Recepcionado', tiempoEstimadoHs: 8 },
    { clienteId: clientesIns[2]!.id, descripcion: 'Mecanizado de eje Ø50 SAE 1045', fechaIngreso: iso(-5), fechaPrometida: iso(2), fechaInicio: iso(-3), estado: 'En proceso', tiempoEstimadoHs: 6, tiempoRealHs: 3.5 },
    { clienteId: clientesIns[0]!.id, descripcion: 'Estructura metálica 2x3 mts', fechaIngreso: iso(-7), fechaPrometida: iso(5), fechaInicio: iso(-4), estado: 'En proceso', tiempoEstimadoHs: 20, tiempoRealHs: 8 },
    { clienteId: clientesIns[1]!.id, descripcion: 'Reparación porta-cuchillas', fechaIngreso: iso(-4), fechaInicio: iso(-2), estado: 'En proceso', tiempoEstimadoHs: 5, tiempoRealHs: 2 },
    { clienteId: clientesIns[2]!.id, descripcion: 'Tornillería especial M16x80 templada', fechaIngreso: iso(-15), fechaPrometida: iso(-5), fechaInicio: iso(-13), fechaFinalizacion: iso(-3), estado: 'Finalizado', tiempoEstimadoHs: 4, tiempoRealHs: 5, motivoRetraso: 'Demora en recibir material' },
    { clienteId: clientesIns[0]!.id, descripcion: 'Bujes de bronce SAE 660 x 6 unidades', fechaIngreso: iso(-10), fechaPrometida: iso(-2), fechaInicio: iso(-8), fechaFinalizacion: iso(-1), estado: 'Finalizado', tiempoEstimadoHs: 3, tiempoRealHs: 3 },
    { clienteId: clientesIns[1]!.id, descripcion: 'Brida de acoplamiento Ø200', fechaIngreso: iso(-30), fechaPrometida: iso(-20), fechaInicio: iso(-28), fechaFinalizacion: iso(-22), fechaEntrega: iso(-19), estado: 'Entregado', tiempoEstimadoHs: 8, tiempoRealHs: 7, clienteConforme: true },
    { clienteId: clientesIns[2]!.id, descripcion: 'Polea trapezoidal 4 canales Ø250', fechaIngreso: iso(-45), fechaPrometida: iso(-30), fechaInicio: iso(-42), fechaFinalizacion: iso(-31), fechaEntrega: iso(-28), estado: 'Entregado', tiempoEstimadoHs: 10, tiempoRealHs: 12, motivoRetraso: 'Reproceso por medidas', clienteConforme: true },
    { clienteId: clientesIns[1]!.id, descripcion: 'Tapa hidráulica especial', fechaIngreso: iso(-12), estado: 'Anulada', motivoAnulacion: 'Cliente desistió del trabajo' }
  ]).returning().all()

  db.insert(otMaquinas).values([
    { otId: otsIns[2]!.nroOt, maquinaId: maquinasIns[0]!.id },
    { otId: otsIns[3]!.nroOt, maquinaId: maquinasIns[2]!.id },
    { otId: otsIns[5]!.nroOt, maquinaId: maquinasIns[0]!.id },
    { otId: otsIns[5]!.nroOt, maquinaId: maquinasIns[1]!.id },
    { otId: otsIns[6]!.nroOt, maquinaId: maquinasIns[0]!.id },
    { otId: otsIns[7]!.nroOt, maquinaId: maquinasIns[0]!.id },
    { otId: otsIns[7]!.nroOt, maquinaId: maquinasIns[1]!.id },
    { otId: otsIns[8]!.nroOt, maquinaId: maquinasIns[0]!.id }
  ]).run()

  db.insert(materiales).values([
    { otId: otsIns[2]!.nroOt, materialId: matIns[6]!.id, fecha: iso(-3), proveedor: 'Aceros Bragado', cantidad: 1.5 },
    { otId: otsIns[3]!.nroOt, materialId: matIns[4]!.id, fecha: iso(-4), proveedor: 'Aceros Bragado', cantidad: 20 },
    { otId: otsIns[3]!.nroOt, materialId: matIns[8]!.id, fecha: iso(-4), proveedor: 'Aceros Bragado', cantidad: 5 },
    { otId: otsIns[6]!.nroOt, materialId: matIns[10]!.id, fecha: iso(-9), proveedor: 'Bronces del Sur', cantidad: 8 },
    { otId: otsIns[7]!.nroOt, materialId: matIns[0]!.id, fecha: iso(-27), proveedor: 'Chapesur', cantidad: 25 },
    { materialId: matIns[7]!.id, fecha: iso(-1), proveedor: 'Soldaduras Aldo', cantidad: 10 }
  ]).run()

  db.insert(controlCalidad).values([
    { otId: otsIns[5]!.nroOt, queSeControla: 'Diámetro M16', instrumento: 'Calibre digital', resultado: 'OK', cumpleFuncion: true, huboReproceso: false, fechaControl: iso(-3) },
    { otId: otsIns[5]!.nroOt, queSeControla: 'Dureza superficial', instrumento: 'Durómetro Rockwell C', resultado: 'OK', cumpleFuncion: true, huboReproceso: false, fechaControl: iso(-3) },
    { otId: otsIns[6]!.nroOt, queSeControla: 'Diámetro interior buje', instrumento: 'Calibre', resultado: 'OK', cumpleFuncion: true, huboReproceso: false, fechaControl: iso(-1) },
    { otId: otsIns[7]!.nroOt, queSeControla: 'Espesor brida', instrumento: 'Micrómetro', resultado: 'OK', cumpleFuncion: true, huboReproceso: false, fechaControl: iso(-22) },
    { otId: otsIns[8]!.nroOt, queSeControla: 'Diámetro de canales', instrumento: 'Calibre', resultado: 'NO OK', accion: 'Reproceso de canales', cumpleFuncion: true, obsCalidad: 'Primer mecanizado quedó 0.3mm por debajo de la tolerancia', huboReproceso: true, fechaControl: iso(-33) }
  ]).run()

  db.insert(noConformidades).values([
    { otId: otsIns[8]!.nroOt, fecha: iso(-33), problema: 'Diámetro de canales fuera de tolerancia', causa: 'Error en lectura de plano', solucion: 'Re-mecanizar con cuchilla específica', accionPreventiva: 'Doble check de planos antes de iniciar mecanizado' }
  ]).run()

  db.insert(registroMantenimiento).values([
    { maquinaId: maquinasIns[0]!.id, fecha: iso(-60), tipo: 'Preventivo', descripcion: 'Cambio de aceite del cabezal', responsable: 'Tito', proximaFecha: iso(120) },
    { maquinaId: maquinasIns[0]!.id, fecha: iso(-15), tipo: 'Correctivo', descripcion: 'Reemplazo de rodamiento del husillo', responsable: 'Tito + service externo' },
    { maquinaId: maquinasIns[1]!.id, fecha: iso(-30), tipo: 'Preventivo', descripcion: 'Engrase guías + cambio refrigerante', responsable: 'Tito', proximaFecha: iso(60) },
    { maquinaId: maquinasIns[2]!.id, fecha: iso(-7), tipo: 'Preventivo', descripcion: 'Limpieza de antorcha + cambio de pico', responsable: 'Tito' }
  ]).run()

  console.log(`[seed] OK — ${clientesIns.length} clientes, ${maquinasIns.length} máquinas, ${matIns.length} materiales, ${otsIns.length} OTs.`)
}
