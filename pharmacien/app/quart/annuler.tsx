import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { declarerJournee } from '../../src/db/disponibilites';
import { listerFrais } from '../../src/db/frais';
import { definirAnnule, obtenirQuart, rappelsDuQuart, type QuiAnnule } from '../../src/db/quarts';
import { useTextes } from '../../src/i18n';
import { formatDateLongue, formatHeure } from '../../src/lib/dates';
import { quartVerrouille } from '../../src/lib/facturation';
import { argent } from '../../src/lib/format';
import { montantsDuQuart } from '../../src/lib/montants';
import { annulerRappels } from '../../src/lib/notifications';
import { Bouton, Carte, Doux, Ecran, Fondu, SousTitre, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

/**
 * Annuler un quart, après l'avoir dit à voix haute.
 *
 * Le lecteur a résolu la phrase ; il n'a rien supprimé. Cet écran montre ce
 * qu'il a trouvé — la pharmacie, la date, les heures, le montant — et la
 * suppression demande une tape. C'est la règle « le lecteur ne crée rien »,
 * prise dans l'autre sens.
 *
 * Deux boutons plutôt qu'un : « Annulé par la pharmacie » et « Annulé par
 * moi ». Même nombre de gestes, et ça garde une information qui compte — une
 * pharmacie qui annule trois fois est exactement ce que les favoris et les
 * « à éviter » doivent voir.
 */
export default function AnnulerQuart() {
  const { t, langue } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{ ids?: string; date?: string }>();

  const candidats = useMemo(
    () =>
      (params.ids ?? '')
        .split(',')
        .filter(Boolean)
        .map((id) => obtenirQuart(Number(id)))
        .filter((q): q is NonNullable<typeof q> => q !== null),
    [params.ids]
  );

  const [choisi, setChoisi] = useState<number | null>(
    candidats.length === 1 ? candidats[0].id : null
  );
  const [annule, setAnnule] = useState<string | null>(null);

  const quart = candidats.find((q) => q.id === choisi) ?? null;
  const verrouille = quart ? quartVerrouille(quart) : false;

  async function confirmer(par: QuiAnnule) {
    if (!quart) return;
    definirAnnule(quart.id, true, par);
    await annulerRappels(rappelsDuQuart(quart));
    setAnnule(quart.date);
  }

  /**
   * La journée ne redevient pas disponible toute seule. Une dispo se déclare,
   * elle ne se déduit pas — c'est la règle de la 2.3, et elle tient ici.
   */
  function offrirLaJournee(date: string) {
    declarerJournee(date, [{ date, toute_la_journee: true, heure_debut: '', heure_fin: '' }]);
    router.replace('/disponibilites');
  }

  return (
    <Ecran>
      <Stack.Screen options={{ title: t('annulation.titre') }} />

      {annule !== null ? (
        <Fondu>
          <Carte>
            <SousTitre>{t('annulation.faite')}</SousTitre>
            <Doux>{t('annulation.faiteDetail', { jour: formatDateLongue(annule, langue) })}</Doux>
          </Carte>
          <View style={styles.espacement} />
          <Pressable
            onPress={() => offrirLaJournee(annule)}
            style={({ pressed }) => [styles.dispo, pressed && { opacity: 0.6 }]}>
            <Ionicons name="calendar-clear-outline" size={18} color={accent} />
            <Text style={[styles.disposTexte, { color: accent }]}>
              {t('annulation.rendreDispo')}
            </Text>
          </Pressable>
        </Fondu>
      ) : candidats.length === 0 ? (
        <Vide
          texte={t('annulation.aucun', {
            jour: params.date ? formatDateLongue(params.date, langue) : '',
          })}
        />
      ) : quart === null ? (
        <>
          <Doux>{t('annulation.lequel')}</Doux>
          {candidats.map((candidat) => (
            <Pressable
              key={candidat.id}
              onPress={() => setChoisi(candidat.id)}
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
              <View style={styles.texte}>
                <Text style={styles.nom}>{candidat.pharmacie_nom}</Text>
                <Text style={styles.detail}>
                  {formatDateLongue(candidat.date, langue)} ·{' '}
                  {formatHeure(candidat.heure_debut, langue)} –{' '}
                  {formatHeure(candidat.heure_fin, langue)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Carte>
            <SousTitre>{quart.pharmacie_nom}</SousTitre>
            <Text style={styles.detail}>
              {formatDateLongue(quart.date, langue)} · {formatHeure(quart.heure_debut, langue)} –{' '}
              {formatHeure(quart.heure_fin, langue)}
            </Text>
            <Text style={styles.montant}>
              {argent(montantsDuQuart(quart, listerFrais(quart.id)).total)}
            </Text>
          </Carte>

          <View style={styles.espacement} />

          {verrouille ? (
            <Doux>{t('annulation.facture')}</Doux>
          ) : (
            <>
              <Bouton
                titre={t('annulation.parLaPharmacie')}
                icone={<Ionicons name="business-outline" size={18} color="#FFFFFF" />}
                onPress={() => void confirmer('pharmacie')}
              />
              <View style={styles.espacement} />
              <Bouton
                titre={t('annulation.parMoi')}
                variante="secondaire"
                icone={<Ionicons name="person-outline" size={18} color={accent} />}
                onPress={() => void confirmer('moi')}
              />
            </>
          )}
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  espacement: { height: espace.m },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingVertical: espace.m,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  texte: { flex: 1 },
  nom: { fontSize: 16, fontFamily: police.demi, color: couleurs.texte },
  detail: { fontSize: 14, fontFamily: police.normal, color: couleurs.doux },
  montant: { fontSize: 20, fontFamily: police.gras, color: couleurs.texte, marginTop: espace.s },
  dispo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    minHeight: 44,
    paddingHorizontal: espace.s,
    borderRadius: rayon,
  },
  disposTexte: { fontSize: 15, fontFamily: police.demi },
});
