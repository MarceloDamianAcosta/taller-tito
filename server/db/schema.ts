import { sqliteTable, integer, text, real, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'technician'] }).notNull().default('technician'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const clientes = sqliteTable('clientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  telefonos: text('telefonos', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  emails: text('emails', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  notas: text('notas'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true)
})

export const operarios = sqliteTable('operarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true)
})

export const bibliotecaArchivos = sqliteTable('biblioteca_archivos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  archivo: text('archivo').notNull(),
  tipo: text('tipo', { enum: ['imagen', 'pdf'] }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const maquinas = sqliteTable('maquinas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true)
})

export const ordenTrabajo = sqliteTable('orden_trabajo', {
  nroOt: integer('nro_ot').primaryKey({ autoIncrement: true }),
  clienteId: integer('cliente_id').notNull().references(() => clientes.id),
  descripcion: text('descripcion').notNull(),
  queSeControla: text('que_se_controla'),
  fechaIngreso: text('fecha_ingreso').notNull(),
  fechaPrometida: text('fecha_prometida'),
  fechaInicio: text('fecha_inicio'),
  fechaFinalizacion: text('fecha_finalizacion'),
  fechaEntrega: text('fecha_entrega'),
  tiempoEstimadoHs: real('tiempo_estimado_hs'),
  tiempoRealHs: real('tiempo_real_hs'),
  motivoRetraso: text('motivo_retraso'),
  estado: text('estado', {
    enum: ['Recepcionado', 'En proceso', 'Finalizado', 'Entregado', 'Anulada']
  }).notNull().default('Recepcionado'),
  motivoAnulacion: text('motivo_anulacion'),
  observaciones: text('observaciones'),
  clienteConforme: integer('cliente_conforme', { mode: 'boolean' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const otMaquinas = sqliteTable('ot_maquinas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  otId: integer('ot_id').notNull().references(() => ordenTrabajo.nroOt),
  maquinaId: integer('maquina_id').notNull().references(() => maquinas.id)
}, t => ({
  uniqOtMaquina: uniqueIndex('uniq_ot_maquina').on(t.otId, t.maquinaId)
}))

export const otArchivos = sqliteTable('ot_archivos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  otId: integer('ot_id').notNull().references(() => ordenTrabajo.nroOt),
  bibliotecaId: integer('biblioteca_id').notNull().references(() => bibliotecaArchivos.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const otHistorial = sqliteTable('ot_historial', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  otId: integer('ot_id').notNull().references(() => ordenTrabajo.nroOt, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  operarioId: integer('operario_id').references(() => operarios.id),
  estadoAnterior: text('estado_anterior'),
  estadoNuevo: text('estado_nuevo').notNull(),
  fecha: text('fecha').notNull()
})

export const controlCalidad = sqliteTable('control_calidad', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  otId: integer('ot_id').notNull().references(() => ordenTrabajo.nroOt),
  queSeControla: text('que_se_controla').notNull(),
  instrumento: text('instrumento'),
  resultado: text('resultado', { enum: ['OK', 'NO OK'] }),
  accion: text('accion'),
  cumpleFuncion: integer('cumple_funcion', { mode: 'boolean' }).notNull(),
  obsCalidad: text('obs_calidad'),
  huboReproceso: integer('hubo_reproceso', { mode: 'boolean' }).notNull(),
  fechaControl: text('fecha_control').notNull()
})

export const noConformidades = sqliteTable('no_conformidades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  otId: integer('ot_id').notNull().references(() => ordenTrabajo.nroOt),
  fecha: text('fecha').notNull(),
  problema: text('problema').notNull(),
  causa: text('causa'),
  solucion: text('solucion'),
  accionPreventiva: text('accion_preventiva')
})

export const registroMantenimiento = sqliteTable('registro_mantenimiento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  maquinaId: integer('maquina_id').notNull().references(() => maquinas.id),
  fecha: text('fecha').notNull(),
  tipo: text('tipo', { enum: ['Preventivo', 'Correctivo'] }).notNull(),
  descripcion: text('descripcion').notNull(),
  responsable: text('responsable'),
  proximaFecha: text('proxima_fecha')
})

export const brandConfig = sqliteTable('brand_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombreParte1: text('nombre_parte1').notNull().default('Mecanizados'),
  nombreParte2: text('nombre_parte2').notNull().default('Schmidt'),
  colorPrimarioLight: text('color_primario').notNull().default('#00A155'),
  colorPrimarioEscalaLight: text('color_primario_escala').notNull(),
  colorPrimarioDark: text('color_primario_dark').notNull().default('#00A155'),
  colorPrimarioEscalaDark: text('color_primario_escala_dark').notNull(),
  colorFondoLight: text('color_fondo').notNull().default('#f9fafb'),
  colorFondoDark: text('color_fondo_oscuro').notNull().default('#020617'),
  colorParte2TextoLight: text('color_parte2_texto').notNull().default('auto'),
  colorParte2TextoDark: text('color_parte2_texto_dark').notNull().default('auto'),
  colorTerciario: text('color_terciario').notNull().default('slate'),
  logoPath: text('logo_path'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})
