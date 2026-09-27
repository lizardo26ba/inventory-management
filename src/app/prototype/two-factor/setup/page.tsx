'use client';

/**
 * Activar el segundo factor. RN-005.
 *
 * Llega aquí el super administrador que todavía no lo tiene, justo después de la
 * contraseña. No hay forma de saltarlo: sin segundo factor la cuenta de
 * plataforma no abre nada. ADR 0005.
 *
 * Son dos momentos en la misma pantalla. Primero se escanea y se confirma con un
 * código, porque activar sin confirmar deja a alguien con un factor que su
 * teléfono no genera. Después se enseñan los códigos de respaldo, una sola vez, y
 * no se sigue hasta que la persona dice que los guardó.
 */

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { useCopy } from '@/lib/i18n';
import {
  DEMO_RECOVERY_CODES,
  DEMO_TWO_FACTOR_CODE,
  DEMO_TWO_FACTOR_KEY,
} from '../../demo-credentials';
import { simulateWrite } from '../../latency';
import { landingFor, useSessionStore } from '../../session-store';
import { ActionButton, useAsyncAction } from '../../ui/action-button';
import { buttonClass } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Field } from '../../ui/form';
import { FormAlert } from '../../ui/form-alert';
import { OneTimeCodeField } from '../../ui/one-time-code-field';
import { QrCode } from '../../ui/qr-code';
import { RecoveryCodes } from '../../ui/recovery-codes';
import { TwoFactorFrame } from '../two-factor-frame';

const CODE_LENGTH = 6;

type Step = 'scan' | 'codes';

export default function TwoFactorSetupPage(): React.ReactElement {
  const copy = useCopy();
  const [step, setStep] = useState<Step>('scan');

  return step === 'scan' ? (
    <TwoFactorFrame title={copy.twoFactor.setupTitle} subtitle={copy.twoFactor.setupSubtitle}>
      <ScanStep onActivated={() => setStep('codes')} />
    </TwoFactorFrame>
  ) : (
    <TwoFactorFrame title={copy.twoFactor.codesTitle} subtitle={copy.twoFactor.codesSubtitle}>
      <CodesStep />
    </TwoFactorFrame>
  );
}

function ScanStep({ onActivated }: { readonly onActivated: () => void }): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();
  const fieldId = useId();

  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    if (code.length !== CODE_LENGTH) {
      setFieldError(copy.twoFactor.codeRequired);
      return;
    }
    setFieldError(null);

    void submit.run(async () => {
      await simulateWrite();
      if (code !== DEMO_TWO_FACTOR_CODE) {
        setFormError(copy.twoFactor.invalidCode);
        return;
      }
      onActivated();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold">{copy.twoFactor.stepScan}</h2>
        <p className="text-text-muted mt-1 text-xs">{copy.twoFactor.stepScanHelp}</p>
        <div className="mt-4 flex justify-center">
          <QrCode label={copy.twoFactor.qrLabel} />
        </div>
        <p className="text-text-muted mt-4 text-xs">{copy.twoFactor.manualKey}</p>
        {/* Por grupos que no se parten: quien la teclea en el teléfono va de
            cuatro en cuatro, y un grupo cortado entre dos líneas se salta. */}
        <p className="bg-surface-muted rounded-control mt-1 flex flex-wrap justify-center gap-x-2 px-3 py-2 font-mono text-sm select-all">
          {DEMO_TWO_FACTOR_KEY.split(' ').map((group, index) => (
            <span key={index} className="whitespace-nowrap">
              {group}
            </span>
          ))}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <h2 className="text-sm font-semibold">{copy.twoFactor.stepConfirm}</h2>
        {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

        <Field
          id={fieldId}
          label={copy.twoFactor.codeLabel}
          help={copy.twoFactor.codeHelp}
          error={fieldError ?? undefined}
        >
          <OneTimeCodeField
            id={fieldId}
            value={code}
            onChange={setCode}
            length={CODE_LENGTH}
            hasError={fieldError !== null}
            describedBy={fieldError !== null ? `${fieldId}-error` : `${fieldId}-help`}
          />
        </Field>

        <ActionButton
          type="submit"
          isPending={submit.isPending}
          pendingLabel={copy.twoFactor.activating}
          className="h-10 w-full"
        >
          {copy.twoFactor.activate}
        </ActionButton>
      </form>
    </div>
  );
}

function CodesStep(): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const { account, completeTwoFactorSetup } = useSessionStore();
  const checkboxId = useId();
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-6 space-y-4">
      <RecoveryCodes
        codes={DEMO_RECOVERY_CODES}
        label={copy.twoFactor.codesLabel}
        copyLabel={copy.twoFactor.copyCodes}
        copiedLabel={copy.twoFactor.codesCopied}
      />

      <label htmlFor={checkboxId} className="flex items-start gap-2 text-sm">
        <span className="mt-0.5">
          <Checkbox id={checkboxId} checked={saved} onChange={setSaved} />
        </span>
        {copy.twoFactor.codesSaved}
      </label>

      <button
        type="button"
        disabled={!saved}
        onClick={() => {
          completeTwoFactorSetup();
          router.push(landingFor(account).path as never);
        }}
        className={buttonClass({ className: 'h-10 w-full' })}
      >
        {copy.twoFactor.finish}
      </button>
    </div>
  );
}
