import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

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
  chevauchement,
  disponibilitesEntre,
  finProposee,
  plageValide,
  moisAffiche,
  moisNavigable,
  resumerPlages,
  MOIS_MAX,
  type Geste,
} from '../src/lib/disponibilites';
import {
  aujourdhui,
  debutMois,
  decalerMois,
  formatDateLongue,
  formatHeure,
  formatMoisAnnee,
  joursCourts,
} from '../src/lib/dates';
import { Bouton, Doux } from '../src/ui/composants';
import { FeuilleSurgissante, type PointEcran } from '../src/ui/FeuilleSurgissante';
import { GrilleMois } from '../src/ui/GrilleMois';
import { SelecteurHeure } from '../src/ui/Selecteurs';
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  typo,
  useAccent,
  CIBLE_MIN,
} from '../src/ui/theme';

/**
 * Les disponibilités : un mois, les gestes qui le remplissent, et un bouton
 * pour l'envoyer.
 *
 * **Rien ne défile ici.** La grille porte les gestes, et une grille posée dans
 * un conteneur qui défile se dispute le doigt avec lui : le V2.5.3 avait
 * remis sous la grille la légende de l'image, le sélecteur de plage, l'aperçu
 * et le compte, le contenu débordait, le défilement revenait, et les gestes
 * mouraient. Tout ce qui sert au partage vit sur son propre écran
 * (`disponibilites/partager`), qui s'ouvre du bouton du bas.
 */
