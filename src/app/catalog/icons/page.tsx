import * as icons from '@/components/ui/icons';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

/**
 * Se recorre el módulo entero en lugar de listar los iconos a mano: uno nuevo
 * aparece aquí sin tocar esta página.
 */
const ICONS = Object.entries(icons).sort(([a], [b]) => a.localeCompare(b));

export default function IconsCatalogPage(): React.ReactElement {
  const entry = requireEntry('icons');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title={`Todos (${ICONS.length})`}
        description="Heredan el color del texto y son decorativos: el significado lo lleva el texto de al lado."
        usage={`<IconPlus className="h-4 w-4" />`}
      >
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ICONS.map(([name, Icon]) => (
            <li
              key={name}
              className="rounded-control hover:bg-surface-muted flex items-center gap-3 px-2 py-2"
            >
              <Icon />
              <span className="text-text-muted font-mono text-xs">{name}</span>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen title="Tamaños y color">
        <div className="flex flex-wrap items-center gap-4">
          <icons.IconProducts className="h-4 w-4" />
          <icons.IconProducts />
          <icons.IconProducts className="h-8 w-8" />
          <icons.IconProducts className="text-primary h-8 w-8" />
          <icons.IconAlert className="text-danger h-8 w-8" />
        </div>
      </Specimen>
    </>
  );
}
