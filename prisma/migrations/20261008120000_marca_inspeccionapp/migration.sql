-- La plataforma pasa a la marca InspeccionAPP: la organización principal (la del dueño de la
-- instalación) deja de llamarse como el primer cliente. Solo se renombra si nadie la había editado.
UPDATE "Organizacion"
SET "nombre" = 'InspeccionAPP', "nombreCorto" = 'InspeccionAPP'
WHERE "id" = 'org_principal' AND "nombreCorto" = 'EQS';
