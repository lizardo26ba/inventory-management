'use client';

import { useState } from 'react';

import { Field, INPUT_CLASS, inputBorderClass } from '@/components/ui/form';
import {
  PASSWORD_INPUT_CLASS,
  ShowPasswordSwitch,
  passwordInputType,
} from '@/components/ui/show-password-switch';

export function ShowPasswordDemo(): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="max-w-sm space-y-3">
      <Field id="catalog-password" label="Contraseña">
        <input
          id="catalog-password"
          type={passwordInputType(isVisible)}
          defaultValue="una-contraseña-de-muestra"
          autoComplete="off"
          className={`${INPUT_CLASS} ${inputBorderClass(false)} ${PASSWORD_INPUT_CLASS}`}
        />
      </Field>
      <ShowPasswordSwitch
        checked={isVisible}
        label="Mostrar contraseña"
        onChange={setIsVisible}
      />
    </div>
  );
}
