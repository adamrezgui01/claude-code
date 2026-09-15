import type {
  FraisExtra,
  ModeDeplacement,
  Pharmacie,
  QuartDetaille,
  Reglages,
} from '../db/types';
import { adresseComplete } from './adresses';
import { aujourdhui, dureeHeures, formatDateCourte } from './dates';
import { argent, heures, nombre } from './format';
import { heuresTravaillees, quartCompte } from './stats';

/**
 * Composition d'une facture. Une facture porte sur une seule pharmacie.
 * Aucune dépendance native ici : le calcul et le rendu se vérifient hors
 * application. L'impression vit dans `facturePdf`.
 */
export type OptionsFacture = {
  numero: string;
  reglages: Reglages;
  pharmacie: Pharmacie;
  periodeDebut: string;
  periodeFin: string;
  quarts: QuartDetaille[];
  frais: FraisExtra[];
  inclureDeplacement: boolean;
  inclurePerDiem: boolean;
  inclureFrais: boolean;
  hebergement: number;
};

export type TotauxFacture = {
  totalHeures: number;
  honoraires: number;
  deplacementMode: ModeDeplacement;
  deplacementKm: number;
  deplacementTaux: number;
  deplacementMontant: number;
  perDiemJours: number;
  perDiemMontant: number;
  fraisExtra: number;
  hebergement: number;
  total: number;
};

export function quartsFacturables(quarts: QuartDetaille[]): QuartDetaille[] {
  return quarts.filter(quartCompte);
}

export function calculerTotaux(o: OptionsFacture): TotauxFacture {
  let totalHeures = 0;
  let honoraires = 0;
  let km = 0;
  let fixe = 0;
  let perDiem = 0;
  const joursAvecPerDiem = new Set<string>();

  for (const q of quartsFacturables(o.quarts)) {
    const duree = heuresTravaillees(q);
    totalHeures += duree;
    honoraires += duree * q.taux_horaire;
    km += q.kilometrage;
    fixe += q.montant_fixe_deplacement;
    perDiem += q.per_diem_reclame;
    if (q.per_diem_reclame > 0) joursAvecPerDiem.add(q.date);
  }

  const mode = o.inclureDeplacement ? o.pharmacie.mode_deplacement : 'aucun';
  const deplacementMontant =
    mode === 'km' ? km * o.pharmacie.taux_par_km : mode === 'fixe' ? fixe : 0;

  // Le per diem est réclamé quart par quart : une semaine dans le Nord peut
  // porter le repas tous les jours et le trajet seulement à l'aller et au
  // retour. On additionne donc les montants plutôt que de multiplier des jours.
  const perDiemJours = o.inclurePerDiem ? joursAvecPerDiem.size : 0;
  const perDiemMontant = o.inclurePerDiem ? perDiem : 0;
  const fraisExtra = o.inclureFrais ? o.frais.reduce((t, f) => t + f.montant, 0) : 0;

  return {
    totalHeures,
    honoraires,
    deplacementMode: mode,
    deplacementKm: mode === 'km' ? km : 0,
    deplacementTaux: mode === 'km' ? o.pharmacie.taux_par_km : 0,
    deplacementMontant,
    perDiemJours,
    perDiemMontant,
    fraisExtra,
    hebergement: o.hebergement,
    total: honoraires + deplacementMontant + perDiemMontant + fraisExtra + o.hebergement,
  };
}

function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ligneSiNonNulle(libelle: string, detail: string, montant: number): string {
  if (montant === 0) return '';
  return `
    <tr>
      <th colspan="4">${echapper(libelle)}</th>
      <td class="n detail">${echapper(detail)}</td>
      <td class="n">${echapper(argent(montant))}</td>
    </tr>`;
}

function lignesQuarts(quarts: QuartDetaille[]): string {
  return quarts
    .map((q) => {
      const debut = q.heure_debut_reelle || q.heure_debut;
      const fin = q.heure_fin_reelle || q.heure_fin;
      const duree = heuresTravaillees(q);
      const pause =
        q.pause_minutes > 0 && !q.pause_payee ? ` <span class="detail">(pause ${q.pause_minutes} min)</span>` : '';
      return `
        <tr>
          <td>${echapper(formatDateCourte(q.date))}</td>
          <td>${echapper(q.pharmacie_nom)}</td>
          <td>${echapper(debut)} – ${echapper(fin)}${pause}</td>
          <td class="n">${echapper(heures(duree))}</td>
          <td class="n">${echapper(argent(q.taux_horaire))}/h</td>
          <td class="n">${echapper(argent(duree * q.taux_horaire))}</td>
        </tr>`;
    })
    .join('');
}

