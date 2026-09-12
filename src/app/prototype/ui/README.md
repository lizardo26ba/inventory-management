# Interfaz del prototipo

Copias de las piezas visuales, para uso exclusivo del prototipo.

Están duplicadas a propósito. El prototipo es un boceto y no puede depender de
`src/components/ui/`: si compartiera esas piezas, cualquier prueba de diseño cambiaría al
instante pantallas que ya están en uso y nadie se atrevería a probar nada aquí.

El camino de vuelta es manual y en un solo sentido. Se cambia el boceto, se aprueba con él
delante, y solo entonces se lleva el cambio al componente de `src/components/ui/`, que es
el que alcanza a las pantallas reales.

Estos archivos se borran junto con la pantalla del prototipo a la que sirven, cuando esa
pantalla ya existe de verdad.

Regla completa en [`docs/standards/prototype-and-components.md`](../../../../docs/standards/prototype-and-components.md).
