import { ajusterPlafond, PLAFOND_DEFAUT, PLAFOND_MAX, PLAFOND_MIN } from '../src/lib/veille/file';

/**
 * Le nombre de notes à revoir chaque soir se règle avec deux boutons plutôt
 * qu'avec un chiffre qu'il faut deviner touchable. Les bornes sont là pour
 * que le réglage garde un sens : en dessous de une, il voudrait dire « ne plus
 * rien réviser », et ça se dit en coupant le rappel.
 */

describe('les bornes du réglage', () => {
  test('de un à cinquante, dix par défaut', () => {
    expect({ min: PLAFOND_MIN, max: PLAFOND_MAX, defaut: PLAFOND_DEFAUT }).toEqual({
      min: 1,
      max: 50,
      defaut: 10,
    });
  });

  test('le bouton moins retire un', () => {
    expect(ajusterPlafond(10, -1)).toBe(9);
  });

  test('le bouton plus ajoute un', () => {
    expect(ajusterPlafond(10, 1)).toBe(11);
  });

  test('le bouton moins ne descend pas sous un', () => {
    expect(ajusterPlafond(1, -1)).toBe(1);
  });

  test('le bouton plus ne monte pas au-dessus de cinquante', () => {
    expect(ajusterPlafond(50, 1)).toBe(50);
  });

  test('une valeur hors bornes rentre dans les bornes au premier toucher', () => {
    // Un zéro hérité d'un réglage plus ancien, ou un nombre tapé au clavier.
    // On applique le pas, puis on ramène dans les bornes : depuis zéro, « + »
    // donne un. L'inverse — ramener d'abord, puis ajouter — ferait sauter de
    // zéro à deux, ce qui se voit et ne s'explique pas.
    expect(ajusterPlafond(0, 1)).toBe(1);
    expect(ajusterPlafond(0, -1)).toBe(1);
    expect(ajusterPlafond(80, -1)).toBe(50);
  });

  test('une saisie décimale est arrondie', () => {
    expect(ajusterPlafond(10.4, 1)).toBe(11);
  });
});
