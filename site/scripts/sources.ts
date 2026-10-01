/**
 * Recopie les sources cliniques de l'application dans le site.
 *
 *   npx tsx scripts/sources.ts
 *
 * Une adresse de document se recopie telle que l'usager l'a relevée, jamais
 * retapée de mémoire : ce script la prend dans l'application
 * (pharmacien/src/lib/veille/depart.ts) et l'écrit dans
 * src/donnees/sources.ts. Un test vérifie que les deux fichiers disent la même
 * chose ; s'il tombe, c'est ce script qu'on relance.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const chemin = pathToFileURL(join(process.cwd(), '..', 'pharmacien', 'src', 'lib', 'veille', 'depart.ts')).href;
const { SOURCES_DEPART } = (await import(chemin)) as {
  SOURCES_DEPART: {
    cle: string;
    titre: string;
    url_document: string;
    url_reference: string;
    organisation: string;
    sousSection: 'outils' | 'liens_utiles';
    theme: string;
    pourPatient?: boolean;
    motsCles: string;
  }[];
};

const sources = SOURCES_DEPART.map((s) => ({
  cle: s.cle,
  titre: s.titre,
  url_document: s.url_document,
  url_reference: s.url_reference,
  organisation: s.organisation,
  sousSection: s.sousSection,
  theme: s.theme,
  pourPatient: !!s.pourPatient,
  motsCles: s.motsCles,
}));

const entete = `/*
 * Fichier produit par scripts/sources.ts, à partir des sources de
 * l'application. Ne pas retoucher à la main : relancer le script.
 */
import type { Source } from '../lib/sources';

export const SOURCES: Source[] = `;

writeFileSync(join('src', 'donnees', 'sources.ts'), `${entete}${JSON.stringify(sources, null, 2)};\n`);
console.log(`${sources.length} sources recopiées.`);
