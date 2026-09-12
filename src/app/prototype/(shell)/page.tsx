'use client';

import { useCompanyStore } from '../company-store';
import { type Copy } from '@/lib/i18n';
import { useCopy } from '@/lib/i18n';
import {
  overviewMetrics,
  products,
  recentMovements,
  stockStatusOf,
  type Movement,
} from '../fake-data';
import { formatMoney, formatQuantity, formatSignedQuantity } from '@/lib/format';
import { IconAlert } from '../ui/icons';

/**
 * Resumen. Es la primera pantalla tras el acceso, así que responde a una sola
 * pregunta: qué necesita mi atención hoy. Por eso las cifras van arriba y lo
 * accionable, el stock bajo, ocupa el espacio principal.
 */

/** El rótulo depende del idioma, así que se arma al pintar y no al cargar. */
function movementLabels(copy: Copy): Record<Movement['kind'], string> {
  return {
    entry: copy.movement.entry,
    exit: copy.movement.exit,
    transfer: copy.movement.transfer,
    adjustment: copy.movement.adjustment,
  };
}

const MOVEMENT_TONES: Record<Movement['kind'], string> = {
  entry: 'bg-success-soft text-success',
  exit: 'bg-primary-soft text-primary',
  transfer: 'bg-surface-muted text-text-muted',
  adjustment: 'bg-warning-soft text-warning',
};

function MetricCard({
  label,
  value,
  hint,
  emphasis,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly emphasis?: 'warning' | 'danger';
}): React.ReactElement {
  const valueTone =
    emphasis === 'danger' ? 'text-danger' : emphasis === 'warning' ? 'text-warning' : '';

  return (
    <div className="rounded-card border-border bg-surface border p-4">
      <p className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p>
      {hint ? <p className="text-text-muted mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

export default function OverviewPage(): React.ReactElement {
  const copy = useCopy();

  const { activeCompany } = useCompanyStore();
  const currency = activeCompany?.currency ?? '';
  const lowStock = products.filter((product) => stockStatusOf(product) !== 'ok');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.overview.title}</h1>
        <p className="text-text-muted mt-1 text-sm">
          {activeCompany?.name ?? copy.overview.subtitle}
        </p>
      </header>

      <section
        aria-label={copy.overview.title}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label={copy.overview.stockValue}
          value={formatMoney(overviewMetrics.stockValue, currency)}
        />
        <MetricCard
          label={copy.overview.lowStock}
          value={formatQuantity(overviewMetrics.lowStockCount)}
          emphasis="danger"
        />
        <MetricCard
          label={copy.overview.expiringSoon}
          value={formatQuantity(overviewMetrics.expiringSoonCount)}
          emphasis="warning"
        />
        <MetricCard
          label={copy.overview.pendingReceipts}
          value={formatQuantity(overviewMetrics.pendingReceiptsCount)}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <section className="rounded-card border-border bg-surface overflow-hidden border">
          <h2 className="border-border flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
            <IconAlert className="text-danger h-4 w-4" />
            {copy.overview.lowStockTitle}
          </h2>

          {lowStock.length === 0 ? (
            <p className="text-text-muted px-4 py-8 text-center text-sm">
              {copy.overview.lowStockEmpty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-text-muted border-b text-left text-xs tracking-wide uppercase">
                    <th scope="col" className="px-4 py-2 font-medium">
                      {copy.products.columnName}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {copy.products.columnStock}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {copy.overview.lowStock}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((product) => (
                    <tr
                      key={product.id}
                      className="border-border hover:bg-surface-muted border-b last:border-0"
                    >
                      <td className="px-4 py-2">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-text-muted font-mono text-xs">{product.code}</p>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <span
                          className={
                            product.onHand === 0 ? 'text-danger font-medium' : 'text-warning'
                          }
                        >
                          {formatQuantity(product.onHand)}
                        </span>
                        <span className="text-text-muted ml-1 text-xs">{product.unit}</span>
                      </td>
                      <td className="text-text-muted px-4 py-2 text-right tabular-nums">
                        {formatQuantity(product.minimum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-card border-border bg-surface overflow-hidden border">
          <h2 className="border-border border-b px-4 py-3 text-sm font-semibold">
            {copy.overview.recentTitle}
          </h2>
          <ul>
            {recentMovements.map((movement) => (
              <li
                key={movement.id}
                className="border-border flex items-start gap-3 border-b px-4 py-3 last:border-0"
              >
                <span
                  className={`rounded-control px-2 py-0.5 text-xs font-medium ${MOVEMENT_TONES[movement.kind]}`}
                >
                  {movementLabels(copy)[movement.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{movement.productName}</p>
                  <p className="text-text-muted mt-0.5 text-xs">
                    {movement.warehouse} · {movement.reference} · {movement.happenedAt}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">
                  {formatSignedQuantity(
                    movement.kind === 'exit' ? -movement.quantity : movement.quantity,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
