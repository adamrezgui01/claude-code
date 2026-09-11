import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { QuartDetaille, Reglages } from '../db/types';
import { dureeHeures, formatDateCourte } from './dates';
import { argent, heures, nombre } from './format';

export type OptionsFacture = {
  numero: string;
  reglages: Reglages;
  periodeDebut: string;
  periodeFin: string;
  quarts: QuartDetaille[];
  pharmaciesNoms: string[];
  kilometrage: { inclus: boolean; km: number; taux: number };
  perDiem: { inclus: boolean; jours: number; montant: number };
  hebergement: { inclus: boolean; montant: number };
};

export type TotauxFacture = {
  totalHeures: number;
  honoraires: number;
  montantKilometrage: number;
  montantPerDiem: number;
  montantHebergement: number;
  total: number;
};

export function calculerTotaux(o: OptionsFacture): TotauxFacture {
  let totalHeures = 0;
  let honoraires = 0;
  for (const q of o.quarts) {
    const duree = dureeHeures(q.heure_debut, q.heure_fin);
    totalHeures += duree;
    honoraires += duree * q.taux_horaire;
  }
  const montantKilometrage = o.kilometrage.inclus ? o.kilometrage.km * o.kilometrage.taux : 0;
  const montantPerDiem = o.perDiem.inclus ? o.perDiem.jours * o.perDiem.montant : 0;
  const montantHebergement = o.hebergement.inclus ? o.hebergement.montant : 0;
  return {
    totalHeures,
    honoraires,
    montantKilometrage,
    montantPerDiem,
    montantHebergement,
    total: honoraires + montantKilometrage + montantPerDiem + montantHebergement,
  };
}

function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lignesQuarts(quarts: QuartDetaille[]): string {
  return quarts
    .map((q) => {
      const duree = dureeHeures(q.heure_debut, q.heure_fin);
      return `
        <tr>
          <td>${echapper(formatDateCourte(q.date))}</td>
          <td>${echapper(q.pharmacie_nom)}</td>
          <td>${echapper(q.heure_debut)} – ${echapper(q.heure_fin)}</td>
          <td class="n">${echapper(heures(duree))}</td>
          <td class="n">${echapper(argent(q.taux_horaire))}</td>
          <td class="n">${echapper(argent(duree * q.taux_horaire))}</td>
        </tr>`;
    })
    .join('');
}

function ligneSousTotal(libelle: string, detail: string, montant: number): string {
  return `
    <tr>
      <th colspan="4">${echapper(libelle)}</th>
      <td class="n detail">${echapper(detail)}</td>
      <td class="n">${echapper(argent(montant))}</td>
    </tr>`;
}

export function construireHtml(o: OptionsFacture): string {
  const t = calculerTotaux(o);
  const emission = formatDateCourte(new Date().toISOString().slice(0, 10));

  const sousTotaux = [
    ligneSousTotal('Honoraires', heures(t.totalHeures), t.honoraires),
    o.kilometrage.inclus
      ? ligneSousTotal(
          'Kilométrage',
          `${nombre(o.kilometrage.km)} km × ${argent(o.kilometrage.taux)}`,
          t.montantKilometrage
        )
      : '',
    o.perDiem.inclus
      ? ligneSousTotal(
          'Per diem',
          `${o.perDiem.jours} j × ${argent(o.perDiem.montant)}`,
          t.montantPerDiem
        )
      : '',
    o.hebergement.inclus ? ligneSousTotal('Hébergement', '', t.montantHebergement) : '',
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
  .detail { color: #555; }
  tfoot th { border-bottom: none; }
  tfoot .total th, tfoot .total td { border-top: 2px solid #1a1a1a; font-size: 14px; font-weight: 700; padding-top: 10px; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <h1>${echapper(o.reglages.nom || 'Pharmacien remplaçant')}</h1>
      <div class="gris">${
        o.reglages.permis_opq ? `Permis OPQ ${echapper(o.reglages.permis_opq)}` : ''
      }</div>
      <div class="gris">${echapper(o.reglages.adresse)}</div>
    </div>
    <div class="droite">
      <h1>Facture ${echapper(o.numero)}</h1>
      <div class="gris">Émise le ${echapper(emission)}</div>
    </div>
  </div>

  <div class="bloc">
    <div class="titre">Facturé à</div>
    <div>${echapper(o.pharmaciesNoms.join(', '))}</div>
  </div>

  <div class="bloc">
    <div class="titre">Période</div>
    <div>Du ${echapper(formatDateCourte(o.periodeDebut))} au ${echapper(
      formatDateCourte(o.periodeFin)
    )} — ${o.quarts.length} quart${o.quarts.length > 1 ? 's' : ''}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Pharmacie</th><th>Horaire</th>
        <th class="n">Heures</th><th class="n">Taux</th><th class="n">Montant</th>
      </tr>
    </thead>
    <tbody>${lignesQuarts(o.quarts)}</tbody>
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

/** Génère le PDF et retourne son chemin local. */
export async function genererPdf(o: OptionsFacture): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: construireHtml(o) });
  const fichier = new File(uri);
  const destination = new File(Paths.cache, `Facture_${o.numero}.pdf`);
  if (destination.exists) destination.delete();
  await fichier.move(destination);
  return fichier.uri;
}

export async function partagerPdf(uri: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Partager la facture',
    UTI: 'com.adobe.pdf',
  });
}
