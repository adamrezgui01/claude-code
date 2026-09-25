@AGENTS.md

# Les tests, et pourquoi ils priment

Cette application calcule de l'argent réel. Une erreur d'arrondi, un taux
appliqué rétroactivement, une pause déduite deux fois : rien de tout ça ne se
voit à l'écran, et tout ça part chez un client sur une facture. Les tests sont
la seule chose qui garde ces chiffres honnêtes.

## Avant de terminer une session

Toute session qui modifie le code lance `npm test` avant de conclure. Tous les
tests doivent passer. Une session se termine par une ligne qui donne le
résultat : combien de tests, combien passent.

## Écrire un test

Une nouvelle règle de calcul introduite par un prompt vient avec ses tests, et
ces tests s'écrivent **à partir de la règle, jamais à partir du code**.

C'est le point qui compte le plus ici. Un test écrit en lisant le code décrit
ce que le code fait déjà, bogues compris, et passe toujours. Il ne prouve rien.
La réponse attendue se calcule à la main, depuis la spécification, avant
d'ouvrir le fichier concerné.

## Voir le test échouer d'abord

Pour chaque bogue corrigé et chaque règle nouvelle : écrire le test, le lancer,
**le voir échouer** sur le code actuel, puis écrire le code. Un test qu'on n'a
jamais vu échouer ne prouve rien — il peut très bien ne rien vérifier du tout.

La même chose vaut pour un test déjà écrit dont on doute : réintroduire le
défaut qu'il est censé attraper, et vérifier qu'il tombe.

## Quand un test échoue

On corrige le code. Jamais la valeur attendue.

Si une valeur attendue semble contredire la spécification, on laisse le test en
échec, on le marque comme contesté, et on s'en explique. On ne la force pas
dans le code pour obtenir du vert.

## Les hooks ne s'appellent que dans un composant

`useTextes`, `useState`, `useEffect` et les autres ne s'appellent que dans le
corps d'un composant ou d'un hook personnalisé. Jamais dans une fonction
ordinaire, jamais dans un rappel d'événement, jamais dans un `setTimeout`,
jamais dans un gestionnaire de notification.

Une fonction appelée depuis un rappel reçoit `t` et `langue` **en paramètres**.
Elle ne va pas les chercher elle-même. Et on ne remplace pas non plus par un
appel direct à `i18n.t` hors composant : le texte cesserait de se retraduire au
changement de langue.

Ce défaut ne se voit nulle part. Il passe le typage, il passe les tests, il
passe le démarrage, et il casse au moment exact où l'usager touche le bouton.
`npm test` lance donc le lint avant Jest, avec `react-hooks/rules-of-hooks` en
erreur : une régression casse la suite.

## Où vivent les tests

Dans `tests/`, un fichier par domaine. Ils portent sur la logique — les
fonctions pures de `src/lib/` — jamais sur l'interface ni sur le stockage.
SQLite, `expo-secure-store` et les notifications ne tournent pas dans Jest, et
n'ont rien à apprendre sur un calcul de toute façon. Les données se construisent
dans le test lui-même, avec les fabriques de `tests/fabriques.ts`.

Un calcul mêlé au code d'un écran est un calcul qu'on ne peut pas vérifier :
il s'extrait dans une fonction pure, que l'écran appelle ensuite.

## Les règles que ces tests tiennent

Elles se contredisent facilement à l'usage ; elles sont écrites ici pour
qu'on ne les redécouvre pas trois fois.

- Un quart est la seule source de vérité. Une facture n'est qu'une mise en
  page de quarts existants : elle n'entre dans aucune statistique, et générer
  autant de factures qu'on veut ne peut rien corrompre.
- Le doublon se vérifie par quart, par le numéro de facture qu'il porte, et
  jamais par période. Un propriétaire qui possède deux pharmacies facture
  légitimement la même quinzaine deux fois.
- Chaque quart fige ses chiffres le jour de sa création : taux horaire, taux
  au kilomètre, aller-retour, pause. Renégocier une entente ne réécrit jamais
  ce qui est déjà entré.
- Zéro kilomètre est une valeur ; une distance jamais calculée n'en est pas
  une. Elles ne se confondent pas, et l'inconnu ne s'affiche jamais comme 0 $.
- Une fin d'horaire inférieure ou égale au début veut dire le lendemain.
- Un quart bascule dans « Antérieurs » quand il est fini, pas quand sa date
  est passée. « Fini » se calcule à un seul endroit — `etatQuart` — et sert à
  trois choses : la bascule, le verrou de facturation et la couleur. Deux
  définitions finiraient par diverger, et le verrou est celle qui protège une
  facture déjà envoyée.
