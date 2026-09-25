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
import { ouvrirSource, partagerSource } from '../../src/lib/veille/ouvrir';
import { filtrerSources, type SourceCherchable } from '../../src/lib/veille/recherche';
import { parTheme, type Theme } from '../../src/lib/liens';
import { MOTS_CLES_DOSE } from '../../src/lib/dose';
import { cleARevoir } from '../../src/lib/veille/recherches';
import { nomDuSujet } from '../../src/lib/veille/sujets';
import { etatVeille } from '../../src/lib/veille/tableau';
import { Doux, Ecran, Etiquette, Fondu, SousTitre, Vide } from '../../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

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
          <View style={[styles.rappel, { borderColor: accent }]}>
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
              hitSlop={10}>
              <Ionicons name="close" size={18} color={couleurs.doux} />
            </Pressable>
          </View>
        </Fondu>
      )}

      {revisions > 0 && (
        <Fondu>
          <Pressable
            onPress={() => router.push('/veille/revision')}
            style={({ pressed }) => [
              styles.revisions,
              { borderColor: accent },
              pressed && { opacity: 0.6 },
            ]}>
            <Ionicons name="school-outline" size={20} color={accent} />
            <Text style={[styles.revisionsTexte, { color: accent }]}>
              {t('clinique.revisionsDuJour', { count: revisions })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={accent} />
          </Pressable>
        </Fondu>
      )}

      <View style={styles.recherche}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('clinique.chercher')}
          placeholderTextColor={couleurs.doux}
          autoCorrect={false}
          returnKeyType="search"
        />
        {cherche && (
          <Pressable
            onPress={() => setRecherche('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('commun.effacerRecherche')}>
            <Ionicons name="close-circle" size={16} color={couleurs.doux} />
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
                <Ionicons name={ICONES_THEME[groupe.theme]} size={17} color={accent} />
                <SousTitre>{t(`themes.${groupe.theme}`)}</SousTitre>
              </View>
              {/* Le calculateur de dose est un écran, pas un signet. Il ouvre
                  la section des calculateurs, là où on le cherche. */}
              {groupe.theme === 'calculateurs' && doseVisible && (
                <Pressable
                  onPress={() => router.push('/clinique/dose')}
                  style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
                  <Ionicons name="calculator-outline" size={18} color={accent} />
                  <View style={styles.texte}>
                    <Text style={styles.titre}>{t('dose.titre')}</Text>
                    <Text style={styles.detail}>{t('dose.avis')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
                </Pressable>
              )}
              {groupe.liens.map((source) => (
                <LigneSource
                  key={`${groupe.theme}-${source.id}`}
                  source={source}
                  traduire={traduire}
                  onOuvrir={() => noterSourceOuverte(notee, source.id)}
                />
              ))}
              <View style={styles.espace} />
            </Fondu>
          ))}

          {/* Le calculateur cherché seul, sans qu'aucun signet ne réponde. */}
          {groupes.length === 0 && doseVisible && (
            <Fondu>
              <Pressable
                onPress={() => router.push('/clinique/dose')}
                style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
                <Ionicons name="calculator-outline" size={18} color={accent} />
                <View style={styles.texte}>
                  <Text style={styles.titre}>{t('dose.titre')}</Text>
                  <Text style={styles.detail}>{t('dose.avis')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
              </Pressable>
            </Fondu>
          )}
        </>
      )}

      {!cherche && (
        <>
          <Pressable
            onPress={() => router.push('/veille')}
            style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
            <Ionicons name="bookmark-outline" size={18} color={accent} />
            <Text style={styles.titre}>{t('clinique.maVeille')}</Text>
            <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
          </Pressable>

          {/* Les numéros d'urgence suivent les sources : ils faisaient partie
              de « Liens et infos utiles », et les laisser derrière aurait été
              les perdre. */}
          {SECTIONS.map((section) => (
            <View key={section.titre} style={styles.espace}>
              <SousTitre>{t('clinique.urgences')}</SousTitre>
              {section.liens.map((lien) => (
                <LigneFixe key={lien.libelle} lien={lien} />
              ))}
            </View>
          ))}
        </>
      )}
    </Ecran>
  );
}

function LigneSource({
  source,
  traduire,
  onOuvrir,
}: {
  source: SourceListee;
  traduire: (cle: string) => string;
  onOuvrir: () => void;
}) {
  const accent = useAccent();
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
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons
        name={aRemettre ? 'person-outline' : 'document-text-outline'}
        size={18}
        color={accent}
      />
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
          hitSlop={12}>
          <Ionicons name="share-outline" size={18} color={accent} />
        </Pressable>
      )}
      <Pressable
        onPress={() => router.push(`/lien/${source.id}`)}
        accessibilityRole="button"
        accessibilityLabel={traduire('commun.details')}
        hitSlop={12}>
        <Ionicons name="ellipsis-horizontal" size={18} color={couleurs.doux} />
      </Pressable>
    </Pressable>
  );
}

function LigneFixe({ lien }: { lien: LienFixe }) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() =>
        void Linking.openURL(
          lien.type === 'tel' ? `tel:${lien.valeur.replace(/[^\d+]/g, '')}` : lien.valeur
        )
      }
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons name={lien.type === 'tel' ? 'call' : 'open-outline'} size={18} color={accent} />
      <View style={styles.texte}>
        <Text style={styles.titre}>{lien.libelle}</Text>
        {!!lien.detail && <Text style={styles.detail}>{lien.detail}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingTop: espace.xl },
  rappel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    borderWidth: 1.5,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    marginBottom: espace.l,
  },
  action: { borderRadius: rayon, paddingVertical: espace.s, paddingHorizontal: espace.m },
  actionTexte: { fontSize: 13, fontFamily: police.demi, color: '#FFFFFF' },
  revisions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    borderWidth: 1.5,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    marginBottom: espace.l,
  },
  revisionsTexte: { flex: 1, fontSize: 15, fontFamily: police.demi },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 44,
    marginBottom: espace.l,
  },
  saisie: { flex: 1, fontSize: 15, fontFamily: police.normal, color: couleurs.texte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.s,
  },
  texte: { flex: 1, gap: 2 },
  titre: { flex: 1, fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  detail: { fontSize: 13, fontFamily: police.normal, color: couleurs.doux },
  etiquette: {
    marginTop: espace.xs,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
  },
  espace: { marginTop: espace.m },
});
