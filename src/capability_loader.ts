import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
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
 * Environment variable for cap-cli path.
 * Can be overridden via the environment.
 */
const MCPORTER_CAP_CLI_PATH = 'MCPORTER_CAP_CLI_PATH';

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
 * Get the cap-cli path from environment or use default.
 */
export function getCapCliPath(): string {
  const path = process.env[MCPORTER_CAP_CLI_PATH];
  if (path) {
    return expandHome(path.trim());
  }
  return 'cap-cli';
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
 * Generate a verifiable request from a capability using cap-cli.
 * Requests are always generated fresh (one-time use).
 *
 * @param capabilityRequired - The capability ID (UUID) to generate request from.
 * @param paramText - The request parameter text to sign.
 * @returns The generated request JSON object, or undefined if generation failed.
 */
export function generateCapabilityRequest(capabilityRequired: string, paramText: string): unknown {
  // First read the capability
  const capability = read_capability(capabilityRequired);
  if (!capability) {
    return undefined;
  }

  const capCliPath = getCapCliPath();
  if (!existsSync(capCliPath)) {
    logger.warn(`cap-cli not found at "${capCliPath}". Set ${MCPORTER_CAP_CLI_PATH} environment variable to override.`);
    return undefined;
  }

  // Create temp directory for working files
  const tempDir = mkdtempSync(join(os.tmpdir(), 'mcporter-cap-'));
  const capFilePath = join(tempDir, `${capabilityRequired}.cap`);
  const requestFilePath = join(tempDir, `${capabilityRequired}.request`);

  try {
    // Write capability to temp file
    writeFileSync(capFilePath, JSON.stringify(capability), 'utf8');

    // Call cap-cli request command
    execFileSync(capCliPath, [
      'request',
      '-f', capFilePath,
      '-p', paramText,
      '-o', requestFilePath,
      '--silence'
    ], {
      stdio: ['ignore', 'ignore', 'inherit']
    });

    // Read back the generated request
    if (!existsSync(requestFilePath)) {
      logger.warn(`cap-cli did not generate request file at "${requestFilePath}"`);
      return undefined;
    }

    const requestContent = readFileSync(requestFilePath, 'utf8');
    return JSON.parse(requestContent);
  } catch (error) {
    logger.warn(`Failed to generate capability request: ${(error as Error).message}`);
    return undefined;
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(capFilePath)) unlinkSync(capFilePath);
      if (existsSync(requestFilePath)) unlinkSync(requestFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Clears the capability cache. Useful for testing or when capabilities change.
 */
export function clearCapabilityCache(): void {
  capabilityCache.clear();
}