- Le gris ne dit qu'une chose : **facturé, donc figé**. Un quart fait mais pas
  encore facturé est exactement le contraire — c'est celui sur lequel il reste
  du travail, et c'est l'étape qui rapporte. Il garde sa couleur et porte une
  pastille ; le griser dirait « rien à voir ici » sur la seule chose qui
  attend.
- Facturé et payé partagent ce gris et se distinguent par leur **pastille**,
  jamais par une nuance de gris : personne ne compare deux gris de mémoire,
  d'un écran à l'autre, en plein soleil. Une pastille creuse dit qu'il reste un
  geste à poser — facturer, ou encaisser —, une pastille pleine qu'il n'en
  reste aucun. Les quatre états sortent d'un seul endroit, `etatFacturation`,
  et leur apparence d'un seul autre, `marqueDuQuart` : trois vues qui
  recalculeraient elles-mêmes finiraient par diverger.
- Toute somme sortie d'un calcul est arrondie au cent avant d'être conservée.
- Un montant facturable se calcule et s'arrondit **une seule fois**, sur le
  quart. Factures et statistiques additionnent des montants déjà arrondis :
  elles ne repartent jamais des taux et des distances.
- Dans toute la hiérarchie des valeurs par défaut — réglages, pharmacie,
  quart — zéro est une valeur, et seul le vide hérite du niveau au-dessus.
- « Argent » compte tout ce qui se facture : honoraires, kilométrage, per
  diem, hébergement payé, frais ponctuels. L'hébergement fourni par la
  pharmacie n'est pas facturé, donc n'y entre pas.
- **La base de l'usager ne se remet jamais à zéro.** Aucun `DROP TABLE`, nulle
  part. Une table nouvelle passe par `CREATE TABLE IF NOT EXISTS`, une colonne
  par `ajouterColonne`, une réécriture de données par la table `reprises`.
  Incrémenter le numéro de schéma ne détruit plus rien, et ne doit plus jamais
  le pouvoir.
- Un quart appartient à la date de son début, quart de nuit compris.
- Un dépôt aimante à la demi-heure la plus proche ; la demie exacte monte.
- **Le lecteur ne détruit rien**, au même titre qu'il ne crée rien. Une phrase
  d'annulation *résout* un quart : elle mène à un écran qui montre la
  pharmacie, la date, les heures et le montant, et la suppression demande une
  tape. Jamais le premier candidat par défaut, jamais tous d'un coup. Un quart
  annulé quitte l'horaire et les revenus, mais sa ligne reste sur la fiche de
  la pharmacie, avec qui a annulé : une pharmacie qui annule trois fois est
  exactement ce que les favoris et les « à éviter » doivent voir. Et la journée
  ne redevient pas disponible toute seule — une dispo se déclare.
- Il quitte **les trois vues d'un coup**, pas seulement « À venir » : barré au
  milieu d'une semaine, il occupe la place d'un vrai quart et se relit comme un
  engagement à chaque coup d'œil. Le filtre se pose une fois, en haut de
  l'écran, et les trois vues partent de là ; écrit vue par vue, il s'oublie à
  la quatrième. Sa ligne sur la fiche de la pharmacie ouvre sa fiche : depuis
  qu'il a quitté l'horaire, c'est le seul chemin vers lui, et une annulation
  par erreur doit pouvoir se défaire.
- Le signal « annule souvent » se lève à **trois annulations imputables à la
  pharmacie en douze mois**, et vit dans le répertoire, là où l'on choisit chez
  qui aller. Deux arrivent à tout le monde ; signaler là, c'est apprendre à
  l'usager à ne plus lire le signal. Un quart que l'usager a annulé lui-même,
  ou dont on ne sait pas qui l'a annulé, ne compte pas : on n'impute pas un
  tort sur une absence d'information. Le signal montre, il ne classe pas —
  cocher « à éviter » reste un geste de l'usager.
- Le lecteur de commandes ne crée jamais rien. Il remplit une fiche, l'usager
  confirme, et c'est la création ordinaire qui s'exécute — mêmes défauts,
  mêmes contrôles de chevauchement, même règle de minuit.
- Une phrase qui ne nomme aucun jour — « en octobre », « cette semaine » —
  ouvre le calendrier au bon endroit sans rien cocher. Le lecteur n'invente
  pas une date pour avoir l'air d'avoir compris.
- Une phrase qui ne dit qu'une borne d'horaire — « de 9 h à la fermeture » —
  garde celle qui est dite et laisse l'autre vide. Une fin supposée fait
  travailler trois heures de trop, ou de moins.
- Un nombre nu n'est jamais un montant. Chaque somme dictée a besoin de son
  mot — per diem, forfait, hébergement, kilomètres —, et « 40 » dit au milieu
  d'une phrase ne met rien sur une facture.
