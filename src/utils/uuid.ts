/**
 * Utility functions for UUID validation, generation, and safe conversion
 * Updated: Supabase UUID v4 compliance layer
 */

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensures a required ID is a valid UUID v4 format.
 * If the input is already a valid UUID, returns it.
 * If the input is missing or legacy string (e.g. 'prj-123'), converts or generates a valid UUID.
 */
export function safeUUID(str?: string | null): string {
  if (!str || str.trim() === '') {
    return generateUUID();
  }
  const clean = str.trim();
  if (isValidUUID(clean)) {
    return clean;
  }
  return simpleHashToUUID(clean);
}

/**
 * For optional foreign keys (template_id, project_id, worker_id).
 * Returns null if the input is empty, 'null', 'undefined', or '00000000-0000-0000-0000-000000000000'.
 */
export function safeUUIDNullable(str?: string | null): string | null {
  if (!str) return null;
  const clean = str.trim();
  if (
    clean === '' ||
    clean === 'null' ||
    clean === 'undefined' ||
    clean === '00000000-0000-0000-0000-000000000000'
  ) {
    return null;
  }
  if (isValidUUID(clean)) {
    return clean;
  }
  return simpleHashToUUID(clean);
}

function simpleHashToUUID(str: string): string {
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 << 5) - hash1 + char;
    hash1 |= 0;
    hash2 = (hash2 << 7) - hash2 + char;
    hash2 |= 0;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash1 + hash2).toString(16).padStart(8, '0');

  const full = (hex1 + hex2 + hex3 + hex4).substring(0, 32);
  return [
    full.substring(0, 8),
    full.substring(8, 12),
    '4' + full.substring(13, 16),
    'a' + full.substring(17, 20),
    full.substring(20, 32)
  ].join('-');
}
