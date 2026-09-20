-- Backfill: registra como Empresa los nombres de cliente que ya se venían
-- usando como texto libre en Usuario.clienteNombre e Inspeccion.cliente,
-- para que no queden "huérfanos" al pasar el campo a un selector cerrado.
INSERT INTO "Empresa" ("id", "nombre", "activa", "creadoEn")
SELECT gen_random_uuid()::text, nombres.nombre, true, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "clienteNombre" AS nombre
    FROM "Usuario"
    WHERE "clienteNombre" IS NOT NULL AND "clienteNombre" <> ''
    UNION
    SELECT DISTINCT "cliente" AS nombre
    FROM "Inspeccion"
    WHERE "cliente" IS NOT NULL AND "cliente" <> ''
) AS nombres
ON CONFLICT ("nombre") DO NOTHING;
