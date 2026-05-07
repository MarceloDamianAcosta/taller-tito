PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orden_trabajo` (
	`nro_ot` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`material` text,
	`cantidad` integer,
	`maquina_id` integer,
	`fecha_ingreso` text NOT NULL,
	`fecha_prometida` text,
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
INSERT INTO `__new_orden_trabajo`("nro_ot", "cliente_id", "descripcion", "material", "cantidad", "maquina_id", "fecha_ingreso", "fecha_prometida", "fecha_inicio", "fecha_finalizacion", "fecha_entrega", "tiempo_estimado_hs", "tiempo_real_hs", "motivo_retraso", "estado", "observaciones", "cliente_conforme", "created_at") SELECT "nro_ot", "cliente_id", "descripcion", "material", "cantidad", "maquina_id", "fecha_ingreso", "fecha_prometida", "fecha_inicio", "fecha_finalizacion", "fecha_entrega", "tiempo_estimado_hs", "tiempo_real_hs", "motivo_retraso", "estado", "observaciones", "cliente_conforme", "created_at" FROM `orden_trabajo`;--> statement-breakpoint
DROP TABLE `orden_trabajo`;--> statement-breakpoint
ALTER TABLE `__new_orden_trabajo` RENAME TO `orden_trabajo`;--> statement-breakpoint
PRAGMA foreign_keys=ON;