CREATE TABLE IF NOT EXISTS `brand_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre_parte1` text DEFAULT 'Mecanizados' NOT NULL,
	`nombre_parte2` text DEFAULT 'Schmidt' NOT NULL,
	`color_primario` text DEFAULT '#00A155' NOT NULL,
	`color_primario_escala` text NOT NULL,
	`color_fondo` text DEFAULT '#f9fafb' NOT NULL,
	`color_fondo_oscuro` text DEFAULT '#020617' NOT NULL,
	`color_parte2_texto` text DEFAULT 'auto' NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `brand_config` (`id`, `color_primario_escala`) VALUES (1, '["#EFFDF5","#D9FBE8","#B3F5D1","#75EDAE","#00DC82","#00C16A","#00A155","#007F45","#016538","#0A5331","#052E16"]');
