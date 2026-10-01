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
import { Bouton, Carte, Doux, Ecran, Fondu, Section, Vide } from '../../src/ui/composants';
import { couleurs, espace, graisse, icone, typo, CIBLE_MIN } from '../../src/ui/theme';

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
            <Text style={styles.titreCarte}>{t('annulation.faite')}</Text>
            <Doux>{t('annulation.faiteDetail', { jour: formatDateLongue(annule, langue) })}</Doux>
          </Carte>
          <View style={styles.espacement} />
          <Pressable
            onPress={() => offrirLaJournee(annule)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.dispo, pressed && { opacity: 0.6 }]}>
            <Ionicons name="calendar-clear-outline" size={icone.courante} color={couleurs.textePrincipal} />
            <Text style={styles.disposTexte}>
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
          <View style={styles.consigne}>
            <Doux>{t('annulation.lequel')}</Doux>
          </View>
          {/* Une section : un fond blanc, et un filet entre deux lignes,
              jamais sous la dernière. */}
          <Section>
          {candidats.map((candidat) => (
            <Pressable
              key={candidat.id}
              onPress={() => setChoisi(candidat.id)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
              <View style={styles.texte}>
                <Text style={styles.nom}>{candidat.pharmacie_nom}</Text>
                <Text style={styles.detail}>
                  {formatDateLongue(candidat.date, langue)} ·{' '}
                  {formatHeure(candidat.heure_debut, langue)} –{' '}
                  {formatHeure(candidat.heure_fin, langue)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
            </Pressable>
          ))}
          </Section>
        </>
      ) : (
        <>
          <Carte>
            <Text style={styles.titreCarte}>{quart.pharmacie_nom}</Text>
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
                icone={<Ionicons name="business-outline" size={icone.courante} color={couleurs.surAccent} />}
                onPress={() => void confirmer('pharmacie')}
              />
              <View style={styles.espacement} />
              <Bouton
                titre={t('annulation.parMoi')}
                variante="secondaire"
                icone={<Ionicons name="person-outline" size={icone.courante} color={couleurs.textePrincipal} />}
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
  espacement: { height: espace[3] },
  consigne: { marginBottom: espace[3] },
  titreCarte: { ...typo.headline, color: couleurs.textePrincipal, marginBottom: espace[1] },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    paddingVertical: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  texte: { flex: 1 },
  nom: { ...typo.body, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  detail: { ...typo.subhead,  color: couleurs.texteSecondaire },
  montant: { ...typo.title3, fontWeight: graisse.grasse, color: couleurs.textePrincipal, marginTop: espace[2] },
  dispo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  disposTexte: { ...typo.body, color: couleurs.textePrincipal },
});
