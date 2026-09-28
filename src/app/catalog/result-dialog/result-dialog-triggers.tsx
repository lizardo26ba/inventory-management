'use client';

import { buttonClass } from '@/components/ui/button';
import {
  ResultDialogProvider,
  resultMessageFor,
  useResultDialog,
  type ResultMessage,
} from '@/components/ui/result-dialog';
import { useCopy, type Copy } from '@/lib/i18n';

const SAMPLE_PERSON = 'Ana Morales';

type Sample = { readonly label: string; readonly build: (copy: Copy) => ResultMessage };

/**
 * Un caso por tono, armados con `resultMessageFor` para que el texto sea el
 * mismo que verá quien use la pantalla real, en el idioma elegido.
 */
const SAMPLES: readonly Sample[] = [
  {
    label: 'Éxito',
    build: (copy) => resultMessageFor(copy, 'userSuspend', SAMPLE_PERSON, { ok: true }),
  },
  {
    label: 'Error',
    build: (copy) =>
      resultMessageFor(copy, 'userDelete', SAMPLE_PERSON, {
        ok: false,
        error: { code: 'NOT_AUTHORIZED' },
      }),
  },
  {
    label: 'Advertencia',
    build: (copy) =>
      resultMessageFor(copy, 'userActivate', SAMPLE_PERSON, {
        ok: false,
        error: { code: 'STALE_VERSION' },
      }),
  },
];

function Triggers(): React.ReactElement {
  const copy = useCopy();
  const showResult = useResultDialog();

  return (
    <div className="flex flex-wrap gap-3">
      {SAMPLES.map((sample) => (
        <button
          key={sample.label}
          type="button"
          onClick={() => showResult(sample.build(copy))}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          {sample.label}
        </button>
      ))}
    </div>
  );
}

export function ResultDialogTriggers(): React.ReactElement {
  return (
    <ResultDialogProvider>
      <Triggers />
    </ResultDialogProvider>
  );
}
