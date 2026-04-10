/**
 * Signed param string for cap-cli (`-p`): `key=value,key=value,...` in
 * `inputSchema.properties` key order (skips `capability`).
 */
export function serializeCapabilityParamText(args: Record<string, unknown>, inputSchema: unknown): string {
  const keys = propertyKeysFromInputSchema(inputSchema);
  return keys.map((key) => `${key}=${encodeCapabilityArgValue(args[key])}`).join(',');
}

function propertyKeysFromInputSchema(inputSchema: unknown): string[] {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return [];
  }
  const record = inputSchema as Record<string, unknown>;
  if (record.type !== 'object' || typeof record.properties !== 'object' || record.properties === null) {
    return [];
  }
  return Object.keys(record.properties as Record<string, unknown>).filter((k) => k !== 'capability');
}

function encodeCapabilityArgValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
