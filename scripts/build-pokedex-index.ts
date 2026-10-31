/**
 * Builds src/data/pokedex-index.json from PokéAPI.
 *
 *   npm run build:index                 # build (raw responses cached in .cache/pokeapi)
 *   npm run build:index -- --verify-artwork   # also HEAD-check every artwork URL
 *
 * The output is deterministic: no timestamps, entries sorted by id.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateIndex } from '../src/data/indexValidation.ts';
import { defaultVarietyUrl, mapIndexEntry } from '../src/data/pokeapi/mappers.ts';
import type { RawPokemon, RawSpecies, RawSpeciesList } from '../src/data/pokeapi/rawTypes.ts';
import type { PokemonIndexEntry } from '../src/domain/pokemon/types.ts';

const API = 'https://pokeapi.co/api/v2';
const CONCURRENCY = 6;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, '.cache', 'pokeapi');
const outFile = path.join(root, 'src', 'data', 'pokedex-index.json');
const verifyArtwork = process.argv.includes('--verify-artwork');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (error) {
    if (attempt >= 4) throw new Error(`Failed to fetch ${url}`, { cause: error });
    await sleep(500 * attempt ** 2);
    return fetchJson<T>(url, attempt + 1);
  }
}

/** Fetches a URL, using an on-disk cache so re-runs and retries do not hit the API again. */
async function cachedJson<T>(url: string): Promise<T> {
  const key = url.replace(`${API}/`, '').replace(/[^a-z0-9]+/gi, '-');
  const file = path.join(cacheDir, `${key}.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    const data = await fetchJson<T>(url);
    await writeFile(file, JSON.stringify(data));
    return data;
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i] as T, i);
      }
    }),
  );
  return results;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });

  const list = await cachedJson<RawSpeciesList>(`${API}/pokemon-species?limit=3000`);
  console.log(`PokéAPI reports ${list.count} species.`);
  const speciesUrls = list.results.map((r) => r.url);

  let done = 0;
  const entries = await mapPool(
    speciesUrls,
    CONCURRENCY,
    async (url): Promise<PokemonIndexEntry> => {
      const species = await cachedJson<RawSpecies>(url);
      const pokemon = await cachedJson<RawPokemon>(defaultVarietyUrl(species));
      if (++done % 100 === 0) console.log(`  ${done}/${speciesUrls.length}`);
      return mapIndexEntry(species, pokemon);
    },
  );
  entries.sort((a, b) => a.id - b.id);

  const problems = validateIndex(entries);
  if (entries.length !== list.count) {
    problems.push(`Built ${entries.length} entries but PokéAPI reports ${list.count} species`);
  }

  if (verifyArtwork) {
    console.log('Verifying artwork URLs…');
    const bad: string[] = [];
    await mapPool(entries, CONCURRENCY, async (entry) => {
      const res = await fetch(entry.artworkUrl, { method: 'HEAD' });
      if (!res.ok) bad.push(`#${entry.id} ${entry.slug}: artwork returned HTTP ${res.status}`);
    });
    problems.push(...bad.sort());
  }

  if (problems.length > 0) {
    console.error(`\nIndex validation failed (${problems.length} problems):`);
    for (const p of problems.slice(0, 50)) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  // One entry per line keeps diffs readable.
  const body = entries.map((e) => `    ${JSON.stringify(e)}`).join(',\n');
  const json = `{\n  "schemaVersion": 1,\n  "count": ${entries.length},\n  "entries": [\n${body}\n  ]\n}\n`;
  await writeFile(outFile, json);
  console.log(`Wrote ${entries.length} entries to ${path.relative(root, outFile)}`);
}

await main();
