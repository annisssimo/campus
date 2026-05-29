import { ARCHIVE_RETENTION_DAYS } from './archive.constants';

/** Tasks with deletedAt at or before this instant have completed the retention period. */
export function getArchiveRetentionCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - ARCHIVE_RETENTION_DAYS);
  return cutoff;
}
