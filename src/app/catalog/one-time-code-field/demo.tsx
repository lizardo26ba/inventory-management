'use client';

import { useState } from 'react';

import { OneTimeCodeField, isCodeComplete } from '@/components/ui/one-time-code-field';

const CODE_LENGTH = 6;
const EMPTY_CODE = ' '.repeat(CODE_LENGTH);

function positionLabel(position: number, total: number): string {
  return `Dígito ${position} de ${total}`;
}

export function OneTimeCodeDemo(): React.ReactElement {
  const [code, setCode] = useState(EMPTY_CODE);
  const [wrongCode, setWrongCode] = useState('482913');

  return (
    <div className="space-y-6">
      <div>
        <OneTimeCodeField
          id="catalog-code"
          value={code}
          onChange={setCode}
          length={CODE_LENGTH}
          groupLabel="Código de verificación"
          positionLabel={positionLabel}
          hasError={false}
        />
        <p className="text-text-muted mt-2 text-sm" aria-live="polite">
          {isCodeComplete(code, CODE_LENGTH) ? 'Código completo.' : 'Faltan dígitos.'}
        </p>
      </div>
      <div>
        <OneTimeCodeField
          id="catalog-code-error"
          value={wrongCode}
          onChange={setWrongCode}
          length={CODE_LENGTH}
          groupLabel="Código con error"
          positionLabel={positionLabel}
          hasError
          describedBy="catalog-code-error-message"
        />
        <p id="catalog-code-error-message" className="text-danger mt-2 text-xs">
          El código no es válido o ya caducó.
        </p>
      </div>
    </div>
  );
}
