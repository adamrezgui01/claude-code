import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SECTIONS, type Lien as LienFixe } from '../../src/content/liens';
import {
  dernierBandeauRecherche,
  listerContenus,
  listerRecherches,
  listerSources,
  noterBandeauRecherche,
  noterRecherche,
  noterSourceOuverte,
  refuserBandeauRecherche,
  refusDeRecherche,
  reglagesVeille,
  statutsDesSujets,
  sujetsDeLaSource,
  type Source,
} from '../../src/db/veille';
import { useTextes } from '../../src/i18n';
import { aujourdhui } from '../../src/lib/dates';
import { titreDuLien } from '../../src/lib/liens';
import { ouvrirPageOfficielle, ouvrirSource, partagerSource } from '../../src/lib/veille/ouvrir';
import { filtrerSources, type SourceCherchable } from '../../src/lib/veille/recherche';
import { parTheme, type Theme } from '../../src/lib/liens';
import { MOTS_CLES_DOSE } from '../../src/lib/dose';
import { cleARevoir } from '../../src/lib/veille/recherches';
import { nomDuSujet } from '../../src/lib/veille/sujets';
import { etatVeille } from '../../src/lib/veille/tableau';
import { Ecran, Etiquette, Fondu, Section, SousTitre, Vide } from '../../src/ui/composants';
import {
  couleurs,
  dimensions,
  espace,
  graisse,
  icone,
  typo,
  useAccent,
  CIBLE_MIN,
} from '../../src/ui/theme';

type SourceListee = Source & SourceCherchable;

/**
 * L'icône de chaque thème. Elle accompagne le mot, elle ne le remplace pas :
 * huit pictogrammes posés seuls ne se distinguent pas à dix-sept points, et
 * personne n'apprend une légende pour lire une liste.
 */
const ICONES_THEME: Record<Theme, ComponentProps<typeof Ionicons>['name']> = {
  calculateurs: 'calculator-outline',
  respiratoire: 'cloud-outline',
  antibio: 'bandage-outline',
  itss: 'shield-half-outline',
  cardioSang: 'heart-outline',
  metabolique: 'pulse-outline',
  douleur: 'medkit-outline',
  ainees: 'accessibility-outline',
  oeil: 'eye-outline',
  general: 'library-outline',
  autres: 'bookmark-outline',
};

/**
 * L'onglet Clinique.
 *
 * La veille est la moitié de l'application : elle sort du Menu et prend sa
 * propre place, au centre de la barre, là où le pouce tombe.
 *
 * Trois choses, de haut en bas. Ce qu'il y a à revoir ce soir, mais seulement
 * s'il y a quelque chose — « 0 note à revoir » est une ligne qui ne sert à
 * rien et qu'on apprend à ne plus lire. La recherche. Et les sources, groupées
 * par sujet.
 *
 * L'onglet n'a donc pas d'écran vide : dès le premier lancement, les sources
 * sont là.
 */