- Le nombre de kilomètres dicté est toujours la distance jusqu'à la pharmacie,
  aller simple, comme le champ de la fiche. « Aller-retour » ne fait que cocher
  la case qui la double ; le lecteur ne divise ni ne multiplie rien tout seul.
- Un quart n'empêche jamais d'offrir une journée : il se montre, il ne
  bloque pas. Un quart de neuf heures à une heure laisse l'après-midi et la
  soirée libres, et l'usager reste seul juge de ce qu'il offre. Quand une
  disponibilité mord sur un quart, on le dit — et on ne propose jamais
  d'annuler ni de remplacer le quart. C'est un engagement pris avec une
  pharmacie ; le supprimer par réflexe, au milieu d'une sélection de
  disponibilités, est un accident qui coûte cher. La fiche du quart s'ouvre
  d'un lien, et la suppression y vit avec sa confirmation.
- Ce qui part dans l'image des disponibilités dit ce qu'on offre, jamais où
  l'on travaille déjà. Les quarts se voient dans la grille qu'on modifie et
  nulle part ailleurs.
- Le surnom d'une pharmacie sert à la reconnaître, jamais à la désigner
  ailleurs. Une facture porte le nom légal ; « le gros PJC » ne sort pas de
  l'appareil.
- Une phrase peut porter **jusqu'à trois commandes**, et le découpage est
  prudent : on ne coupe à un connecteur que si ce qui le suit **commence par un
  verbe de commande**. « Jeudi et vendredi de 9 à 5 » est un seul quart à deux
  jours ; couper là inventerait une commande sans heure ni pharmacie. Au-delà
  de trois, rien n'est coupé : la phrase entière part au journal, parce qu'en
  exécuter trois sur quatre est pire que de n'en exécuter aucune. Les commandes
  s'ouvrent **une à une**, chacune par son écran ordinaire — la création reste
  la création ordinaire, avec ses défauts, ses contrôles de chevauchement et sa
  règle de minuit —, et la liste de cartes qui précède existe pour retirer ce
  que le découpage a mal compris avant que rien ne commence.
- Quand deux lectures d'une phrase tiennent debout, on pose une question avec
  des réponses à toucher. Une supposition silencieuse qui se trompe d'une
  demi-journée coûte un déplacement inutile ; une question coûte un geste.
- **Aucune commande n'est du texte seul.** Une icône seule quand le sens est
  évident sans explication — retour, fermer, rechercher, partager, imprimer,
  dupliquer, supprimer, favori. Une icône *et* un mot quand l'icône seule
  serait ambiguë : trois grilles de calendrier se ressemblent trop à 24 points
  pour dire laquelle est le jour, la semaine et le mois. Les boutons qui
  engagent gardent leur mot — Enregistrer, Supprimer, Annuler un quart : un
  geste irréversible se lit avant de se faire.
  Une icône seule porte toujours son `accessibilityLabel`, traduit : elle se
  lit d'un coup d'œil quand on voit l'écran, et ne dit rien du tout quand on ne
  le voit pas. Un test lit les écrans et refuse une commande muette. Un seul
  jeu d'icônes dans toute l'application — Ionicons —, et une cible tactile d'au
  moins 44 points même quand l'icône en occupe 24.
- Un texte affiché vit dans `src/i18n`, jamais en dur dans un écran. La
  facture fait exception dans l'autre sens : elle est toujours en français,
  quelle que soit la langue choisie.
- **Une seule notification automatique par jour**, le soir, à la même heure :
  le rendez-vous. Six rappels vivaient chacun de leur côté — un quart, un mémo
  de fin de quart, un document qui expire, une facture impayée, des notes à
  réviser, des sources à revérifier — et rien n'empêchait qu'un mardi de
  novembre en apporte quatre. Quatre vibrations dans la même soirée, et
  l'usager coupe les notifications de l'application : toutes, y compris celle
  qui lui aurait évité de manquer un quart. La seule exception est le rappel
  avant un quart que l'usager a réglé lui-même, à l'avance qu'il a choisie :
  celui-là, il l'a demandé.
- Le titre du rendez-vous se choisit par élimination : « Veille clinique » dès
  qu'il y a quelque chose à réviser, sinon le poste d'organisation le plus
  urgent. Le corps porte **deux noms au plus et aucun chiffre** : « À réviser :
  Infections urinaires » se lit d'un coup d'œil sur un écran verrouillé,
  « 4 révisions, 2 factures » se balaie sans y penser, et un troisième nom
  serait tronqué. Les comptes ont leur place dans l'application — la bande
  d'attente de l'horaire les porte — jamais sur un écran verrouillé.
