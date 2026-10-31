import { describe, expect, it, vi } from 'vitest';
import { fixtures } from '../test/fixtures/pokeapi/index.ts';
import { createDetailsCache } from './pokeapi/cache.ts';
import type { PokeApiClient } from './pokeapi/client.ts';
import { createPokemonRepository } from './pokemonRepository.ts';

function makeClient() {
  const getBundle = vi.fn(async () => fixtures.bulbasaur);
  const client: PokeApiClient = { getBundle };
  return { client, getBundle };
}

describe('createPokemonRepository', () => {
  it('fetches once, then serves from memory', async () => {
    const { client, getBundle } = makeClient();
    const repo = createPokemonRepository({ client, cache: createDetailsCache() });
    const first = await repo.getDetails(1);
    const second = await repo.getDetails(1);
    expect(first.name).toBe('Bulbasaur');
    expect(second).toBe(first);
    expect(getBundle).toHaveBeenCalledTimes(1);
  });

  it('shares one request between concurrent callers', async () => {
    const { client, getBundle } = makeClient();
    const repo = createPokemonRepository({ client, cache: createDetailsCache() });
    const [a, b] = await Promise.all([repo.getDetails(1), repo.getDetails(1)]);
    expect(a).toBe(b);
    expect(getBundle).toHaveBeenCalledTimes(1);
  });

  it('uses LocalStorage across repository instances (a page reload)', async () => {
    const first = makeClient();
    await createPokemonRepository({ client: first.client }).getDetails(1);
    expect(first.getBundle).toHaveBeenCalledTimes(1);

    const second = makeClient();
    const details = await createPokemonRepository({ client: second.client }).getDetails(1);
    expect(details.name).toBe('Bulbasaur');
    expect(second.getBundle).not.toHaveBeenCalled();
  });

  it('does not cache failures, so a later call can succeed', async () => {
    const getBundle = vi
      .fn<PokeApiClient['getBundle']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(fixtures.bulbasaur);
    const repo = createPokemonRepository({ client: { getBundle }, cache: createDetailsCache() });
    await expect(repo.getDetails(1)).rejects.toThrow('offline');
    await expect(repo.getDetails(1)).resolves.toMatchObject({ id: 1 });
    expect(getBundle).toHaveBeenCalledTimes(2);
  });
});
