ALTER TABLE `clientes` ADD `telefonos` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` ADD `emails` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `clientes` SET `telefonos` = json_array(trim(`telefono`)) WHERE `telefono` IS NOT NULL AND trim(`telefono`) != '';--> statement-breakpoint
UPDATE `clientes` SET `emails` = json_array(trim(`email`)) WHERE `email` IS NOT NULL AND trim(`email`) != '';--> statement-breakpoint
ALTER TABLE `clientes` DROP COLUMN `telefono`;--> statement-breakpoint
ALTER TABLE `clientes` DROP COLUMN `email`;
