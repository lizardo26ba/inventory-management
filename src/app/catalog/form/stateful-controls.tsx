'use client';

import { useState } from 'react';

import { Select, Textarea } from '@/components/ui/form';

/**
 * El desplegable y el área de texto son controlados: piden valor y función de
 * cambio. La página es de servidor, así que el estado se guarda aquí.
 */

const SAMPLE_WAREHOUSES = ['Central', 'Sucursal Norte', 'Sucursal Sur'];

export function SampleSelect({
  id,
  hasError = false,
  disabled = false,
  size = 'md',
  label,
}: {
  readonly id?: string;
  readonly hasError?: boolean;
  readonly disabled?: boolean;
  readonly size?: 'sm' | 'md';
  readonly label?: string;
}): React.ReactElement {
  const [value, setValue] = useState(SAMPLE_WAREHOUSES[0] ?? '');

  return (
    <Select
      id={id}
      value={value}
      onChange={setValue}
      hasError={hasError}
      disabled={disabled}
      size={size}
      label={label}
    >
      {SAMPLE_WAREHOUSES.map((warehouse) => (
        <option key={warehouse} value={warehouse}>
          {warehouse}
        </option>
      ))}
    </Select>
  );
}

export function SampleTextarea({
  id,
  hasError = false,
}: {
  readonly id: string;
  readonly hasError?: boolean;
}): React.ReactElement {
  const [value, setValue] = useState('Entregar por la puerta de carga, de 8:00 a 12:00.');

  return <Textarea id={id} value={value} onChange={setValue} hasError={hasError} />;
}
