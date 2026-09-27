import { redirect } from 'next/navigation';

import { resolveLanding } from '@/modules/auth/landing';
import { findCompanySummary } from '@/modules/auth/repository';
import { requiresPlatformAdminTwoFactor } from '@/lib/config/env.server';
import {
  CHANGE_PASSWORD_PATH,
  SELECT_COMPANY_PATH,
  SIGN_IN_PATH,
  TWO_FACTOR_PATH,
  TWO_FACTOR_SETUP_PATH,
} from '@/modules/auth/routes';
import { getSession, requireCompanySession } from '@/modules/auth/session';
import { ORGANIZATIONS_PATH } from '@/modules/organizations/routes';

import { CompanyOverview } from './company-overview';

/**
 * La raíz no es una pantalla: es un desvío.
 *
 * A dónde va cada persona lo decide `resolveLanding`, que es una función pura y
 * está probada aparte. Aquí solo se traduce esa decisión a una ruta, de modo que
 * si mañana cambia el criterio, cambia en un sitio y no en cada pantalla.
 */
export default async function RootPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);

  const landing = resolveLanding(session, {
    twoFactorRequired: requiresPlatformAdminTwoFactor,
  });

  switch (landing.kind) {
    case 'changePassword':
      redirect(CHANGE_PASSWORD_PATH);
    case 'twoFactorSetup':
      redirect(TWO_FACTOR_SETUP_PATH);
    case 'twoFactorVerify':
      redirect(TWO_FACTOR_PATH);
    case 'organizations':
      redirect(ORGANIZATIONS_PATH);
    case 'company': {
      // La portada de la empresa activa. Pasa por la puerta de la empresa como
      // cualquier otra pantalla de la operación.
      const company = await requireCompanySession();
      const summary = await findCompanySummary(company.organizationId);
      return <CompanyOverview companyName={summary?.name ?? ''} />;
    }
    case 'chooseCompany':
      redirect(SELECT_COMPANY_PATH);
  }
}
