import "server-only";

const DEFAULT_RETENTION_HOURS = 24;

function parseRetentionHours(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_RETENTION_HOURS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RETENTION_HOURS;
  }

  return parsed;
}

export function getTenantRetentionHours(): number {
  return parseRetentionHours(
    process.env.TENANT_RETENTION_HOURS ||
      process.env.NON_SEEDED_RETENTION_HOURS,
  );
}

export function getNonSeededPruneAfterDate(from = new Date()): Date {
  const hours = getTenantRetentionHours();
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function getTenantStaleCutoffDate(from = new Date()): Date {
  const hours = getTenantRetentionHours();
  return new Date(from.getTime() - hours * 60 * 60 * 1000);
}