export default function Clinique() {
  const { t } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const jour = aujourdhui();

  const [sources, setSources] = useState<SourceListee[]>([]);
  const [revisions, setRevisions] = useState(0);
  const [recherche, setRecherche] = useState('');
  /** L'identifiant de la recherche notée, pour y rattacher la source ouverte. */
  const [notee, setNotee] = useState(0);
  const [aRevoir, setARevoir] = useState<string | null>(null);

  const traduire = useCallback((cle: string) => t(cle), [t]);

  useFocusEffect(
    useCallback(() => {
      const brutes = listerSources();
      const contenus = listerContenus();
      const plafond = reglagesVeille().veille_plafond;

      setSources(
        brutes.map((s) => ({
          ...s,
          sujets: sujetsDeLaSource(s.id).map((sujet) => nomDuSujet(sujet, traduire)),
        }))
      );
      setRevisions(
        etatVeille(
          contenus.map((c) => ({
            id: c.id,
            prochaine: c.prochaine_revision,
            revisable: true,
            sujets: statutsDesSujets(c.id),
            statut: c.statut,
            valide_le: c.valide_le,
          })),
          brutes,
          jour,
          plafond
        ).revisions
      );
      setARevoir(
        cleARevoir(listerRecherches(), refusDeRecherche(), dernierBandeauRecherche(), Date.now())
      );
    }, [jour, traduire])
  );

  /**
   * La recherche est notée quand l'usager s'arrête de taper, pas à chaque
   * lettre : « m », « me », « met » ne sont pas trois questions.
   */
  useEffect(() => {
    const terme = recherche.trim();
    if (terme.length < 3) {
      setNotee(0);
      return;
    }
    const minuterie = setTimeout(() => {
      setNotee(noterRecherche(terme, filtrerSources(sources, terme).length));
    }, 900);
    return () => clearTimeout(minuterie);
  }, [recherche, sources]);

  const trouvees = useMemo(() => filtrerSources(sources, recherche), [sources, recherche]);

  /**
   * Le calculateur de dose est un écran, pas un lien. Il se cherche comme une
   * source quand même : on tape « mg/kg » sans savoir si ce qu'on cherche est
   * une page ou un outil.
   */
  const doseVisible = useMemo(
    () =>
      filtrerSources(
        [{ id: -1, titre: t('dose.titre'), categorie: '', motsCles: MOTS_CLES_DOSE, sujets: [] }],
        recherche
      ).length > 0,
    [recherche, t]
  );
  /**
   * Les signets, groupés par thème.
   *
   * Quarante-cinq entrées ne se lisent pas en liste. On les regroupe par ce
   * qu'on a en tête au moment de chercher — une plaie qui s'étend, une
   * ordonnance d'azithromycine à valider, une créatinine à convertir — plutôt
   * que par le sujet de veille auquel elles sont rattachées : un même guide
   * porte souvent deux sujets, et il apparaissait alors deux fois.
   */
  const groupes = useMemo(() => parTheme(trouvees), [trouvees]);

  const cherche = recherche.trim().length > 0;

  return (
    <Ecran style={styles.contenu}>
      {/* Rien à revoir : pas de ligne. Un compteur à zéro s'apprend à ne plus
          se lire, et emporte avec lui celui qui ne l'est pas. */}
      {/* Trois fois la même question en trois mois : c'est un sujet qui ne
          rentre pas, et ça se dit sans que personne ait eu à l'admettre. */}
      {!!aRevoir && (
        <Fondu>
          <View style={styles.rappel}>
            <View style={styles.texte}>
              <Text style={styles.titre}>{t('clinique.bandeauTitre')}</Text>
              <Text style={styles.detail}>{aRevoir}</Text>
            </View>
            <Pressable
              onPress={() => {
                noterBandeauRecherche(aRevoir);
                setARevoir(null);
                router.push(`/veille/note/nouvelle?titre=${encodeURIComponent(aRevoir)}`);
              }}
              // La seule invitation de l'écran : c'est son action principale.
              testID="action-principale"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: accent },
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={styles.actionTexte}>{t('clinique.bandeauAction')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                refuserBandeauRecherche(aRevoir);
                setARevoir(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('commun.fermer')}
              style={styles.fermer}>
              <Ionicons name="close" size={icone.courante} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>
        </Fondu>
      )}

      {revisions > 0 && (
        <Fondu>
          <Pressable
            onPress={() => router.push('/veille/revision')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.revisions, pressed && { opacity: 0.6 }]}>
            <Ionicons name="school-outline" size={icone.courante} color={couleurs.texteSecondaire} />
            <Text style={styles.revisionsTexte}>
              {t('clinique.revisionsDuJour', { count: revisions })}
            </Text>
            <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
          </Pressable>
        </Fondu>
      )}

      <View style={styles.recherche}>
        <Ionicons name="search" size={icone.petite} color={couleurs.texteSecondaire} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('clinique.chercher')}
          placeholderTextColor={couleurs.texteSecondaire}
          autoCorrect={false}
          returnKeyType="search"
        />
        {cherche && (
          <Pressable
            onPress={() => setRecherche('')}
            accessibilityRole="button"
            accessibilityLabel={t('commun.effacerRecherche')}
            style={styles.effacer}>
            <Ionicons name="close-circle" size={icone.petite} color={couleurs.texteSecondaire} />
          </Pressable>
        )}
      </View>

      {trouvees.length === 0 && !doseVisible ? (
        <Vide texte={t('clinique.aucunResultat')} />
      ) : (
        <>
          {groupes.map((groupe) => (
            <Fondu key={groupe.theme}>
              {/* L'icône accompagne le mot, elle ne le remplace pas : huit
                  pictogrammes seuls ne se distinguent pas à cette taille, et
                  personne n'apprend une légende pour lire une liste. */}
              <View style={styles.entete}>
                <Ionicons
                  name={ICONES_THEME[groupe.theme]}
                  size={icone.petite}
                  color={couleurs.texteSecondaire}
                />
                <SousTitre>{t(`themes.${groupe.theme}`)}</SousTitre>
              </View>
              {/* Un thème, une section : un fond blanc, un filet entre deux
                  sources, et plus de cadre autour de chacune. */}
              <Section>
                {/* Le calculateur de dose est un écran, pas un signet. Il ouvre
                    la section des calculateurs, là où on le cherche. */}
                {groupe.theme === 'calculateurs' && doseVisible && (
                  <LigneDose onPress={() => router.push('/clinique/dose')} />
                )}
                {groupe.liens.map((source) => (
                  <LigneSource
                    key={`${groupe.theme}-${source.id}`}
                    source={source}
                    traduire={traduire}
                    onOuvrir={() => noterSourceOuverte(notee, source.id)}
                  />
                ))}
              </Section>
            </Fondu>
          ))}

          {/* Le calculateur cherché seul, sans qu'aucun signet ne réponde. */}
          {groupes.length === 0 && doseVisible && (
            <Fondu>
              <Section>
                <LigneDose onPress={() => router.push('/clinique/dose')} />
              </Section>
            </Fondu>
          )}
        </>
      )}

      {!cherche && (
        <>
          <Section>
            <Pressable
              onPress={() => router.push('/veille')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
              <Ionicons name="bookmark-outline" size={icone.courante} color={couleurs.texteSecondaire} />
              <Text style={styles.titre}>{t('clinique.maVeille')}</Text>
              <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
            </Pressable>
          </Section>

          {/* Les numéros d'urgence suivent les sources : ils faisaient partie
              de « Liens et infos utiles », et les laisser derrière aurait été
              les perdre. */}
          {SECTIONS.map((section) => (
            <Section key={section.titre} titre={t('clinique.urgences')}>
              {section.liens.map((lien) => (
                <LigneFixe key={lien.libelle} lien={lien} />
              ))}
            </Section>
          ))}
        </>
      )}
    </Ecran>
  );
}

