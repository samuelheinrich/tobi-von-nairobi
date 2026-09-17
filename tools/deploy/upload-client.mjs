#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = join(repoRoot, 'apps/game-client/dist');

function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    )
      value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

async function deploymentConfig() {
  let fileValues = {};
  try {
    fileValues = parseEnv(await readFile(join(repoRoot, '.env'), 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const value = (key) => process.env[key] || fileValues[key] || '';
  const config = {
    host: value('FTP_IP'),
    user: value('FTP_user'),
    password: value('FTP_pass'),
    remotePath: value('FTP_path'),
  };
  const present = Object.values(config).filter(Boolean).length;
  if (present === 0) return null;
  const missing = Object.entries(config)
    .filter(([, entry]) => !entry)
    .map(([key]) => key);
  if (missing.length) throw new Error(`FTP-Konfiguration unvollständig: ${missing.join(', ')}`);
  if (
    config.remotePath === '/' ||
    config.remotePath.includes('..') ||
    !config.remotePath.startsWith('/public_html/')
  )
    throw new Error(`Unsicheres FTP-Zielverzeichnis abgelehnt: ${config.remotePath}`);
  return config;
}

async function inventory(path) {
  let files = 0;
  let bytes = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) {
      const child = await inventory(target);
      files += child.files;
      bytes += child.bytes;
    } else if (entry.isFile()) {
      files++;
      bytes += (await stat(target)).size;
    }
  }
  return { files, bytes };
}

const config = await deploymentConfig();
if (!config) {
  console.log('↷ FTP-Upload übersprungen: keine FTP-Werte in .env gesetzt.');
  process.exit(0);
}

const build = await inventory(dist);
if (!build.files) throw new Error(`Build-Verzeichnis ist leer: ${dist}`);

const client = new Client(60_000);
client.ftp.verbose = false;
try {
  await client.access({
    host: config.host,
    user: config.user,
    password: config.password,
    secure: true,
  });
  await client.ensureDir(config.remotePath);
  await client.clearWorkingDir();
  await client.uploadFromDir(dist);
  const mib = (build.bytes / 1024 / 1024).toFixed(1);
  console.log(
    `✓ FTP-Upload erfolgreich: ${build.files} Dateien (${mib} MiB) nach ${config.remotePath}`,
  );
} catch (error) {
  throw new Error(`FTP-Upload fehlgeschlagen: ${error instanceof Error ? error.message : error}`, {
    cause: error,
  });
} finally {
  client.close();
}
