ALTER TABLE `brand_config` ADD COLUMN `color_primario_dark` text DEFAULT '#00A155' NOT NULL;
--> statement-breakpoint
ALTER TABLE `brand_config` ADD COLUMN `color_primario_escala_dark` text DEFAULT '["#EFFDF5","#D9FBE8","#B3F5D1","#75EDAE","#00DC82","#00C16A","#00A155","#007F45","#016538","#0A5331","#052E16"]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `brand_config` ADD COLUMN `color_parte2_texto_dark` text DEFAULT 'auto' NOT NULL;
