'use client';

/**
 * Selector de accesos: qué empresas alcanza una persona y con qué rol.
 *
 * Marcar la empresa concede el acceso; el rol dice con qué alcance. Son dos
 * decisiones distintas y por eso son dos controles, no un desplegable que
 * signifique las dos cosas.
 *
 * Los roles que se ofrecen son los de esa empresa, no una lista común. Los roles
 * pertenecen a cada empresa, así que una lista común acabaría concediendo en una
 * empresa un rol que es de otra.
 *
 * La lista se desplaza dentro de su caja. Con muchas empresas, el formulario
 * entero no puede crecer hasta dejar el botón de guardar fuera de la pantalla.
 */

import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { FilterInput } from '@/components/ui/filter-input';
import { CountryFlag } from '@/components/ui/flag';
import { Select } from '@/components/ui/form';
import { useCopy } from '@/lib/i18n';

import { type AccessInput } from '../schema';
import { type OrganizationChoice } from '../types';
import { roleName } from './role-name';

export function AccessPicker({
  organizations,
  accesses,
  onChange,
}: {
  readonly organizations: readonly OrganizationChoice[];
  readonly accesses: readonly AccessInput[];
  readonly onChange: (next: readonly AccessInput[]) => void;
}): React.ReactElement {
  const copy = useCopy();
  const [filter, setFilter] = useState('');

  const roleByOrganization = new Map(
    accesses.map((access) => [access.organizationId, access.roleId]),
  );

  const needle = filter.trim().toLowerCase();
  const visible =
    needle === ''
      ? organizations
      : organizations.filter((organization) =>
          organization.name.toLowerCase().includes(needle),
        );

  function toggle(organization: OrganizationChoice, isGranted: boolean): void {
    if (!isGranted) {
      onChange(accesses.filter((access) => access.organizationId !== organization.id));
      return;
    }

    // Se propone el rol que menos alcanza. Conceder por descuido el que más
    // alcanza es el error que no se puede permitir que sea el cómodo.
    const proposed =
      organization.roles.find((role) => role.code === 'viewer') ?? organization.roles[0];

    if (proposed === undefined) return;

    onChange([...accesses, { organizationId: organization.id, roleId: proposed.id }]);
  }

  function setRole(organizationId: string, roleId: string): void {
    onChange(
      accesses.map((access) =>
        access.organizationId === organizationId ? { ...access, roleId } : access,
      ),
    );
  }

  return (
    <>
      <FilterInput
        value={filter}
        onChange={setFilter}
        placeholder={copy.organizations.searchPlaceholder}
      />

      <div className="border-border rounded-control max-h-80 overflow-y-auto border">
        {visible.length === 0 ? (
          <p className="text-text-muted px-3 py-6 text-center text-sm">
            {copy.organizations.empty}
          </p>
        ) : (
          visible.map((organization) => {
            const roleId = roleByOrganization.get(organization.id);
            const isGranted = roleId !== undefined;

            return (
              <div
                key={organization.id}
                className="border-border flex items-center gap-3 border-b px-3 py-2 last:border-0"
              >
                <Checkbox
                  id={`grant-${organization.id}`}
                  checked={isGranted}
                  onChange={(next) => toggle(organization, next)}
                />
                <CountryFlag countryCode={organization.countryCode} className="h-4 w-4" />
                <label
                  htmlFor={`grant-${organization.id}`}
                  className="min-w-0 flex-1 truncate text-sm"
                >
                  {organization.name}
                </label>

                <Select
                  value={roleId ?? ''}
                  disabled={!isGranted}
                  onChange={(next) => setRole(organization.id, next)}
                  size="sm"
                  label={`${copy.userForm.roleColumn} · ${organization.name}`}
                  className="w-40 shrink-0"
                >
                  {/* Una empresa sin roles no puede recibir a nadie. No debería
                      ocurrir, porque nacen con los del sistema, y si ocurre se
                      dice en lugar de mostrar un desplegable vacío. */}
                  {organization.roles.length === 0 ? (
                    <option value="">{copy.userForm.permissionsEmpty}</option>
                  ) : (
                    organization.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {roleName(role, copy)}
                      </option>
                    ))
                  )}
                </Select>
              </div>
            );
          })
        )}
      </div>

      {accesses.length === 0 ? (
        <p className="text-warning text-xs">{copy.userForm.accessEmpty}</p>
      ) : null}
    </>
  );
}
