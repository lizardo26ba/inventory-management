'use client';

import { buttonClass } from '../../ui/button';
import { useCompanyStore } from '../../company-store';
import { type Copy } from '@/lib/i18n';
import { useCopy } from '@/lib/i18n';
import {
  products,
  stockStatusOf,
  type Product,
  type StockStatus,
  type TrackingMode,
} from '../../fake-data';
import { formatMoney, formatQuantity } from '@/lib/format';
import { IconFilter, IconPlus, IconSearch } from '../../ui/icons';

/**
 * Catálogo de productos.
 *
 * Es la pantalla de referencia para toda lista del sistema: barra de acciones,
 * tabla densa y pie de paginación. Las columnas numéricas van alineadas a la
 * derecha y con cifras de ancho fijo, porque una tabla de inventario se lee
 * comparando hacia abajo, no leyendo fila por fila.
 */

function trackingLabels(copy: Copy): Record<TrackingMode, string> {
  return { NONE: copy.tracking.none, LOT: copy.tracking.lot, SERIAL: copy.tracking.serial };
}

function stockStatusLabels(copy: Copy): Record<StockStatus, string> {
  return { ok: copy.status.ok, low: copy.status.low, out: copy.status.out };
}

const STOCK_STATUS_TONES: Record<StockStatus, string> = {
  ok: 'bg-success-soft text-success',
  low: 'bg-warning-soft text-warning',
  out: 'bg-danger-soft text-danger',
};

function StockCell({ product }: { readonly product: Product }): React.ReactElement {
  const status = stockStatusOf(product);
  const tone =
    status === 'out' ? 'text-danger' : status === 'low' ? 'text-warning' : 'text-text';

  return (
    <div className="flex items-center justify-end gap-2">
      <span className={`font-medium tabular-nums ${tone}`}>
        {formatQuantity(product.onHand)}
      </span>
      <span className="text-text-muted text-xs">{product.unit}</span>
    </div>
  );
}

export default function ProductsPage(): React.ReactElement {
  const copy = useCopy();

  const { activeCompany } = useCompanyStore();
  const currency = activeCompany?.currency ?? '';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.products.title}</h1>
          <p className="text-text-muted mt-1 text-sm">
            {activeCompany?.name ?? copy.products.subtitle}
          </p>
        </div>

        <button type="button" className={buttonClass({ size: 'sm' })}>
          <IconPlus className="h-4 w-4" />
          {copy.products.create}
        </button>
      </header>

      <div className="rounded-card border-border bg-surface overflow-hidden border">
        {/* Barra de acciones. La búsqueda es lo primero porque en un catálogo
            grande es la forma normal de llegar a una fila. */}
        <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <IconSearch className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              placeholder={copy.products.searchPlaceholder}
              aria-label={copy.products.searchPlaceholder}
              className="rounded-control border-border bg-canvas placeholder:text-text-muted h-9 w-full border pr-3 pl-9 text-sm"
            />
          </div>

          <button
            type="button"
            className="rounded-control border-border hover:bg-surface-muted inline-flex h-9 items-center gap-2 border px-3 text-sm transition-colors"
          >
            <IconFilter className="text-text-muted h-4 w-4" />
            {copy.products.filters}
          </button>

          <p className="text-text-muted ml-auto text-sm">
            {formatQuantity(products.length)} {copy.products.resultCount}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-border bg-surface-muted text-text-muted border-b text-left text-xs tracking-wide uppercase">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {copy.products.columnCode}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {copy.products.columnName}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {copy.products.columnCategory}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {copy.products.columnTracking}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  {copy.products.columnStock}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  {copy.products.columnCost}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {copy.products.columnStatus}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const status = stockStatusOf(product);
                return (
                  <tr
                    key={product.id}
                    className="border-border hover:bg-surface-muted border-b last:border-0"
                  >
                    <td className="text-text-muted px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                      {product.code}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{product.name}</span>
                      {!product.active ? (
                        <span className="rounded-control bg-surface-muted text-text-muted ml-2 px-1.5 py-0.5 text-xs">
                          {copy.status.inactive}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-text-muted px-4 py-2.5 whitespace-nowrap">
                      {product.category}
                    </td>
                    <td className="text-text-muted px-4 py-2.5 whitespace-nowrap">
                      {trackingLabels(copy)[product.tracking]}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <StockCell product={product} />
                    </td>
                    <td className="text-text-muted px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(product.averageCost, currency)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`rounded-control px-2 py-0.5 text-xs font-medium ${STOCK_STATUS_TONES[status]}`}
                      >
                        {stockStatusLabels(copy)[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <p className="text-text-muted">
            {copy.pagination.showing} 1 - {formatQuantity(products.length)} {copy.pagination.of}{' '}
            {formatQuantity(products.length)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="rounded-control border-border text-text-muted h-8 border px-3 text-sm disabled:opacity-50"
            >
              {copy.pagination.previous}
            </button>
            <button
              type="button"
              disabled
              className="rounded-control border-border text-text-muted h-8 border px-3 text-sm disabled:opacity-50"
            >
              {copy.pagination.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