- La **bande d'attente** de l'horaire est le pendant du rendez-vous du soir, et
  les comptes y sont permis : l'application est ouverte, et un chiffre dit s'il
  y a dix minutes de travail ou une heure. Trois lignes au plus, puis « Voir
  tout » — au-delà, elle pousse hors de vue l'horaire qu'on est venu voir. Rien
  à zéro ne prend de ligne. Un balayage vers la droite l'écarte **pour la
  journée**, jamais pour toujours : ce qui traîne traîne encore demain, et une
  bande qu'on pourrait éteindre définitivement finirait par cacher une facture
  de mille dollars. Elle ne vit que dans l'horaire ; répétée sur quatre
  onglets, elle devient du décor.
- L'écran de révision ne montre jamais un nombre de bonnes réponses, un
  pourcentage, ni une série de jours consécutifs. Il compte ce qu'il reste à
  faire, jamais ce qui a été réussi. L'application gère des sujets à revoir ;
  elle n'évalue pas le pharmacien.
- **L'application n'implémente aucun score clinique ni aucun modèle de
  risque** : elle pointe vers MDCalc. La valeur d'un CHA₂DS₂-VASc est dans son
  modèle, le modèle est révisé, et le recopier crée une dette de mise à jour et
  une responsabilité. Elle peut faire de l'**arithmétique d'unités** à partir
  de valeurs entièrement saisies par l'usager, à condition d'afficher chaque
  étape du calcul : une dose en millilitres est une multiplication et deux
  divisions, et il n'y a rien à tenir à jour là-dedans.
  Elle ne propose jamais de posologie. Le champ de dose part vide et le reste :
  une valeur périmée dans une liste intégrée se recopie sans réfléchir.
  Et une source sans document ouvre sa page officielle : une entrée incomplète
  mène à l'accueil de l'organisme plutôt qu'à rien.
- Le volet organisation — horaire, répertoire, factures, statistiques —
  n'importe rien du volet clinique. Les seules exceptions sont des fichiers de
  charpente : le menu, le démarrage, les réglages, et la reprogrammation des
  notifications au changement de langue. Un test les nomme et vérifie
  qu'aucune fonction du volet organisation ne s'y glisse.

# Ce qu'on a décidé de ne pas faire

Ces choix-là ont été pesés puis tranchés. Ils sont écrits ici pour ne pas être
reproposés à chaque version. Chacun se rouvre, mais sur un argument neuf.

- Le lecteur ne modifie, ne déplace et ne duplique aucun quart : ces gestes
  obligent l'application à deviner deux choses, quel quart et quelle
  destination. Il peut en revanche **annuler** un quart, parce qu'il n'y a
  qu'une seule chose à deviner, et parce que l'annulation arrive précisément
  quand les mains sont prises : au volant, au comptoir, au téléphone avec la
  pharmacie. Une exception à rouvrir plus tard : la duplication récurrente —
  « pareil tous les mardis d'octobre » — qui n'écrase rien puisqu'elle ne fait
  qu'ajouter.
- Pas de lecteur de commandes pour le répertoire. Une pharmacie se crée une
  fois, avec une adresse, un taux, des codes d'accès, et se corrige rarement.
  Dicter tout ça prendrait plus de temps que de le taper, et le lecteur devrait
  apprendre un vocabulaire entier pour un geste qu'on pose deux fois par année.
  La dictée d'un quart, elle, remplace un geste quotidien.
- Pas d'écran de dictée maison tant que l'application tourne sur Expo Go. La
  reconnaissance vocale native demande un module qui n'est pas dans Expo Go :
  il faudrait un *development build*, donc un ordinateur, un câble et une
  reconstruction à chaque essai. Le micro du clavier écrit déjà dans le champ,
  la phrase reste lisible et corrigeable avant d'être lue — ce qu'aucune
  commande vocale ne permet — et rien ne sort de l'appareil.
- Pas d'intelligence artificielle dans cette version, ni locale ni par API. Le
  lecteur de commandes est un lecteur à règles : gratuit, instantané, hors
  ligne, et on peut dire exactement pourquoi il a compris ce qu'il a compris.
  Une API ferait sortir de l'appareil une phrase qui contient un nom de
  pharmacie et un horaire de travail, et coûterait à chaque usage. Un modèle
  embarqué pèserait plus lourd que toute l'application pour ce qu'il ajouterait
  ici. La couture existe dans `src/lib/veille/ia.ts` ; ce qui y est branché,
  c'est `AUCUN_SERVICE`.
- Pas de navigateur dans l'application. Une facture s'ouvre dans Safari, qui
  sait imprimer, envoyer et archiver mieux que ce qu'on écrirait ici. Les
  sources de la veille peuvent s'ouvrir dans la feuille du système — c'est
  Safari aussi, présenté autrement, pas un navigateur à nous.