/** Le calculateur de dose, posé en tête des calculateurs comme une source. */
function LigneDose({ onPress }: { onPress: () => void }) {
  const { t } = useTextes();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <View style={styles.texte}>
        <Text style={styles.titre}>{t('dose.titre')}</Text>
        <Text style={styles.detail}>{t('dose.avis')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={icone.petite} color={couleurs.texteSecondaire} />
    </Pressable>
  );
}

/**
 * Une source, sur une ligne de sa section. Sans icône devant : c'était la
 * même feuille sur quarante-cinq lignes, et le feuillet à remettre au patient
 * porte déjà son étiquette.
 */
function LigneSource({
  source,
  traduire,
  onOuvrir,
}: {
  source: SourceListee;
  traduire: (cle: string) => string;
  onOuvrir: () => void;
}) {
  const router = useRouter();
  const aRemettre = !!source.pour_patient;
  return (
    <Pressable
      onPress={() => {
        onOuvrir();
        void ouvrirSource(source, !!reglagesVeille().veille_navigateur, () =>
          Alert.alert(traduire('veille.documentDeplace'))
        );
      }}
      onLongPress={() => router.push(`/lien/${source.id}`)}
      delayLongPress={400}
      accessibilityRole="button"
      testID={`source-${source.id}`}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <View style={styles.texte}>
        <Text style={styles.titre}>{titreDuLien(source, traduire)}</Text>
        {!!source.organisation && (
          <Text style={styles.detail}>
            {source.organisation}
            {source.version ? ` · ${source.version}` : ''}
          </Text>
        )}
        {/* Un feuillet à remettre n'est pas une référence à consulter. Ça se
            sait au moment d'ouvrir, pas dans une section à part : on cherche
            « poux » sans savoir d'avance si la réponse est pour soi. */}
        {aRemettre && (
          <View style={styles.etiquette}>
            <Etiquette texte={traduire('clinique.aRemettre')} ton="succes" />
          </View>
        )}
      </View>
      {/* Un feuillet, on l'envoie ou on l'imprime : c'est le geste fréquent, et
          il coûte une tape ici plutôt que trois dans le document ouvert. */}
      {aRemettre && (
        <Pressable
          onPress={() => void partagerSource(source)}
          accessibilityRole="button"
          accessibilityLabel={traduire('commun.partager')}
          style={styles.icone}>
          <Ionicons name="share-outline" size={icone.courante} color={couleurs.textePrincipal} />
        </Pressable>
      )}
      {/* La page de la source est l'action secondaire de la ligne, jamais une
          deuxième ligne : c'est elle qu'on rouvre quand on doute que le PDF
          soit encore la bonne version. Le détail du signet reste à l'appui
          long, et sur ce bouton pour un signet de l'usager qui n'a pas de
          page. */}
      {source.url_reference.trim() ? (
        <Pressable
          onPress={() => void ouvrirPageOfficielle(source)}
          accessibilityRole="button"
          accessibilityLabel={traduire('clinique.pageOfficielle')}
          style={styles.icone}>
          <Ionicons name="globe-outline" size={icone.courante} color={couleurs.texteSecondaire} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push(`/lien/${source.id}`)}
          accessibilityRole="button"
          accessibilityLabel={traduire('commun.details')}
          style={styles.icone}>
          <Ionicons name="ellipsis-horizontal" size={icone.courante} color={couleurs.texteSecondaire} />
        </Pressable>
      )}
    </Pressable>
  );
}

