import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, test } from 'vitest';

import { SOURCES } from '../src/donnees/sources';

/**
 * Les sources du site sont celles de l'application. Ce test vit à part, dans
 * l'environnement Node : il lit un fichier de l'application, hors du dossier
 * que jsdom accepte de servir.
 */
describe('les sources', () => {
  test('ce sont celles de l’application, adresses recopiées telles quelles', async () => {
    // Une adresse se recopie, jamais retapée. Si ce test tombe :
    // `npx tsx scripts/sources.ts`.
    const chemin = pathToFileURL(join(process.cwd(), '..', 'pharmacien', 'src', 'lib', 'veille', 'depart.ts')).href;
    const { SOURCES_DEPART } = (await import(/* @vite-ignore */ chemin)) as {
      SOURCES_DEPART: { cle: string; titre: string; url_document: string; url_reference: string; motsCles: string }[];
    };
    expect(SOURCES.map((s) => [s.cle, s.titre, s.url_document, s.url_reference, s.motsCles])).toEqual(
      SOURCES_DEPART.map((s) => [s.cle, s.titre, s.url_document, s.url_reference, s.motsCles])
    );
  });
});
