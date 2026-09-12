-- El formato del telefono es dato del pais, no regla escrita en el codigo.
--
-- Cada pais separa su numero de una forma y tiene su propia cantidad de
-- digitos. Si eso viviera en el formulario, anadir un pais seria desplegar.
-- Aqui pasa al catalogo: anadir un pais es sembrar una fila.
--
-- La plantilla usa '#' por cada digito; el resto de caracteres son separadores
-- que el formulario escribe solo. La cadena vacia significa que todavia no se
-- conoce el formato de ese pais, y entonces el campo acepta el numero tal como
-- se teclee en lugar de rechazarlo.
--
-- Para revertirla:
--   ALTER TABLE "countries" DROP COLUMN "phone_mask", DROP COLUMN "phone_example";

ALTER TABLE "countries"
  ADD COLUMN "phone_mask" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "phone_example" TEXT NOT NULL DEFAULT '';
