import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

import {
  declarerJournee,
  effacerJournee,
  listerDisponibilites,
} from '../src/db/disponibilites';
import { obtenirReglages } from '../src/db/profil';
import { listerQuarts } from '../src/db/quarts';
import { useTextes } from '../src/i18n';
import {
  aimanterHeure,
  ajusterAutourDuQuart,
  bornerPlage,
  chevauchement,
  disponibilites,
  disponibilitesEntre,
  finProposee,
  joursOfferts,
  plageValide,
  moisCouverts,
  resumerPlages,
  MOIS_MAX,
  SEMAINES,
  SEMAINES_DEFAUT,
  type Geste,
} from '../src/lib/disponibilites';
import {
  aujourdhui,
  debutMois,
  decalerMois,
  finMois,
  formatDateLongue,
  formatHeure,
  formatPlageDates,
  joursCourts,
} from '../src/lib/dates';
import { Bouton, Doux, Onglets, SousTitre } from '../src/ui/composants';
import { FeuilleSurgissante, type PointEcran } from '../src/ui/FeuilleSurgissante';
import { GrilleDispos } from '../src/ui/GrilleDispos';
import { SelecteurDate, SelecteurHeure } from '../src/ui/Selecteurs';
import { couleurs, espace, police, rayon, useAccent } from '../src/ui/theme';

/**
 * La valeur de l'onglet qui ouvre les deux sélecteurs de date. Les trois
 * autres portent un nombre de semaines.
 */
const PERSONNALISE = 'perso';

/**
 * Les disponibilités, en une image prête à envoyer.
 *
 * Un propriétaire demande « t'es libre quand ? » par texto, et la réponse part
 * par texto. Une grille se lit d'un coup d'œil ; une liste de dates demande à
 * être lue, et se relit mal dans une conversation.
 *
 * L'image ne porte aucun nom de pharmacie, aucune heure, aucun montant. Elle
 * circule dans des groupes de remplaçants : ce qui n'a pas à en sortir n'en
 * sort pas.
 */
