import { montantsDuQuart } from '../src/lib/montants';
import { calculerTotaux } from '../src/lib/facture';
import { calculerStatistiques } from '../src/lib/stats';
import { desReglages, unePharmacie, unFrais, unQuart } from './fabriques';

/**
 * La mesure « Argent » compte tout ce que l'usager facture : honoraires,
 * kilométrage, per diem, hébergement payé et frais ponctuels. L'hébergement
 * fourni par la pharmacie n'y entre pas, puisqu'il n'est pas facturé.
 *
 * Et le point qui fait tenir l'ensemble : chaque montant facturable se calcule
 * et s'arrondit une seule fois, sur le quart. Les factures et les statistiques
 * additionnent ces montants déjà arrondis, elles ne les recalculent jamais à
 * partir des taux et des distances. Sans ça, les deux écrans finissent par
 * afficher des chiffres voisins mais différents, et personne ne sait lequel
 * croire.
 */

const PHARMACIE_KM = unePharmacie({ id: 1, mode_deplacement: 'km' });
const REGLAGES = desReglages();

function quartComplet(hebergement: number) {
  return unQuart({
    id: 1,
    pharmacie_id: 1,
    date: '2026-09-15',
    heure_debut: '09:00',
    heure_fin: '17:00',
    pause_minutes: 60,
    pause_payee: 0,
    taux_horaire: 65,
    kilometrage: 40,
    taux_par_km: 0.55,
    aller_retour: 1,
    per_diem_reclame: 25,
    hebergement_reclame: hebergement,
    pharmacie_mode_deplacement: 'km',
  });
}

const STATIONNEMENT = [unFrais({ id: 1, quart_id: 1, montant: 12, pharmacie_id: 1 } as never)];

function argentDe(quarts: ReturnType<typeof unQuart>[], frais = STATIONNEMENT) {
  return calculerStatistiques(quarts, frais as never).revenuEstime;
}

function totalFacture(quarts: ReturnType<typeof unQuart>[], pharmacie = PHARMACIE_KM, frais = STATIONNEMENT) {
  return calculerTotaux({
    numero: '2026-001',
    reglages: REGLAGES,
    pharmacie,
    periodeDebut: '2026-09-01',
    periodeFin: '2026-09-30',
    quarts,
    frais: frais as never,
    inclureDeplacement: true,
    inclurePerDiem: true,
    inclureFrais: true,
    hebergement: 0,
  }).total;
}

describe('« Argent » compte tout ce qui se facture', () => {
  test('hébergement payé de 120 $ compris : 656,00 $', () => {
    // 455 d'honoraires + 44 de kilométrage + 25 de per diem + 120
    // d'hébergement + 12 de stationnement.
    expect(argentDe([quartComplet(120)])).toBe(656);
  });

  test('hébergement fourni par la pharmacie : 536,00 $', () => {
    expect(argentDe([quartComplet(0)])).toBe(536);
  });

  test('le détail du quart porte chaque élément une seule fois', () => {
    const m = montantsDuQuart(quartComplet(120), STATIONNEMENT as never);
    expect(m.honoraires).toBe(455);
    expect(m.kilometrage).toBe(44);
    expect(m.perDiem).toBe(25);
    expect(m.hebergement).toBe(120);
    expect(m.fraisExtra).toBe(12);
    expect(m.total).toBe(656);
  });
});

describe('un montant se calcule une seule fois', () => {
  // 40,005 km aller simple font 80,01 km, soit 44,0055 $ : la demie exacte
  // monte, donc 44,01 $ par quart.
  const trois = [1, 2, 3].map((id) =>
    unQuart({
      id,
      pharmacie_id: 1,
      date: `2026-09-1${id}`,
      taux_horaire: 0,
      kilometrage: 40.005,
      taux_par_km: 0.55,
      aller_retour: 1,
      pharmacie_mode_deplacement: 'km',
    })
  );

  test('chaque quart vaut 44,01 $ de kilométrage', () => {
    for (const quart of trois) {
      expect(montantsDuQuart(quart, []).kilometrage).toBe(44.01);
    }
  });

  test('les statistiques additionnent 132,03 $, jamais 132,02 $', () => {
    expect(calculerStatistiques(trois).montantDeplacement).toBe(132.03);
  });

  test('la facture qui les couvre porte le même 132,03 $', () => {
    // Recalculer à partir de 240,03 km × 0,55 donnerait 132,02 $ : c'est
    // exactement l'écart qu'on refuse.
    expect(totalFacture(trois, PHARMACIE_KM, [])).toBe(132.03);
  });
});

describe('les statistiques et les factures tombent sur le même chiffre', () => {
  test('un mois de plusieurs quarts sur deux pharmacies', () => {
    const pharmacieA = unePharmacie({ id: 1, mode_deplacement: 'km' });
    const pharmacieB = unePharmacie({ id: 2, nom: 'Pharmacie B', mode_deplacement: 'fixe' });

    const quarts = [
      unQuart({
        id: 1,
        pharmacie_id: 1,
        date: '2026-09-03',
        taux_horaire: 66.1,
        pause_minutes: 60,
        kilometrage: 43,
        taux_par_km: 0.55,
        per_diem_reclame: 25,
        hebergement_reclame: 120,
        pharmacie_mode_deplacement: 'km',
      }),
      unQuart({
        id: 2,
        pharmacie_id: 1,
        date: '2026-09-11',
        taux_horaire: 64.5,
        pause_minutes: 45,
        kilometrage: 40.005,
        taux_par_km: 0.55,
        per_diem_reclame: 25,
        pharmacie_mode_deplacement: 'km',
      }),
      unQuart({
        id: 3,
        pharmacie_id: 2,
        pharmacie_nom: 'Pharmacie B',
        date: '2026-09-18',
        taux_horaire: 62,
        pause_minutes: 30,
        montant_fixe_deplacement: 35,
        per_diem_reclame: 20,
        pharmacie_mode_deplacement: 'fixe',
      }),
    ];

    const frais = [
      unFrais({ id: 1, quart_id: 1, montant: 12, pharmacie_id: 1 } as never),
      unFrais({ id: 2, quart_id: 3, montant: 8.5, pharmacie_id: 2 } as never),
    ];

    const argentDuMois = calculerStatistiques(quarts, frais as never).revenuEstime;

    // Une facture par pharmacie, couvrant exactement ces quarts.
    const factureA = totalFacture(
      quarts.filter((q) => q.pharmacie_id === 1),
      pharmacieA,
      frais.filter((f) => (f as never as { pharmacie_id: number }).pharmacie_id === 1)
    );
    const factureB = totalFacture(
      quarts.filter((q) => q.pharmacie_id === 2),
      pharmacieB,
      frais.filter((f) => (f as never as { pharmacie_id: number }).pharmacie_id === 2)
    );

    expect(factureA + factureB).toBe(argentDuMois);
  });
});

describe('la ligne de kilométrage d’une facture', () => {
  test('40 km aller simple avec aller-retour s’écrivent 80 km et 44,00 $', () => {
    const totaux = calculerTotaux({
      numero: '2026-001',
      reglages: REGLAGES,
      pharmacie: PHARMACIE_KM,
      periodeDebut: '2026-09-01',
      periodeFin: '2026-09-30',
      quarts: [unQuart({ kilometrage: 40, taux_par_km: 0.55, aller_retour: 1, taux_horaire: 0 })],
      frais: [],
      inclureDeplacement: true,
      inclurePerDiem: true,
      inclureFrais: true,
      hebergement: 0,
    });
    expect(totaux.deplacementKm).toBe(80);
    expect(totaux.deplacementMontant).toBe(44);
  });
});