function LigneFixe({ lien }: { lien: LienFixe }) {
  return (
    <Pressable
      onPress={() =>
        void Linking.openURL(
          lien.type === 'tel' ? `tel:${lien.valeur.replace(/[^\d+]/g, '')}` : lien.valeur
        )
      }
      accessibilityRole="button"
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons
        name={lien.type === 'tel' ? 'call-outline' : 'open-outline'}
        size={icone.courante}
        color={couleurs.texteSecondaire}
      />
      <View style={styles.texte}>
        <Text style={styles.titre}>{lien.libelle}</Text>
        {!!lien.detail && <Text style={styles.detail}>{lien.detail}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: espace[6] },
  /** Blanc sur le gris, sans contour mauve : l'invitation se lit à son bouton. */
  rappel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingVertical: espace[3],
    paddingLeft: dimensions.carte.remplissage,
    marginBottom: espace[4],
  },
  action: {
    borderRadius: dimensions.bouton.rayon,
    paddingHorizontal: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    justifyContent: 'center',
  },
  actionTexte: { ...typo.footnote, fontWeight: graisse.demi, color: couleurs.surAccent },
  fermer: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revisions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingVertical: espace[3],
    paddingHorizontal: dimensions.carte.remplissage,
    marginBottom: espace[4],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  revisionsTexte: { flex: 1, ...typo.body, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  /** La barre de recherche a la forme d'un champ : même hauteur, même rayon, aucun contour. */
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.champ.rayon,
    paddingHorizontal: dimensions.champ.remplissageH,
    minHeight: dimensions.champ.hauteur,
    marginBottom: dimensions.formulaire.entreGroupes,
  },
  saisie: {
    flex: 1,
    ...typo.body,
    color: couleurs.textePrincipal,
    minHeight: dimensions.champ.hauteur,
    minWidth: CIBLE_MIN,
  },
  effacer: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Une ligne de section : la section porte le fond et le filet. */
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    paddingVertical: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  icone: {
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texte: { flex: 1, gap: espace[1] },
  titre: { flex: 1, ...typo.body, color: couleurs.textePrincipal },
  detail: { ...typo.footnote, color: couleurs.texteSecondaire },
  etiquette: {
    marginTop: espace[1],
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
  },
});