export default function Disponibilites() {
  const { t, langue } = useTextes();
  const accent = useAccent();
  const router = useRouter();
  const capture = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [choix, setChoix] = useState<string>(`${SEMAINES_DEFAUT}`);
  const [plages, setPlages] = useState(listerDisponibilites);
  const [quarts] = useState(listerQuarts);
  const [reglages] = useState(obtenirReglages);
  const cejour = aujourdhui();
  /** La limite dure : on n'offre rien au-delà d'un an. */
  const dernierJour = decalerMois(cejour, MOIS_MAX);
  /* Par défaut, le mois prochain en entier : c'est la demande qu'on reçoit. */
  const moisProchain = decalerMois(cejour, 1);
  const [debutPlage, setDebutPlage] = useState(debutMois(moisProchain));
  const [finPlage, setFinPlage] = useState(finMois(moisProchain));

  /**
   * Deux périodes, et c'est voulu.
   *
   * Celle qu'on modifie va jusqu'à la limite d'un an : une journée qu'on veut
   * offrir en mars ne doit pas attendre que le sélecteur soit réglé sur le bon
   * nombre de semaines. La grille défile, elle ne bute pas.
   *
   * Celle qu'on partage est la fenêtre choisie. On déclare largement, on
   * envoie ce qui a été demandé.
   */
  const edition = useMemo(
    () => disponibilitesEntre(plages, cejour, dernierJour, quarts),
    [plages, quarts, cejour, dernierJour]
  );
  const bornee = useMemo(
    () => bornerPlage(debutPlage, finPlage, cejour),
    [debutPlage, finPlage, cejour]
  );
  const periode = useMemo(
    () =>
      choix === PERSONNALISE
        ? disponibilitesEntre(plages, bornee.debut, bornee.fin, quarts)
        : disponibilites(plages, cejour, Number(choix), quarts),
    [plages, quarts, choix, bornee, cejour]
  );
  const blocsEdition = useMemo(() => moisCouverts(edition), [edition]);
  const blocs = useMemo(() => moisCouverts(periode), [periode]);
  const initiales = joursCourts(langue);
  const [heures, setHeures] = useState<{ date: string; point: PointEcran } | null>(null);
  const bornes = { debut: reglages.dispo_debut, fin: reglages.dispo_fin };
  const [debutSaisi, setDebutSaisi] = useState(bornes.debut);
  const [finSaisie, setFinSaisie] = useState(bornes.fin);
  /** Le champ ouvert : le second s'ouvre tout seul dès que le premier ferme. */
  const [champOuvert, setChampOuvert] = useState<'debut' | 'fin' | null>(null);
  const [refus, setRefus] = useState(false);

  /**
   * Le geste s'écrit tout de suite. Rien à enregistrer : une disponibilité
   * déclarée est une disponibilité, et l'écran la relit aussitôt.
   */
  function appliquer(dates: string[], geste: Geste) {
    for (const date of dates) {
      if (geste === 'offrir') {
        declarerJournee(date, [
          { date, toute_la_journee: true, heure_debut: '', heure_fin: '' },
        ]);
      } else {
        effacerJournee(date);
      }
    }
    setPlages(listerDisponibilites());
  }

  function ouvrirHeures(date: string, point: PointEcran) {
    // La fenêtre s'ouvre sur ce que la journée porte déjà, ou sur les bornes
    // de la journée : dans les deux cas, il n'y a qu'à corriger.
    const jour = edition.jours.find((j) => j.date === date);
    const premiere = jour?.plages[0];
    setDebutSaisi(premiere?.debut ?? bornes.debut);
    setFinSaisie(premiere?.fin ?? bornes.fin);
    setRefus(false);
    setChampOuvert(null);
    setHeures({ date, point });
  }

  /**
   * Le début choisi ouvre la fin dans la foulée : c'est un geste de moins sur
   * le chemin fréquent, et la fin suit toujours le début.
   */
  function choisirDebut(valeur: string) {
    const cale = aimanterHeure(valeur);
    setDebutSaisi(cale);
    setFinSaisie(finProposee(cale, bornes));
    setRefus(false);
  }

  function enregistrerHeures() {
    if (!heures) return;
    if (!plageValide(debutSaisi, finSaisie)) {
      setRefus(true);
      return;
    }
    const plage = { debut: debutSaisi, fin: finSaisie };
    const pris = chevauchement(plage, quartsDuJour(heures.date));
    if (pris) {
      avertirDuQuart(heures.date, plage, pris);
      return;
    }
    ecrireHeures(heures.date, plage);
  }

  function ecrireHeures(date: string, plage: { debut: string; fin: string }) {
    declarerJournee(date, [
      { date, toute_la_journee: false, heure_debut: plage.debut, heure_fin: plage.fin },
    ]);
    setPlages(listerDisponibilites());
    setHeures(null);
  }

  /**
   * Le chevauchement s'annonce, il ne s'interdit pas : l'usager sait ce qu'il
   * fait, et il peut vouloir offrir la fin d'une journée déjà entamée.
   *
   * Ce que l'alerte ne propose pas : annuler ou remplacer le quart. Un quart
   * est un engagement pris avec une pharmacie. Le supprimer par réflexe, au
   * milieu d'une sélection de disponibilités, est un accident qui coûte cher.
   * La fiche du quart s'ouvre d'ici, et la suppression y vit avec sa
   * confirmation.
   */
  function avertirDuQuart(
    date: string,
    plage: { debut: string; fin: string },
    pris: { debut: string; fin: string }
  ) {
    const ajuste = ajusterAutourDuQuart(plage, pris);
    const boutons = [
      { text: t('disponibilites.garderQuandMeme'), onPress: () => ecrireHeures(date, plage) },
      { text: t('disponibilites.gererCeQuart'), onPress: () => ouvrirLeQuart(date) },
    ];
    if (ajuste) {
      boutons.unshift({
        text: t('disponibilites.ajuster'),
        onPress: () => {
          setDebutSaisi(ajuste.debut);
          setFinSaisie(ajuste.fin);
          setRefus(false);
        },
      });
    }
    Alert.alert(
      t('disponibilites.dejaUnQuart'),
      t('disponibilites.dejaUnQuartDetail', {
        jour: formatDateLongue(date, langue),
        debut: formatHeure(pris.debut, langue),
        fin: formatHeure(pris.fin, langue),
      }),
      boutons
    );
  }

  function quartsDuJour(date: string) {
    return quarts.filter((q) => q.date === date);
  }

  function ouvrirLeQuart(date: string) {
    const premier = quartsDuJour(date).find((q) => !q.annule);
    if (!premier) return;
    setHeures(null);
    router.push(`/quart/${premier.id}`);
  }

  async function partager() {
    try {
      // La capture se fait sur le nœud, pas sur l'écran : ce qui part est la
      // carte seule, sans le sélecteur de période ni le bouton.
      const uri = await captureRef(capture, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('disponibilites.partageImpossible'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('disponibilites.titre') });
    } catch (erreur) {
      Alert.alert(t('disponibilites.partageImpossible'), `${erreur}`);
    }
  }

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: t('disponibilites.titre') }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Doux>{t('disponibilites.consigne')}</Doux>
        <View style={styles.editeur}>
          <GrilleDispos
            blocs={blocsEdition}
            initiales={initiales}
            langue={langue}
            accent={accent}
            montrerQuarts
            onGeste={appliquer}
            onHeures={ouvrirHeures}
          />
        </View>

        {/* La rangée défile à l'horizontale : quatre choix ne tiennent pas
            tous sur la largeur d'un petit téléphone. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Onglets
            libelle={t('disponibilites.periode')}
            options={[
              ...SEMAINES.map((n) => ({
                valeur: `${n}`,
                texte: t('disponibilites.semainesCourt', { n }),
              })),
              {
                valeur: PERSONNALISE,
                texte: t('disponibilites.personnalise'),
                icone: 'calendar-outline' as const,
              },
            ]}
            valeur={choix}
            onChange={setChoix}
          />
        </ScrollView>

        {choix === PERSONNALISE && (
          <View style={styles.deuxChamps}>
            <View style={styles.moitie}>
              <SelecteurDate
                label={t('commun.du')}
                valeur={bornee.debut}
                min={cejour}
                max={dernierJour}
                onChange={(v) => {
                  setDebutPlage(v);
                  // Une fin avant le début n'est pas une plage : elle suit.
                  if (v > finPlage) setFinPlage(v);
                }}
              />
            </View>
            <View style={styles.moitie}>
              <SelecteurDate
                label={t('commun.au')}
                valeur={bornee.fin}
                min={bornee.debut}
                max={dernierJour}
                onChange={setFinPlage}
              />
            </View>
          </View>
        )}

        {/*
          Fond clair quoi qu'il arrive : l'image part sur le téléphone de
          quelqu'un d'autre, dont on ne connaît ni le thème ni l'application de
          messagerie.
        */}
        <ViewShot ref={capture} style={styles.image}>
          {/* Le titre nomme la plage : l'image se retrouve seule dans une
              conversation trois semaines plus tard. */}
          <View style={styles.enteteImage}>
            <Text style={styles.titre}>
              {t('disponibilites.titreImageAvecPlage', {
                plage: formatPlageDates(periode.debut, periode.fin, langue),
              })}
            </Text>
            {!!reglages.nom.trim() && <Text style={styles.nom}>{reglages.nom.trim()}</Text>}
          </View>

          {/* La même grille, sans les gestes ni les quarts : c'est l'image. */}
          <GrilleDispos blocs={blocs} initiales={initiales} langue={langue} accent={accent} />

          <View style={styles.legende}>
            <View style={styles.legendeEntree}>
              <View style={[styles.puce, { backgroundColor: accent }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.offert')}</Text>
            </View>
            <View style={styles.legendeEntree}>
              <View style={[styles.puce, { backgroundColor: '#F1EEF1' }]} />
              <Text style={styles.legendeTexte}>{t('disponibilites.nonDeclare')}</Text>
            </View>
          </View>
        </ViewShot>

        <Doux>{t('disponibilites.resume', { count: joursOfferts(periode) })}</Doux>
        <View style={styles.actions}>
          <Bouton
            titre={t('commun.partager')}
            icone={<Ionicons name="share-outline" size={18} color="#FFFFFF" />}
            onPress={() => void partager()}
          />
        </View>
        <Doux>{t('disponibilites.rienDePrive')}</Doux>
      </ScrollView>

      <FeuilleSurgissante
        ouvert={heures !== null}
        origine={heures?.point ?? null}
        onFermer={() => setHeures(null)}>
        {heures && (
          <>
            <SousTitre>{formatDateLongue(heures.date, langue)}</SousTitre>
            <Doux>{resumerJournee(heures.date)}</Doux>
            <Text style={styles.phrase}>{t('disponibilites.jeSuisDisponible')}</Text>
            <View style={styles.deuxChamps}>
              <SelecteurHeure
                label={t('disponibilites.deHeure')}
                valeur={debutSaisi}
                ouvert={champOuvert === 'debut'}
                onOuvert={(v) => setChampOuvert(v ? 'debut' : 'fin')}
                onChange={choisirDebut}
              />
              <SelecteurHeure
                label={t('disponibilites.aHeure')}
                valeur={finSaisie}
                ouvert={champOuvert === 'fin'}
                onOuvert={(v) => setChampOuvert(v ? 'fin' : null)}
                onChange={(v) => {
                  setFinSaisie(aimanterHeure(v));
                  setRefus(false);
                }}
              />
            </View>
            {refus && <Text style={styles.refus}>{t('disponibilites.finAvantDebut')}</Text>}
            <Bouton
              titre={t('commun.enregistrer')}
              icone={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              onPress={enregistrerHeures}
            />
          </>
        )}
      </FeuilleSurgissante>
    </View>
  );

  /** Ce que la journée porte déjà, en une ligne. */
  function resumerJournee(date: string): string {
    const jour = edition.jours.find((j) => j.date === date);
    if (!jour || jour.etat === 'neutre') return t('disponibilites.rienDeclare');
    if (jour.etat === 'complet') return t('disponibilites.journeeEntiere');
    return resumerPlages(jour.plages);
  }
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  image: {
    backgroundColor: '#FFFFFF',
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.m,
  },
  enteteImage: {
    marginBottom: espace.m,
  },
  titre: {
    /* Assez gros pour être le titre, assez petit pour que la plage tienne
       sur deux lignes au pire. */
    fontSize: 19,
    fontFamily: police.gras,
    color: '#1E1B22',
  },
  nom: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#1E1B22',
    marginTop: 2,
  },
  bloc: {
    marginBottom: espace.m,
  },
  mois: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#1E1B22',
    textTransform: 'capitalize',
    marginBottom: espace.xs,
  },
  ligne: {
    flexDirection: 'row',
  },
  initiale: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: police.demi,
    color: '#6E6875',
    marginBottom: 2,
  },
  case: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  pastille: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Assez gros pour rester lisible quand l'image s'affiche en vignette. */
  chiffre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: '#6E6875',
  },
  chiffreOffert: {
    color: '#FFFFFF',
    fontFamily: police.gras,
  },
  /** Une bordure pâle dit « pas toute la journée » sans changer la couleur. */
  pastillePartielle: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heures: {
    fontSize: 8,
    fontFamily: police.demi,
    color: '#FFFFFF',
  },
  legende: {
    flexDirection: 'row',
    gap: espace.l,
    marginTop: espace.xs,
  },
  legendeEntree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
  },
  puce: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendeTexte: {
    fontSize: 13,
    fontFamily: police.normal,
    color: '#1E1B22',
  },
  actions: {
    marginTop: espace.s,
    marginBottom: espace.m,
  },
  phrase: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  deuxChamps: {
    flexDirection: 'row',
    gap: espace.m,
  },
  moitie: {
    flex: 1,
  },
  editeur: {
    marginBottom: espace.l,
  },
  refus: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.alerte,
  },
});
