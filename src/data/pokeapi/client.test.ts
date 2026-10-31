import { describe, expect, it, vi } from 'vitest';
import { fixtures } from '../../test/fixtures/pokeapi/index.ts';
import { createPokeApiClient, PokeApiError } from './client.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Serves the Bulbasaur fixture for the three endpoints the client calls. */
function serve(overrides: Record<string, () => Response> = {}) {
  const { species, pokemon, chain } = fixtures.bulbasaur;
  const calls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const override = Object.entries(overrides).find(([part]) => url.includes(part));
    if (override) return override[1]();
    if (url.includes('/pokemon-species/')) return json(species);
    if (url.includes('/pokemon/')) return json(pokemon);
    if (url.includes('/evolution-chain/')) return json(chain);
    return json({}, 404);
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe('createPokeApiClient', () => {
  it('fetches species, pokemon and evolution chain', async () => {
    const { impl, calls } = serve();
    const bundle = await createPokeApiClient({ fetch: impl }).getBundle(1);
    expect(bundle.species.name).toBe('bulbasaur');
    expect(bundle.pokemon.name).toBe('bulbasaur');
    expect(bundle.chain?.id).toBe(1);
    expect(calls).toEqual([
      'https://pokeapi.co/api/v2/pokemon-species/1',
      'https://pokeapi.co/api/v2/pokemon/1',
      'https://pokeapi.co/api/v2/evolution-chain/1',
    ]);
  });

  it('retries temporary server errors', async () => {
    let attempts = 0;
    const { impl } = serve({
      '/pokemon-species/': () =>
        ++attempts < 3 ? json({}, 503) : json(fixtures.bulbasaur.species),
    });
    const bundle = await createPokeApiClient({ fetch: impl, retryDelayMs: 0 }).getBundle(1);
    expect(bundle.species.id).toBe(1);
    expect(attempts).toBe(3);
  });

  it('retries network failures', async () => {
    let attempts = 0;
    const { impl: base } = serve();
    const flaky = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/pokemon-species/') && ++attempts === 1) {
        throw new TypeError('Failed to fetch');
      }
      return base(input);
    }) as unknown as typeof fetch;
    await createPokeApiClient({ fetch: flaky, retryDelayMs: 0 }).getBundle(1);
    expect(attempts).toBe(2);
  });

  it('does not retry a 404', async () => {
    let attempts = 0;
    const { impl } = serve({ '/pokemon-species/': () => (attempts++, json({}, 404)) });
    const promise = createPokeApiClient({ fetch: impl, retryDelayMs: 0 }).getBundle(1);
    await expect(promise).rejects.toMatchObject({ name: 'PokeApiError', status: 404 });
    expect(attempts).toBe(1);
  });

  it('gives up after the maximum attempts', async () => {
    let attempts = 0;
    const { impl } = serve({ '/pokemon-species/': () => (attempts++, json({}, 500)) });
    const client = createPokeApiClient({ fetch: impl, retryDelayMs: 0, maxAttempts: 2 });
    await expect(client.getBundle(1)).rejects.toBeInstanceOf(PokeApiError);
    expect(attempts).toBe(2);
  });

  it('treats a failed evolution chain as "no chain" instead of failing', async () => {
    const { impl } = serve({ '/evolution-chain/': () => json({}, 404) });
    const bundle = await createPokeApiClient({ fetch: impl, retryDelayMs: 0 }).getBundle(1);
    expect(bundle.chain).toBeNull();
  });

  it('skips the chain request for species without one', async () => {
    const { species, pokemon } = fixtures.bulbasaur;
    const { impl, calls } = serve({
      '/pokemon-species/': () => json({ ...species, evolution_chain: null }),
      '/pokemon/': () => json(pokemon),
    });
    const bundle = await createPokeApiClient({ fetch: impl }).getBundle(1);
    expect(bundle.chain).toBeNull();
    expect(calls.some((c) => c.includes('evolution-chain'))).toBe(false);
  });

  it('only requests the configured API host, whatever URLs the payload contains', async () => {
    const { species, pokemon } = fixtures.bulbasaur;
    const hostile = {
      ...species,
      varieties: [
        { is_default: true, pokemon: { name: 'x', url: 'https://evil.example/pokemon/1/' } },
      ],
      evolution_chain: { url: 'https://evil.example/evolution-chain/1/' },
    };
    const { impl, calls } = serve({
      '/pokemon-species/': () => json(hostile),
      '/pokemon/': () => json(pokemon),
    });
    await createPokeApiClient({ fetch: impl }).getBundle(1);
    for (const url of calls) expect(url.startsWith('https://pokeapi.co/api/v2/')).toBe(true);
  });
});
