import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { questionPosee } from '../src/lib/veille/revision';

/**
 * La question posée, et ce que l'écran de révision n'a pas le droit de dire.
 */

function traduire(langue: 'fr' | 'en') {
  const section = (langue === 'fr' ? fr : en).revision as Record<string, string>;
  return (cle: string, valeurs?: Record<string, unknown>) => {
    let texte = section[cle.replace('revision.', '')] ?? cle;
    for (const [nom, valeur] of Object.entries(valeurs ?? {})) {
      texte = texte.replace(`{{${nom}}}`, `${valeur}`);
    }
    return texte;
  };
}

describe('ce qu’on demande avant de révéler', () => {
  test('la question écrite par l’usager passe avant tout', () => {
    expect(
      questionPosee(
        { question: 'Quelle durée pour une cystite ?', sujet: 'Infections urinaires', source: 'INESSS' },
        traduire('fr')
      )
    ).toBe('Quelle durée pour une cystite ?');
  });

  test('sans question, le sujet et la source servent de rappel', () => {
    expect(
      questionPosee({ question: '', sujet: 'Infections urinaires', source: 'INESSS' }, traduire('fr'))
    ).toBe('Infections urinaires · INESSS — quel est le point clé ?');
  });

  test('sans source, le sujet seul', () => {
    expect(questionPosee({ question: '', sujet: 'Épilepsie', source: '' }, traduire('fr'))).toBe(
      'Épilepsie — quel est le point clé ?'
    );
  });

  test('sans rien, la question la plus neutre', () => {
    expect(questionPosee({ question: '', sujet: '', source: '' }, traduire('fr'))).toBe(
      'Quel est le point clé ?'
    );
  });

  test('en anglais aussi', () => {
    expect(
      questionPosee({ question: '', sujet: 'Urinary tract infections', source: 'INESSS' }, traduire('en'))
    ).toBe('Urinary tract infections · INESSS — what is the key point?');
  });

  test('une question faite d’espaces ne compte pas', () => {
    expect(questionPosee({ question: '   ', sujet: 'Épilepsie', source: '' }, traduire('fr'))).toBe(
      'Épilepsie — quel est le point clé ?'
    );
  });
});

describe('aucun score, nulle part', () => {
  /**
   * L'application gère des sujets à revoir ; elle n'évalue pas le pharmacien.
   * C'est une intention, et les intentions se perdent — d'autant que la
   * mécanique de la répétition espacée pousse vers les scores, parce que les
   * données sont là. Ce test est grossier, mais il survit à l'oubli.
   */
  const SUSPECTS = [/%/, /\bsur \d/, /\bout of \d/, /\bscore\b/i, /\bstreak\b/i, /\bd’affilée\b/, /\bconsécutifs?\b/];

  test('les textes français de la révision ne portent aucune note', () => {
    const fautifs = Object.entries(fr.revision as Record<string, string>).filter(([, texte]) =>
      SUSPECTS.some((motif) => motif.test(texte))
    );
    expect(fautifs).toEqual([]);
  });

  test('les textes anglais non plus', () => {
    const fautifs = Object.entries(en.revision as Record<string, string>).filter(([, texte]) =>
      SUSPECTS.some((motif) => motif.test(texte))
    );
    expect(fautifs).toEqual([]);
  });

  test('le compteur de la séance dit ce qui reste, pas ce qui est fait', () => {
    expect((fr.revision as Record<string, string>).restantes_other).toContain('restantes');
    expect((en.revision as Record<string, string>).restantes_other).toContain('left');
  });
});
