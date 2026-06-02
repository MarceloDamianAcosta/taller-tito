CREATE TABLE `ot_historial` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ot_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`operario_id` integer,
	`estado_anterior` text,
	`estado_nuevo` text NOT NULL,
	`fecha` text NOT NULL,
	FOREIGN KEY (`ot_id`) REFERENCES `orden_trabajo`(`nro_ot`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operario_id`) REFERENCES `operarios`(`id`) ON UPDATE no action ON DELETE no action
);
