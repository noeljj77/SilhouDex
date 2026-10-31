import { SCHEMA_VERSION } from '../domain/progression/record.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import { normalizeProgress } from './sanitize.ts';

/** Upgrades stored data one version at a time. The key is the version it upgrades FROM. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Add `n: (v_n) => v_n+1` here whenever the stored shape changes, and bump SCHEMA_VERSION.
 * Existing players' data is then upgraded on load instead of being lost.
 */
export const MIGRATIONS: Record<number, Migration> = {};

export type MigrationResult =
  /** Data is usable (possibly after upgrading). */
  | { status: 'ok'; data: ProgressData; migrated: boolean }
  /** Data was written by a newer version of the app: do not touch or overwrite it. */
  | { status: 'future' }
  /** Data is not usable at all. */
  | { status: 'invalid' };

export interface MigrationOptions {
  current?: number;
  migrations?: Record<number, Migration>;
  now: string;
  playerId: string;
}

export function migrateToCurrent(raw: unknown, options: MigrationOptions): MigrationResult {
  const current = options.current ?? SCHEMA_VERSION;
  const migrations = options.migrations ?? MIGRATIONS;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { status: 'invalid' };

  let data = raw as Record<string, unknown>;
  let version = data.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return { status: 'invalid' };
  if (version > current) return { status: 'future' };

  const startedAt = version;
  while (version < current) {
    const step = migrations[version];
    if (!step) return { status: 'invalid' };
    try {
      data = { ...step(data), schemaVersion: version + 1 };
    } catch {
      return { status: 'invalid' };
    }
    version += 1;
  }

  const normalized = normalizeProgress(data, options.now, options.playerId, current);
  return normalized
    ? { status: 'ok', data: normalized, migrated: startedAt !== current }
    : { status: 'invalid' };
}
