PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orden_trabajo` (
	`nro_ot` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`fecha_ingreso` text NOT NULL,
	`fecha_prometida` text,
	`fecha_inicio` text,
	`fecha_finalizacion` text,
	`fecha_entrega` text,
	`tiempo_estimado_hs` real,
	`tiempo_real_hs` real,
	`motivo_retraso` text,
	`estado` text DEFAULT 'Recepcionado' NOT NULL,
	`motivo_anulacion` text,
	`observaciones` text,
	`cliente_conforme` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_orden_trabajo`("nro_ot", "cliente_id", "descripcion", "fecha_ingreso", "fecha_prometida", "fecha_inicio", "fecha_finalizacion", "fecha_entrega", "tiempo_estimado_hs", "tiempo_real_hs", "motivo_retraso", "estado", "motivo_anulacion", "observaciones", "cliente_conforme", "created_at") SELECT "nro_ot", "cliente_id", "descripcion" ||
	CASE WHEN "material" IS NOT NULL AND TRIM("material") <> ''
	     THEN char(10) || char(10) || 'Material: ' || "material"
	     ELSE '' END ||
	CASE WHEN "cantidad" IS NOT NULL
	     THEN char(10) || 'Cantidad: ' || "cantidad"
	     ELSE '' END, "fecha_ingreso", "fecha_prometida", "fecha_inicio", "fecha_finalizacion", "fecha_entrega", "tiempo_estimado_hs", "tiempo_real_hs", "motivo_retraso", "estado", "motivo_anulacion", "observaciones", "cliente_conforme", "created_at" FROM `orden_trabajo`;--> statement-breakpoint
DROP TABLE `orden_trabajo`;--> statement-breakpoint
ALTER TABLE `__new_orden_trabajo` RENAME TO `orden_trabajo`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