export default function Disponibilites() {
  const { t, langue } = useTextes();
  const accent = useAccent();
  const router = useRouter();
  const [plages, setPlages] = useState(listerDisponibilites);
  const [quarts] = useState(listerQuarts);
  const [reglages] = useState(obtenirReglages);
  const cejour = aujourdhui();
  /** La limite dure : on n'offre rien au-delà d'un an. */
  const dernierJour = decalerMois(cejour, MOIS_MAX);
  /** Le mois montré. L'écran ouvre sur le mois courant, pas sur le suivant. */
  const [moisVu, setMoisVu] = useState(() => debutMois(cejour));

  /**
   * La période qu'on modifie va jusqu'à la limite d'un an : une journée qu'on
   * veut offrir en mars ne doit pas attendre. Celle qu'on partage se choisit
   * sur l'écran du partage.
   */
  const edition = useMemo(
    () => disponibilitesEntre(plages, cejour, dernierJour, quarts),
    [plages, quarts, cejour, dernierJour]
  );

  const grille = useMemo(() => moisAffiche(edition, moisVu, cejour), [edition, moisVu, cejour]);
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

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: t('disponibilites.titre') }} />
      <View style={styles.contenu}>
        {/*
          Un mois à la fois, et deux flèches. Pas de balayage horizontal pour
          en changer : le doigt qui traverse l'écran peint des journées.
        */}
        <View style={styles.enteteMois}>
          <Fleche
            sens={-1}
            actif={moisNavigable(moisVu, -1, cejour)}
            etiquette={t('disponibilites.moisPrecedent')}
            onPress={() => setMoisVu(decalerMois(moisVu, -1))}
          />
          <Text accessibilityRole="header" style={styles.nomDuMois} numberOfLines={1}>
            {formatMoisAnnee(moisVu, langue)}
          </Text>
          <Fleche
            sens={1}
            actif={moisNavigable(moisVu, 1, cejour)}
            etiquette={t('disponibilites.moisSuivant')}
            onPress={() => setMoisVu(decalerMois(moisVu, 1))}
          />
        </View>

        {/* Même réparé, un geste qu'aucun texte n'annonce n'est pas utilisé. */}
        <Doux>{t('disponibilites.consigne')}</Doux>

        {/* La grille prend toute la place qui reste, et n'en déborde jamais. */}
        <View style={styles.editeur}>
          <GrilleMois
            mois={grille}
            initiales={initiales}
            accent={accent}
            onGeste={appliquer}
            onHeures={ouvrirHeures}
          />
        </View>

        <View style={styles.legendeGrille}>
          <Entree couleur={accent} actif texte={t('disponibilites.offert')} />
          <Entree couleur={accent} actif point texte={t('disponibilites.heuresPrecises')} />
          <Entree couleur={accent} actif rond texte={t('disponibilites.quartPrevu')} />
          <Entree couleur={couleurs.filet} texte={t('disponibilites.libre')} />
        </View>

        <Bouton
          titre={t('commun.partager')}
          icone={<Ionicons name="share-outline" size={icone.courante} color={couleurs.surAccent} />}
          onPress={() => router.push(`/disponibilites/partager?mois=${moisVu}`)}
        />
      </View>

      <FeuilleSurgissante
        ouvert={heures !== null}
        origine={heures?.point ?? null}
        onFermer={() => setHeures(null)}>
        {heures && (
          <>
            <Text style={styles.titreFeuille}>{formatDateLongue(heures.date, langue)}</Text>
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
              icone={<Ionicons name="checkmark" size={icone.courante} color={couleurs.surAccent} />}
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

/**
 * Une flèche de l'en-tête. Éteinte quand le mois visé sort des bornes :
 * jamais vers le passé, douze mois vers l'avant au plus.
 */
function Fleche({
  sens,
  actif,
  etiquette,
  onPress,
}: {
  sens: -1 | 1;
  actif: boolean;
  etiquette: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={actif ? onPress : undefined}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityLabel={etiquette}
      accessibilityState={{ disabled: !actif }}
      style={({ pressed }) => [styles.fleche, pressed && actif && { opacity: 0.6 }]}>
      <Ionicons
        name={sens === -1 ? 'chevron-back' : 'chevron-forward'}
        size={icone.grande}
        color={actif ? couleurs.texteSecondaire : couleurs.filet}
      />
    </Pressable>
  );
}

/**
 * Une entrée de la légende. Quatre états, quatre échantillons.
 *
 * Un échantillon de l'état choisi reproduit l'élément actif : il en porte le
 * mauve, et le repère `echantillon-actif` le dit au test du mauve.
 */
function Entree({
  couleur,
  texte,
  point,
  rond,
  actif,
}: {
  couleur: string;
  texte: string;
  actif?: boolean;
  /** Une journée offerte sur des heures précises : le carré porte ses heures. */
  point?: boolean;
  /** Un quart prévu : le carré porte son point blanc. */
  rond?: boolean;
}) {
  return (
    <View style={styles.legendeEntree}>
      <View
        testID={actif ? 'echantillon-actif' : undefined}
        style={[styles.puce, point && styles.puceLarge, { backgroundColor: couleur }]}>
        {point && <Text style={styles.puceHeures}>9–17</Text>}
        {rond && <View style={styles.pucePoint} />}
      </View>
      <Text style={styles.legendeTexte} numberOfLines={1}>
        {texte}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fondEcran,
  },
  /** Tout tient dans l'écran : la grille prend ce que le reste laisse. */
  contenu: {
    flex: 1,
    paddingHorizontal: dimensions.ecran.margeH,
    paddingTop: dimensions.ecran.margeHaut,
    paddingBottom: espace[6],
    gap: espace[3],
  },
  enteteMois: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fleche: {
    minWidth: CIBLE_MIN,
    minHeight: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomDuMois: {
    flexShrink: 1,
    ...typo.title3,
    fontWeight: graisse.grasse,
    color: couleurs.textePrincipal,
    textTransform: 'capitalize',
  },
  editeur: {
    flex: 1,
  },
  /** Une seule ligne : quatre échantillons compacts, quatre mots. */
  legendeGrille: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espace[2],
  },
  legendeEntree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[1],
  },
  puce: {
    width: dimensions.echantillon.hauteur,
    height: dimensions.echantillon.hauteur,
    borderRadius: dimensions.case.rayon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** L'échantillon des heures précises porte « 9–17 » : il lui faut la largeur. */
  puceLarge: {
    width: dimensions.echantillon.largeur,
  },
  puceHeures: {
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.surAccent,
  },
  pucePoint: {
    position: 'absolute',
    top: espace[1],
    right: espace[1],
    width: dimensions.point.cote,
    height: dimensions.point.cote,
    borderRadius: dimensions.point.cote / 2,
    backgroundColor: couleurs.surAccent,
  },
  legendeTexte: {
    ...typo.caption1,
    color: couleurs.textePrincipal,
  },
  titreFeuille: {
    ...typo.headline,
    color: couleurs.textePrincipal,
    textTransform: 'capitalize',
  },
  phrase: {
    ...typo.body,
    color: couleurs.textePrincipal,
  },
  deuxChamps: {
    flexDirection: 'row',
    gap: espace[3],
  },
  moitie: {
    flex: 1,
  },
  refus: {
    ...typo.subhead,
    fontWeight: graisse.demi,
    color: couleurs.alerte,
  },
});
