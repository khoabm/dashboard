/** Initializes only the explicitly approved UAT ledger once; Start never initializes or replenishes it. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ownerUatProfile } from './owner-ai-hosted.mjs';

export const incidentLedgerHash = ownerUatProfile.incidentHash;

/** Validates immutable incident carry plus observed status/revocation, without granting network access. */
export function ownerUatInitialLedger(incidentBytes, audit) {
  if (createHash('sha256').update(incidentBytes).digest('hex') !== incidentLedgerHash)
    throw Error('BLOCKED: incident ledger changed');
  const incident = JSON.parse(incidentBytes);
  const status = audit.events?.find((r) => r.activity === 'status');
  const revoked = audit.events?.find((r) => r.activity === 'revoked-status');
  if (
    incident.operations !== 31 ||
    !incident.blocked ||
    audit.cumulative !== 34 ||
    audit.operations !== 3 ||
    audit.inferences !== 0 ||
    status?.state !== 'observed' ||
    status.status !== 200 ||
    status.budget?.count !== 3 ||
    status.budget.stopped !== true ||
    revoked?.state !== 'observed' ||
    revoked.status !== 403 ||
    audit.postState?.enabled !== false ||
    audit.postState.access !== false
  )
    throw Error('BLOCKED: missing verified carry');
  return {
    identity: ownerUatProfile.identity,
    limit: ownerUatProfile.limit,
    operations: 34,
    qaReservations: 0,
    ownerReservations: 0,
    blocked: false,
    incidentHash: incidentLedgerHash,
    authorization:
      'Owner approved fixed UAT identity,3 lifetime reservations QA1/owner2,cumulative60; 2026-10-29',
    receipts: [
      {
        at: new Date().toISOString(),
        activity: 'immutable incident31 + verified status/revocation3',
        operations: 34,
        state: 'observed',
      },
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const value = ownerUatInitialLedger(
    readFileSync('tests/local/owner-ai-pilot/ledger.json'),
    JSON.parse(readFileSync('tests/local/uat-retest/status-receipt.json', 'utf8')),
  );
  mkdirSync(ownerUatProfile.directory, { recursive: true });
  // Exclusive creation is intentional: a second Setup must never reset spent or blocked state.
  writeFileSync(resolve(ownerUatProfile.directory, 'ledger.json'), JSON.stringify(value, null, 2), {
    flag: 'wx',
  });
  console.log(`Initialized ${value.identity} once at34/60; no network or inference.`);
}
