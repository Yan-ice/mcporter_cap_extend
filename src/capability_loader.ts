import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPrefixedConsoleLogger } from './logging.js';
import { resolveBaseDir } from './daemon/paths.js';
import { expandHome } from './env.js';

const logger = createPrefixedConsoleLogger('capability-loader', 'warn');

/**
 * Environment variable name for the capabilities directory.
 * Can be overridden via the environment.
 */
const MCPORTER_CAPABILITIES_DIR = 'MCPORTER_CAPABILITIES_DIR';


/**
 * Cache for loaded capabilities to avoid repeated disk reads.
 */
const capabilityCache = new Map<string, unknown>();

/**
 * Get the capabilities directory from environment or use default.
 * Defaults to <base_dir>/capabilities where base_dir is ~/.mcporter
 * (or MCPORTER_DAEMON_DIR if set).
 */
function getCapabilitiesDir(): string {
  const dir = process.env[MCPORTER_CAPABILITIES_DIR];
  if (dir) {
    return expandHome(dir.trim());
  }
  return join(resolveBaseDir(), 'capabilities');
}

/**
 * Reads and loads a capability by its ID (UUID).
 * Capabilities are stored as JSON files in a configured directory.
 * Searches all JSON files for one where the `sid` field matches the capability ID.
 * Results are cached for performance.
 *
 * @param capabilityRequired - The capability ID (UUID) to load.
 * @returns The loaded capability JSON object, or undefined if not found.
 */
export function read_capability(capabilityRequired: string): unknown {
  // Check cache first
  if (capabilityCache.has(capabilityRequired)) {
    return capabilityCache.get(capabilityRequired);
  }

  const capabilitiesDir = getCapabilitiesDir();

  if (!existsSync(capabilitiesDir)) {
    logger.warn(`Capabilities directory "${capabilitiesDir}" does not exist`);
    capabilityCache.set(capabilityRequired, undefined);
    return undefined;
  }

  try {
    const files = readdirSync(capabilitiesDir, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) {
        continue;
      }

      const filePath = join(capabilitiesDir, file.name);
      try {
        const content = readFileSync(filePath, 'utf8');
        const json = JSON.parse(content);

        // Check if this capability matches by sid
        if (json && typeof json === 'object' && 'sid' in json && json.sid === capabilityRequired) {
          capabilityCache.set(capabilityRequired, json);
          return json;
        }
      } catch (error) {
        // Skip invalid JSON files
        logger.warn(`Failed to read or parse "${filePath}": ${(error as Error).message}`);
        continue;
      }
    }

    // If we get here, no matching capability was found
    logger.warn(`No capability found with sid "${capabilityRequired}" in directory "${capabilitiesDir}"`);
    capabilityCache.set(capabilityRequired, undefined);
    return undefined;
  } catch (error) {
    logger.warn(`Error reading capabilities directory "${capabilitiesDir}": ${(error as Error).message}`);
    capabilityCache.set(capabilityRequired, undefined);
    return undefined;
  }
}

/**
 * Clears the capability cache. Useful for testing or when capabilities change.
 */
export function clearCapabilityCache(): void {
  capabilityCache.clear();
}
