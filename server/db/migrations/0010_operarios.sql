CREATE TABLE `operarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
