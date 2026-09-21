/**
 * Auditoría de dependencias para la integración continua.
 *
 * Falla ante cualquier aviso alto o crítico, salvo los anotados en
 * `audit-exceptions.json`, cada uno con su motivo y su fecha de caducidad. Es la
 * decisión del ADR 0011: la regla de seguridad pide cero vulnerabilidades altas, y
 * hoy hay algunas que solo se arreglan con una versión mayor del marco. En lugar de
 * apagar la auditoría, cada excepción queda escrita, justificada y con fecha.
 *
 * Tres cosas hacen fallar la ejecución:
 *
 * 1. Un aviso alto o crítico que no está en la lista.
 * 2. Una excepción caducada. Caducar obliga a volver a mirarla, no a renovarla por
 *    costumbre.
 * 3. Una excepción que ya no corresponde a ningún aviso. Si nadie la borra, la lista
 *    acaba justificando lo que ya no existe.
 *
 * La fecha de hoy es el día del calendario en tiempo universal: la caducidad es una
 * fecha civil, no un instante. Ver docs/standards/dates-and-times.md
 *
 * Sin dependencias nuevas: lee la salida de `npm audit --json`.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { z } from 'zod';

const EXCEPTIONS_FILE = 'scripts/ci/audit-exceptions.json';
const AUDIT_COMMAND = 'npm audit --json';
/** El informe de npm crece con el árbol de dependencias; veinte megas sobran. */
const MAX_REPORT_BYTES = 20 * 1024 * 1024;
const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const ADVISORY_ID = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/;
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

const exceptionsSchema = z.array(
  z.object({
    advisory: z.string().regex(ADVISORY_ID),
    package: z.string().min(1),
    reason: z.string().min(1),
    expires: z.string().regex(CALENDAR_DAY),
  }),
);

type Advisory = {
  readonly id: string;
  readonly packageName: string;
  readonly severity: string;
  readonly title: string;
};

const viaSchema = z.object({
  name: z.string(),
  severity: z.string(),
  title: z.string(),
  url: z.string(),
});

const auditSchema = z.object({
  vulnerabilities: z.record(
    z.string(),
    z.object({ via: z.array(z.union([z.string(), viaSchema])) }),
  ),
});

function readAdvisories(): readonly Advisory[] {
  // npm sale con código distinto de cero cuando encuentra algo, así que no se mira
  // el código: se mira lo que dice. Va por la shell porque en Windows npm es un .cmd,
  // y como una sola orden fija: sin argumentos que concatenar, no hay nada que
  // escapar.
  const result = spawnSync(AUDIT_COMMAND, {
    encoding: 'utf8',
    shell: true,
    maxBuffer: MAX_REPORT_BYTES,
  });

  const report = auditSchema.parse(JSON.parse(result.stdout));
  const byId = new Map<string, Advisory>();

  for (const vulnerability of Object.values(report.vulnerabilities)) {
    for (const via of vulnerability.via) {
      // Una cadena solo dice que el problema viene de otro paquete de la lista, que
      // se recorre por su cuenta.
      if (typeof via === 'string') continue;

      const id = ADVISORY_ID.exec(via.url)?.[0];
      if (id === undefined) continue;

      byId.set(id, { id, packageName: via.name, severity: via.severity, title: via.title });
    }
  }

  return [...byId.values()];
}

function main(): number {
  const today = new Date().toISOString().slice(0, 10);
  const exceptions = exceptionsSchema.parse(JSON.parse(readFileSync(EXCEPTIONS_FILE, 'utf8')));
  const advisories = readAdvisories();

  const exceptionIds = new Set(exceptions.map((exception) => exception.advisory));
  const currentIds = new Set(advisories.map((advisory) => advisory.id));
  const problems: string[] = [];

  for (const advisory of advisories) {
    if (!BLOCKING_SEVERITIES.has(advisory.severity)) continue;
    if (exceptionIds.has(advisory.id)) continue;

    problems.push(
      `Aviso ${advisory.severity} sin excepción: ${advisory.id} en ${advisory.packageName} (${advisory.title}).`,
    );
  }

  for (const exception of exceptions) {
    if (exception.expires < today) {
      problems.push(
        `Excepción caducada el ${exception.expires}: ${exception.advisory} en ${exception.package}. Revísala.`,
      );
    }
    if (!currentIds.has(exception.advisory)) {
      problems.push(
        `Excepción que ya no hace falta: ${exception.advisory} en ${exception.package}. Bórrala de ${EXCEPTIONS_FILE}.`,
      );
    }
  }

  const blocking = advisories.filter((advisory) => BLOCKING_SEVERITIES.has(advisory.severity));
  console.log(
    `Avisos encontrados: ${advisories.length}, de ellos altos o críticos: ${blocking.length}. Excepciones vigentes: ${exceptions.length}.`,
  );

  if (problems.length === 0) {
    console.log('Auditoría de dependencias en orden.');
    return 0;
  }

  for (const problem of problems) console.error(`- ${problem}`);
  console.error('Ver docs/adr/0011-integracion-continua-en-github-actions.md');
  return 1;
}

process.exitCode = main();
