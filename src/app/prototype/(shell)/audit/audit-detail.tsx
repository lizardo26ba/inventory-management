'use client';

/**
 * Detalle de una entrada de la bitácora.
 *
 * Va en un panel lateral y no dentro de la fila: el antes y después es una
 * tabla propia, y meterla en una fila expandida rompe la lectura vertical de la
 * lista, que es para lo que sirve la lista.
 *
 * Es modal, así que repone lo mismo que el diálogo de confirmación: el foco
 * entra, el tabulador da vueltas dentro, Escape cierra y el foco vuelve a donde
 * estaba. El fondo no se desplaza mientras está abierto.
 *
 * La base guarda el antes y el después como dos objetos con solo los campos que
 * cambiaron. La tabla los junta campo a campo; los valores llegan sin formato y
 * se presentan aquí, en el idioma de quien mira.
 */

import { useEffect, useId, useRef } from 'react';

import { toChangeRows, type AuditEntry, type AuditValue } from '../../audit-data';
import { Avatar } from '../../ui/avatar';
import { useCopy, type Copy } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { IconClose, IconShield } from '../../ui/icons';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, select, textarea';

/** Un instante tal como lo escribe la bitácora: ISO 8601 en tiempo universal. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Un valor de la bitácora, listo para leer.
 *
 * Un instante se muestra con fecha y hora locales, un sí o no en palabras, y un
 * vacío con la palabra que lo dice, para no confundirlo con un texto vacío.
 */
function formatValue(value: AuditValue, copy: Copy): string {
  if (value === null) return copy.audit.emptyValue;
  if (typeof value === 'boolean') return value ? copy.audit.valueTrue : copy.audit.valueFalse;
  if (typeof value === 'string' && ISO_INSTANT.test(value)) return formatDateTime(value);
  return String(value);
}

function Row({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="border-border grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-text-muted text-xs">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export function AuditDetail({
  entry,
  onClose,
}: {
  readonly entry: AuditEntry;
  readonly onClose: () => void;
}): React.ReactElement {
  const copy = useCopy();

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    closeRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  const changes = toChangeRows(entry.before, entry.after);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="border-border bg-surface relative flex h-full w-full max-w-md flex-col border-l shadow-xl"
      >
        <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-text-muted text-xs">{copy.audit.detailTitle}</p>
            <h2 id={titleId} className="mt-0.5 text-base font-semibold">
              {copy.auditActions[entry.action]}
            </h2>
            <p className="text-text-muted mt-0.5 font-mono text-xs">{entry.action}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="hover:bg-surface-muted text-text-muted hover:text-text rounded-control shrink-0 p-1.5 transition-colors"
          >
            <IconClose className="h-4 w-4" />
            <span className="sr-only">{copy.audit.closeDetail}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          <dl>
            <Row label={copy.audit.detailWhen}>{formatDateTime(entry.createdAt)}</Row>

            <Row label={copy.audit.detailActor}>
              {entry.actor === null ? (
                <span className="text-text-muted italic">{copy.audit.noActor}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Avatar name={entry.actor.name} className="h-6 w-6" />
                  <span className="min-w-0">
                    <span className="block">{entry.actor.name}</span>
                    <span className="text-text-muted block text-xs">{entry.actor.email}</span>
                  </span>
                </span>
              )}
              {entry.actingAsPlatformAdmin ? (
                <span className="bg-warning-soft text-warning rounded-control mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium">
                  <IconShield className="h-3.5 w-3.5" />
                  {copy.audit.elevated}
                </span>
              ) : null}
            </Row>

            <Row label={copy.audit.detailPermission}>
              {entry.permissionCode === null ? (
                <span className="text-text-muted">{copy.audit.noPermission}</span>
              ) : (
                <span className="font-mono text-xs">{entry.permissionCode}</span>
              )}
            </Row>

            <Row label={copy.audit.detailCompany}>
              {entry.organizationName ?? copy.audit.platformScope}
            </Row>

            <Row label={copy.audit.detailEntity}>
              <span className="block">{entry.entityLabel ?? copy.audit.emptyValue}</span>
              <span className="text-text-muted block font-mono text-xs">
                {entry.entityType}
              </span>
            </Row>

            <Row label={copy.audit.detailAddress}>
              <span className="font-mono text-xs">
                {entry.ipAddress ?? copy.audit.emptyValue}
              </span>
            </Row>

            <Row label={copy.audit.detailUserAgent}>
              <span className="text-xs">{entry.userAgent ?? copy.audit.emptyValue}</span>
            </Row>

            <Row label={copy.audit.detailCorrelation}>
              <span className="font-mono text-xs">{entry.correlationId}</span>
            </Row>
          </dl>

          <h3 className="mt-4 text-sm font-semibold">{copy.audit.detailChanges}</h3>

          {changes.length === 0 ? (
            <p className="text-text-muted mt-2 text-sm">{copy.audit.detailNoChanges}</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-border text-text-muted border-b text-left text-xs tracking-wide uppercase">
                  <th scope="col" className="py-2 font-medium">
                    {copy.audit.detailField}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {copy.audit.detailBefore}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {copy.audit.detailAfter}
                  </th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.field} className="border-border border-b last:border-0">
                    <td className="py-2 pr-2 font-mono text-xs">{change.field}</td>
                    <td className="text-text-muted py-2 pr-2 text-xs line-through">
                      {formatValue(change.before, copy)}
                    </td>
                    <td className="py-2 text-xs">{formatValue(change.after, copy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="border-border text-text-muted border-t px-5 py-3 text-xs">
          {copy.audit.appendOnly}
        </p>
      </div>
    </div>
  );
}
