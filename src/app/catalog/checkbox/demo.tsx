'use client';

import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

export function CheckboxDemo(): React.ReactElement {
  const [isChecked, setIsChecked] = useState(true);

  return (
    <div className="space-y-3 text-sm">
      <label htmlFor="catalog-checkbox" className="flex items-center gap-2">
        <Checkbox id="catalog-checkbox" checked={isChecked} onChange={setIsChecked} />
        Controla lotes y fechas de vencimiento
      </label>
      <label
        htmlFor="catalog-checkbox-readonly"
        className="text-text-muted flex items-center gap-2"
      >
        <Checkbox id="catalog-checkbox-readonly" checked isReadOnly />
        Solo informa: no se puede cambiar
      </label>
    </div>
  );
}
