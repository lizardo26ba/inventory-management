'use client';

/**
 * Detalle de una entrada de la bitácora.
 *
 * Va en un panel lateral y no dentro de la fila: el antes y después es una
 * tabla propia, y meterla en una fila expandida rompe la lectura vertical de la
 * lista, que es para lo que sirve la lista.
 *
 * Se abre y se cierra desde la dirección. Un registro concreto se puede pasar por
 * enlace a quien tenga que revisarlo, y la pantalla real lo pintará en el
 * servidor sin pedirlo aparte.
 *
 * Desde la correlación se llega a la operación entera. Es la pregunta que sigue
 * a casi todo registro: qué más salió del mismo guardado.
 *
 * La base guarda el antes y el después como dos objetos con solo los campos que
 * cambiaron. La tabla los junta campo a campo; los valores llegan sin formato y
 * se presentan aquí, en el idioma de quien mira.
 */

import Link from 'next/link';

import { toChangeRows, type AuditEntry, type AuditValue } from '../../audit-data';
import { Avatar } from '../../ui/avatar';
import { useCopy, type Copy } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { IconShield } from '../../ui/icons';
import { SidePanel } from '../../ui/side-panel';

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
  closeHref,
  operationHref,
}: {
  readonly entry: AuditEntry;
  /** La lista tal como estaba, sin el panel. */
  readonly closeHref: string;
  /** La lista filtrada por la correlación de esta entrada. */
  readonly operationHref: string;
}): React.ReactElement {
  const copy = useCopy();

  const changes = toChangeRows(entry.before, entry.after);

  return (
    <SidePanel
      eyebrow={copy.audit.detailTitle}
      title={copy.auditActions[entry.action]}
      subtitle={<span className="font-mono">{entry.action}</span>}
      closeHref={closeHref}
      closeLabel={copy.audit.closeDetail}
      footer={copy.audit.appendOnly}
    >
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
          <span className="text-text-muted block font-mono text-xs">{entry.entityType}</span>
        </Row>

        <Row label={copy.audit.detailAddress}>
          <span className="font-mono text-xs">{entry.ipAddress ?? copy.audit.emptyValue}</span>
        </Row>

        <Row label={copy.audit.detailUserAgent}>
          <span className="text-xs">{entry.userAgent ?? copy.audit.emptyValue}</span>
        </Row>

        <Row label={copy.audit.detailCorrelation}>
          <span className="block font-mono text-xs">{entry.correlationId}</span>
          <Link
            href={operationHref as never}
            scroll={false}
            className="text-primary mt-1 inline-block text-xs hover:underline"
          >
            {copy.audit.viewOperation}
          </Link>
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
    </SidePanel>
  );
}
