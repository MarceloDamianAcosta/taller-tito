PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_control_calidad` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ot_id` integer NOT NULL,
	`que_se_controla` text NOT NULL,
	`instrumento` text,
	`resultado` text,
	`accion` text,
	`cumple_funcion` integer NOT NULL,
	`obs_calidad` text,
	`hubo_reproceso` integer NOT NULL,
	`fecha_control` text NOT NULL,
	FOREIGN KEY (`ot_id`) REFERENCES `orden_trabajo`(`nro_ot`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_control_calidad`("id", "ot_id", "que_se_controla", "instrumento", "resultado", "accion", "cumple_funcion", "obs_calidad", "hubo_reproceso", "fecha_control") SELECT "id", "ot_id", "que_se_controla", "instrumento", "resultado", "accion", "cumple_funcion", "obs_calidad", "hubo_reproceso", "fecha_control" FROM `control_calidad`;--> statement-breakpoint
DROP TABLE `control_calidad`;--> statement-breakpoint
ALTER TABLE `__new_control_calidad` RENAME TO `control_calidad`;--> statement-breakpoint
PRAGMA foreign_keys=ON;