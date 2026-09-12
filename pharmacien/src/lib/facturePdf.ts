import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { construireHtml, type OptionsFacture } from './facture';

/** Rend un PDF à partir d'une facture déjà composée. Retourne son chemin local. */
export async function pdfDepuisHtml(numero: string, html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  const fichier = new File(uri);
  const destination = new File(Paths.cache, `Facture_${numero}.pdf`);
  if (destination.exists) destination.delete();
  await fichier.move(destination);
  return fichier.uri;
}

/**
 * Compose la facture, la rend en PDF, et retourne les deux. Le HTML est
 * conservé en base : repartager une facture doit redonner le document envoyé,
 * même si les conditions de la pharmacie ont changé depuis.
 */
export async function genererPdf(o: OptionsFacture): Promise<{ uri: string; html: string }> {
  const html = construireHtml(o);
  return { uri: await pdfDepuisHtml(o.numero, html), html };
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
