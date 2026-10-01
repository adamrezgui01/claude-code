// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { SOURCES } from '../src/donnees/sources';
import { adresseDouverture, correspond, filtrerSources, parTheme, type Source } from '../src/lib/sources';
import { monterSite, saisir } from './dom';
import { commandesSansIcone, rendre } from './rendu';

const titres = (terme: string) => filtrerSources(SOURCES, terme).map((s) => s.titre);

describe('les sources', () => {
  test('une entrée par sujet, jamais deux', () => {
    expect(new Set(SOURCES.map((s) => s.cle)).size).toBe(SOURCES.length);
    // Le même document sous deux clés s'ouvrirait deux fois, en croyant lire
    // deux guides.
    const documents = SOURCES.map((s) => s.url_document).filter(Boolean);
    expect(new Set(documents).size).toBe(documents.length);
  });

  test('chacune a sa page officielle, en secondaire', () => {
    for (const s of SOURCES) expect({ cle: s.cle, reference: !!s.url_reference.trim() }).toEqual({ cle: s.cle, reference: true });
  });

  test('sans document, c’est la page officielle qui s’ouvre', () => {
    expect(adresseDouverture({ url_document: '', url_reference: 'https://exemple.org/page' })).toBe('https://exemple.org/page');
    expect(adresseDouverture({ url_document: 'https://exemple.org/doc.pdf', url_reference: 'https://exemple.org/page' })).toBe(
      'https://exemple.org/doc.pdf'
    );
  });
});

describe('la recherche', () => {
  test('la casse et les accents ne comptent pas', () => {
    expect(titres('DFGE')).toEqual(titres('dfge'));
    expect(titres('stéri')).toEqual(titres('steri'));
    expect(titres('DFGE')).toContain('CKD-EPI, débit de filtration glomérulaire');
  });

  test('elle porte sur les mots-clés cachés', () => {
    // « condom » n'est ni dans le titre ni dans l'organisation : il est dans
    // la situation qui amène la question.
    expect(titres('condom')).toEqual(['Contraception d’urgence']);
    expect(titres('poux')).toEqual(['Poux de tête']);
  });

  test('un terme se cherche n’importe où dans un mot-clé', () => {
    expect(titres('stéri')).toContain('Contraception d’urgence');
    expect(titres('protégée')).toContain('Contraception d’urgence');
  });

  test('sous trois caractères, seuls les sigles exacts répondent', () => {
    expect(titres('cu')).toEqual(['Contraception d’urgence']);
    expect(titres('po')).toEqual([]);
  });

  test('un mot-clé à la fois, jamais la liste recollée', () => {
    const source = { titre: 'X', organisation: 'Y', motsCles: 'lentes, pou, dent' } as Source;
    expect(correspond(source, 'pou, de')).toBe(false);
    expect(correspond(source, 'dent')).toBe(true);
  });
});

describe('les thèmes', () => {
  test('dans l’ordre de l’application, sans thème vide', () => {
    const groupes = parTheme(SOURCES.filter((s) => s.sousSection === 'liens_utiles')).map((g) => g.theme.nom);
    expect(groupes[0]).toBe('ORL et voies respiratoires');
    expect(groupes[groupes.length - 1]).toBe('Autres guides');
  });

  test('un thème d’une seule source rejoint « Autres guides »', () => {
    const groupes = parTheme(SOURCES.filter((s) => s.sousSection === 'liens_utiles'));
    for (const g of groupes) expect({ theme: g.theme.nom, n: g.sources.length >= 2 }).toEqual({ theme: g.theme.nom, n: true });
    const seule = SOURCES.find((s) => s.theme === 'douleur')!;
    expect(groupes.find((g) => g.theme.cle === 'general')!.sources).toContain(seule);
  });
});

describe('la clinique à l’écran', () => {
  test('la recherche par-dessus, puis Outils, puis Liens utiles', () => {
    const html = rendre('/clinique');
    const recherche = html.indexOf('type="search"');
    const outils = html.indexOf('>Outils<');
    const liens = html.indexOf('>Liens utiles<');
    expect(recherche).toBeGreaterThan(-1);
    expect(recherche).toBeLessThan(outils);
    expect(outils).toBeLessThan(liens);
  });

  test('le document en principal, la page officielle en secondaire, dans un nouvel onglet', () => {
    const html = rendre('/clinique');
    const uti = SOURCES.find((s) => s.cle === 'inesss_uti')!;
    const ligne = html.match(new RegExp(`<div class="ligne-source">((?:(?!<div class="ligne-source">).)*?${uti.titre.replace(/[()+]/g, '\\$&')}.*?)</div>`))![1];
    const liens = [...ligne.matchAll(/<a href="([^"]+)" target="_blank" rel="noopener noreferrer" class="([^"]+)"/g)];
    expect(liens.map((l) => [l[2], l[1]])).toEqual([
      ['ligne-source-lien', uti.url_document],
      ['lien-source', uti.url_reference],
    ]);
  });

  test('chaque thème porte une icône en plus de son mot', () => {
    const html = rendre('/clinique');
    const enTetes = [...html.matchAll(/<h3 class="en-tete en-tete-theme">(.*?)<\/h3>/g)].map((m) => m[1]);
    expect(enTetes.length).toBeGreaterThan(5);
    for (const e of enTetes) expect(e).toContain('<svg');
  });

  test('un feuillet pour le patient porte son repère sur la ligne', () => {
    expect(rendre('/clinique')).toMatch(/Poux de tête<\/span><span class="footnote secondaire">[^<]*<span class="a-remettre">À remettre au patient/);
  });

  test('aucune commande n’est du texte seul', () => {
    expect(commandesSansIcone(rendre('/clinique'))).toEqual([]);
  });

  test('taper filtre les deux sous-sections, et la croix efface', async () => {
    const { racine, demonter } = await monterSite('/clinique');
    const champ = racine.querySelector('input[type=search]') as HTMLInputElement;
    const lignes = () => [...racine.querySelectorAll('.ligne-source-texte > span:first-child')].map((e) => e.textContent);
    const toutes = lignes().length;
    await saisir(champ, 'cu');
    expect(lignes()).toEqual(['Contraception d’urgence']);
    await saisir(champ, 'po');
    expect(racine.textContent).toContain('Aucune source ne correspond.');
    expect(racine.textContent).toContain('seuls les sigles exacts répondent');
    (racine.querySelector('[aria-label="Effacer la recherche"]') as HTMLButtonElement).click();
    await saisir(champ, champ.value);
    expect(lignes()).toHaveLength(toutes);
    demonter();
  });
});
