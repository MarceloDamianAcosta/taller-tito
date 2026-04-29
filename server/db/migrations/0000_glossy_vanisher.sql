CREATE TABLE IF NOT EXISTS `biblioteca_archivos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`archivo` text NOT NULL,
	`tipo` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalogo_materiales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`unidad` text NOT NULL,
	`tipo` text,
	`notas` text,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `clientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`telefono` text,
	`email` text,
	`notas` text,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `control_calidad` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ot_id` integer NOT NULL,
	`que_se_controla` text NOT NULL,
	`instrumento` text,
	`resultado` text NOT NULL,
	`accion` text,
	`cumple_funcion` integer NOT NULL,
	`obs_calidad` text,
	`hubo_reproceso` integer NOT NULL,
	`fecha_control` text NOT NULL,
	FOREIGN KEY (`ot_id`) REFERENCES `orden_trabajo`(`nro_ot`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `maquinas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `materiales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ot_id` integer,
	`material_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`proveedor` text NOT NULL,
	`cantidad` real NOT NULL,
	`problemas` text,
	FOREIGN KEY (`ot_id`) REFERENCES `orden_trabajo`(`nro_ot`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_id`) REFERENCES `catalogo_materiales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `no_conformidades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ot_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`problema` text NOT NULL,
	`causa` text,
	`solucion` text,
	`accion_preventiva` text,
	FOREIGN KEY (`ot_id`) REFERENCES `orden_trabajo`(`nro_ot`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `orden_trabajo` (
	`nro_ot` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`material` text,
	`cantidad` integer,
	`maquina_id` integer,
	`fecha_ingreso` text NOT NULL,
	`fecha_prometida` text NOT NULL,
	`fecha_inicio` text,
	`fecha_finalizacion` text,
	`fecha_entrega` text,
	`tiempo_estimado_hs` real,
	`tiempo_real_hs` real,
	`motivo_retraso` text,
	`estado` text DEFAULT 'Recepcionado' NOT NULL,
	`observaciones` text,
	`cliente_conforme` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ot_archivos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ot_id` integer NOT NULL,
	`biblioteca_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`ot_id`) REFERENCES `orden_trabajo`(`nro_ot`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`biblioteca_id`) REFERENCES `biblioteca_archivos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `registro_mantenimiento` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`maquina_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`tipo` text NOT NULL,
	`descripcion` text NOT NULL,
	`responsable` text,
	`proxima_fecha` text,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'technician' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);