function lignesFrais(frais: FraisExtra[]): string {
  return frais
    .map(
      (f) => `
        <tr>
          <th colspan="5">${echapper(f.description || 'Frais')}</th>
          <td class="n">${echapper(argent(f.montant))}</td>
        </tr>`
    )
    .join('');
}

/**
 * Document volontairement neutre : noir et blanc, sobre. Il part chez un
 * propriétaire de pharmacie et engage de l'argent ; il doit avoir l'air d'une
 * facture, pas d'un écran d'application.
 */
export function construireHtml(o: OptionsFacture): string {
  const t = calculerTotaux(o);
  const r = o.reglages;
  const quarts = quartsFacturables(o.quarts);

  const coordonnees = [
    r.permis_opq ? `Permis OPQ ${r.permis_opq}` : '',
    r.adresse,
    r.telephone,
    r.courriel,
  ]
    .filter(Boolean)
    .map((ligne) => `<div class="gris">${echapper(ligne)}</div>`)
    .join('');

  const adresse = adresseComplete(o.pharmacie)
    .split('\n')
    .map((ligne) => `<div class="gris">${echapper(ligne)}</div>`)
    .join('');

  const sousTotaux = [
    ligneSiNonNulle('Honoraires', heures(t.totalHeures), t.honoraires),
    t.deplacementMode === 'km'
      ? ligneSiNonNulle(
          'Kilométrage',
          `${nombre(t.deplacementKm)} km × ${argent(t.deplacementTaux)}`,
          t.deplacementMontant
        )
      : ligneSiNonNulle('Déplacement', '', t.deplacementMontant),
    ligneSiNonNulle('Per diem', `${t.perDiemJours} jour${t.perDiemJours > 1 ? 's' : ''}`, t.perDiemMontant),
    ligneSiNonNulle('Hébergement', '', t.hebergement),
    o.inclureFrais ? lignesFrais(o.frais.filter((f) => f.montant !== 0)) : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 36px 40px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .entete { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 18px; }
  .entete .droite { text-align: right; }
  .gris { color: #555; }
  .bloc { margin-bottom: 16px; }
  .bloc .titre { font-weight: 600; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #e0e0e0; }
  thead th { border-bottom: 1px solid #1a1a1a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td.n, th.n { text-align: right; }
  .detail { color: #555; font-weight: 400; }
  tfoot th { border-bottom: none; }
  tfoot .total th, tfoot .total td { border-top: 2px solid #1a1a1a; font-size: 14px; font-weight: 700; padding-top: 10px; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <h1>${echapper(r.nom || 'Pharmacien remplaçant')}</h1>
      ${coordonnees}
    </div>
    <div class="droite">
      <h1>Facture ${echapper(o.numero)}</h1>
      <div class="gris">Émise le ${echapper(formatDateCourte(aujourdhui()))}</div>
    </div>
  </div>

  <div class="bloc">
    <div class="titre">Facturé à</div>
    <div>${echapper(o.pharmacie.nom)}</div>
    ${adresse}
  </div>

  <div class="bloc">
    <div class="titre">Période</div>
    <div>Du ${echapper(formatDateCourte(o.periodeDebut))} au ${echapper(
      formatDateCourte(o.periodeFin)
    )} — ${quarts.length} quart${quarts.length > 1 ? 's' : ''}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Pharmacie</th><th>Horaire</th>
        <th class="n">Heures</th><th class="n">Taux horaire</th><th class="n">Montant</th>
      </tr>
    </thead>
    <tbody>${lignesQuarts(quarts)}</tbody>
    <tfoot>
      ${sousTotaux}
      <tr class="total">
        <th colspan="5">Total</th>
        <td class="n">${echapper(argent(t.total))}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

/** Durée prévue d'un quart, pause déduite. Sert à l'affichage d'un formulaire. */
export function dureePrevue(heureDebut: string, heureFin: string, pause: number, payee: boolean) {
  return Math.max(0, dureeHeures(heureDebut, heureFin) - (payee ? 0 : pause / 60));
}
