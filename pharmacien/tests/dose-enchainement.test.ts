import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CHAINE, prochainChamp, type ChampDose } from '../src/lib/dose';

/**
 * L'enchaînement des champs du calculateur de dose.
 *
 * Valider un champ fermait le clavier et laissait l'usager toucher le suivant.
 * Au comptoir, c'est plusieurs gestes de trop.
 *
 * « Terminé » ouvre maintenant le prochain champ obligatoire vide. Sur le
 * dernier, il ferme le clavier : le résultat est déjà calculé, il est
 * simplement caché derrière.
 *
 * C'est le même geste que l'écran des heures des dispos, où valider l'heure de
 * début ouvre celle de fin.
 */

/** Quatre champs vides : l'état d'un calcul qui commence. */
const VIDE: Record<ChampDose, string> = {
  poids: '',
  dose: '',
  concentrationMg: '',
  concentrationMl: '',
};

describe('l’ordre de la chaîne', () => {
  test('« Terminer » sur le poids ouvre le champ de dose', () => {
    expect(prochainChamp('poids', VIDE)).toBe('dose');
  });

  test('« Terminer » sur la concentration en mg ouvre la concentration en mL', () => {
    expect(prochainChamp('concentrationMg', VIDE)).toBe('concentrationMl');
  });

  test('« Terminer » sur la concentration en mL ne mène nulle part', () => {
    // `null` est ce qui dit à l'écran de fermer le clavier. Le calcul, lui,
    // est déjà fait : il attendait seulement qu'on dégage le bas de l'écran.
    expect(prochainChamp('concentrationMl', VIDE)).toBeNull();
  });

  test('l’ordre complet : Poids → Dose → mg → mL → fin', () => {
    expect(CHAINE).toEqual(['poids', 'dose', 'concentrationMg', 'concentrationMl']);
    const parcours: (ChampDose | null)[] = [];
    let courant: ChampDose | null = 'poids';
    while (courant) {
      parcours.push(courant);
      courant = prochainChamp(courant, VIDE);
    }
    expect(parcours).toEqual(['poids', 'dose', 'concentrationMg', 'concentrationMl']);
  });
});

describe('ce que la chaîne saute', () => {
  test('un champ déjà rempli est sauté', () => {
    // Revenir corriger le poids ne doit pas obliger à retraverser une dose et
    // deux concentrations déjà entrées.
    const remplis = { ...VIDE, dose: '40', concentrationMg: '250' };
    expect(prochainChamp('poids', remplis)).toBe('concentrationMl');
  });

  test('des espaces ne comptent pas comme un champ rempli', () => {
    expect(prochainChamp('poids', { ...VIDE, dose: '   ' })).toBe('dose');
  });

  test('tout est rempli : le clavier se ferme dès le premier « Terminer »', () => {
    const tout = { poids: '18', dose: '40', concentrationMg: '250', concentrationMl: '5' };
    expect(prochainChamp('poids', tout)).toBeNull();
  });

  test('la durée n’est jamais atteinte par l’enchaînement', () => {
    // Durée, format de bouteille et dose maximale sont facultatifs : les
    // enchaîner forcerait à les traverser à chaque calcul.
    const facultatifs = ['jours', 'formatMl', 'maxParJour'];
    for (const champ of facultatifs) {
      expect({ champ, dansLaChaine: (CHAINE as string[]).includes(champ) }).toEqual({
        champ,
        dansLaChaine: false,
      });
    }
    const ecran = readFileSync(join('app', 'clinique', 'dose.tsx'), 'utf8');
    for (const champ of facultatifs) {
      expect(ecran).not.toContain(`enchainer('${champ}')`);
      expect(ecran).not.toContain(`champs.${champ}`);
    }
  });

  test('les sélecteurs ne sont pas dans la chaîne', () => {
    // La fréquence et l'unité de dose n'ont pas de clavier à ouvrir.
    expect((CHAINE as string[])).not.toContain('prises');
    expect((CHAINE as string[])).not.toContain('unite');
  });
});

describe('l’écran, tel qu’il branche la chaîne', () => {
  const ecran = readFileSync(join('app', 'clinique', 'dose.tsx'), 'utf8');

  test('les quatre champs obligatoires portent un renvoi et un « Terminer »', () => {
    for (const champ of CHAINE) {
      expect(ecran).toContain(`champRef={champs.${champ}}`);
      expect(ecran).toContain(`onTermine={() => enchainer('${champ}')}`);
    }
  });

  test('le bout de la chaîne ferme le clavier', () => {
    expect(ecran).toContain('Keyboard.dismiss()');
  });

  test('le champ suivant reçoit le focus', () => {
    expect(ecran).toContain('champs[suivant].current?.focus()');
  });
});

describe('le bouton « Terminer »', () => {
  // Le bouton lui-même — hauteur, coins, couleurs, appui — est vérifié dans
  // tests/ecrans/champ.test.tsx, où il est monté pour de vrai.
  //
  // Les assertions qui vivaient ici lisaient src/ui/composants.tsx et y
  // cherchaient des mots. Elles se sont fait prendre deux fois : elles sont
  // restées vertes alors que le bouton était tombé à 28 points, parce que
  // « minHeight: 44 » restait écrit dans la feuille de style sans être
  // appliqué ; et elles sont devenues rouges sur un simple reformatage du
  // JSX, qui ne changeait rien pour personne.
  //
  // Une seule assertion reste ici, parce qu'elle ne porte pas sur le rendu.
  const composants = readFileSync(join('src', 'ui', 'composants.tsx'), 'utf8');

  test('sans enchaînement à proposer, il ferme le clavier', async () => {
    // C'est le seul bouton d'un pavé numérique sur iOS : il ne peut pas ne
    // rien faire sur les écrans qui n'ont pas de suite.
    expect(composants).toContain('onPress={onTermine ?? Keyboard.dismiss}');
  });
});
