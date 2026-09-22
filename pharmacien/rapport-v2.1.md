# V2.1 — le volet clinique, phase 1

Ce rapport est écrit pour être lu sans rien connaître au code.

---

## 1. Les tests

**457 tests, 457 passent.** Aucun en échec, aucun contesté.

165 sont nouveaux et portent sur le volet clinique :

| Tests | Ce qu'ils tiennent |
|---|---|
| 31 | La péremption : le décalage de mois, les limites de 6 et 12 mois, ce qui bascule quand une source change de version |
| 17 | Les garde-fous de l'IA : ce qu'on envoie, ce qu'on accepte de recevoir |
| 17 | La notification : à quelle heure elle part, quels sujets elle nomme |
| 16 | Les sujets : les noms traduits ou non, la recherche bilingue, les doublons |
| 14 | La file du jour : le plafond, les sujets en pause |
| 13 | La répétition espacée : les huit cas de l'échelle, et les cas limites |
| 12 | Le bandeau de capture : la fenêtre de trente minutes, une seule proposition |
| 11 | Le stockage : l'expiration qui touche plusieurs tables d'un coup |
| 9 | Les données de départ : douze sujets, huit sources |
| 9 | Le tableau de bord, qui donne le même chiffre que la notification |
| 9 | La question posée en révision, et l'absence de tout score |
| 5 | L'architecture : les deux volets restent démêlables |
| 2 | La base ne contient aucun `DROP TABLE` |

Tous ont été écrits avant le code et vus en échec. Les valeurs attendues des
dates ont été calculées à la main, puis vérifiées au calendrier avant d'écrire
la moindre ligne d'algorithme.

---

## 2. Les commits

| | |
|---|---|
| `2e3c4b0` | Étape 0 — la base ne se remet plus jamais à zéro |
| `dc75428` | Étape 1 — migration et données de départ |
| `ef57363` | Étape 2 — répétition espacée et file du jour |
| `5fec19b` | Étape 3 — péremption des sources et des contenus |
| `0fbb43d` | Étape 4 — sujets et capture |
| `465827d` | Étape 5 — le stockage du volet clinique |
| `90a08a9` | Étape 6 — l'écran de veille et l'entrée de menu |
| `8fa9b89` | Étape 7 — suivre un sujet, écrire une note |
| `46f3d15` | Étape 8 — la séance de révision |
| `6fc1a59` | Étape 9 — navigateur et bandeau de capture |
| `00b7d98` | Étape 10 — vérification des sources et expiration à l'écran |
| `554601a` | Étape 11 — la notification quotidienne et ses réglages |
| `2c469c8` | Étape 12 — traductions, et les garde-fous de la phase 2 |

---

## 3. Les écarts, et pourquoi

Sept, du plus important au plus petit.

### 3.1 Une des huit sources n'a aucun sujet

**Ce que ma proposition disait.** « Les huit signets fournis ont tous au moins
un sujet, une organisation et un type. »

**Ce que j'ai fait.** Sept sur huit. La base de données des produits
pharmaceutiques n'en a aucun.

**Pourquoi.** C'est une référence qu'on ouvre pour un DIN ou une monographie,
pas pour apprendre quelque chose sur une maladie. Aucun des douze sujets ne
lui va. Lui en coller un au hasard pour que la liste soit pleine rendrait la
veille bavarde et fausse dès le premier jour : chaque consultation aurait
proposé de suivre un sujet qui n'a rien à voir.

Le test dit maintenant « sept sur huit », et il nomme le huitième pour que
personne ne croie à un oubli.

### 3.2 Les quatre fonctions gardent leur nom français

**Ce que le prompt V2 demandait.** `checkSource()`, `sourceChanged()`,
`markSourceAsUpdated()`, `invalidateDependentContent()`.

**Ce que j'ai fait.** `etatSource()`, `sourceAChange()`,
`marquerSourceMiseAJour()`, `contenusAPerimer()`.

**Pourquoi.** Tout le code de cette application est en français — les
variables, les fonctions, les commentaires. Quatre noms anglais au milieu se
lisent comme une greffe. La correspondance est écrite en tête du module, donc
rien n'est perdu ; si vous préférez les noms d'origine, le changement est
mécanique.

### 3.3 Le test d'architecture a quatre exceptions, pas deux

**Ce que le prompt annonçait.** Le menu et la reprogrammation des
notifications.

**Ce qu'il a fallu.** Quatre exceptions et deux fichiers de frontière :

| Fichier | Pourquoi |
|---|---|
| L'entrée du menu | Elle doit bien pointer quelque part |
| La reprogrammation des notifications | Celle de la veille doit se refaire comme les autres au changement de langue |
| Le fichier de démarrage | Il assemble toute l'application par nature, sème les données au premier lancement et pose le bandeau |
| L'écran des réglages | Il porte par construction les réglages de tous les modules ; quelqu'un qui cherche « rappel » va là |
| Les deux écrans de signets | Ce n'est pas une exception mais une frontière : « Liens et infos utiles » **est** la liste des sources du volet clinique, comme le prompt V2 le disait lui-même |

Les quatre exceptions sont des fichiers de charpente. **Aucune fonction du
volet organisation** — un horaire, une facture, une statistique — n'en fait
partie, et c'est exactement ce que la règle protégeait. Un test le vérifie :
il échoue si un fichier dont le nom contient « quart », « facture » ou
« statistiques » se glisse dans la liste.

### 3.4 Le regroupement des notifications a une condition de plus

**Ce que le prompt disait.** Si une autre notification est programmée entre
17 h et 22 h, la veille part à la même heure.

**Ce que j'ai ajouté.** Le regroupement ne s'applique que si **l'heure choisie
est elle-même dans la plage du soir**.

**Pourquoi.** Quelqu'un qui règle son rappel à 8 h le veut le matin. L'avancer
à 19 h parce qu'un mémo de quart y tombe serait défaire son choix sans le lui
dire. Un test couvre ce cas.

### 3.5 Le même fil de notifications n'est pas implémenté

**Ce que le prompt disait.** « Place-les dans le même fil de notifications si
le système le permet. »

**Ce que j'ai fait.** Rien de particulier.

**Pourquoi.** iOS regroupe déjà, par défaut, toutes les notifications d'une
même application dans la même pile. Le mécanisme de fil sert à faire des
sous-groupes **à l'intérieur** d'une application ; l'utiliser pour la veille
seule l'aurait au contraire séparée des rappels de quart. Les deux arrivent
donc à la même minute et dans le même bloc, ce qui est la substance de la
demande — mais c'est le comportement par défaut d'iOS, pas quelque chose que
j'ai écrit, et **je n'ai pas pu le vérifier sur un appareil**.

### 3.6 Le démarrage ne purge plus le trousseau

Une conséquence de l'étape 0. `initialiserBase` ne rend plus la liste des
pharmacies effacées, puisqu'il n'en efface plus. L'écran de démarrage ne
purge donc plus les codes d'accès au lancement.

C'est voulu : cette purge n'existait que pour nettoyer après la remise à zéro.
La suppression d'une pharmacie retire toujours ses secrets, par le chemin
normal.

### 3.7 La notification des jours suivants suppose que rien ne bouge

Les sept jours sont programmés d'avance en supposant qu'aucune révision n'aura
lieu entre-temps. Le chiffre de demain est donc un maximum.

C'est corrigé en continu : tout est recalculé à chaque retour de l'application
au premier plan et après chaque séance. Le seul cas où l'écart survit est
celui où vous révisez et ne rouvrez plus l'application du tout — auquel cas la
notification du lendemain annonce plus qu'il n'en reste. L'inverse, annoncer
trop peu, n'arrive jamais.

---

## 4. Ce que les tests ne couvrent pas

### Rien de ce qui touche au système du téléphone

- **Les notifications.** Aucun test ne vérifie qu'une notification part, ni à
  quelle heure elle arrive. Les tests portent sur la décision — faut-il
  notifier, à quelle heure, avec quel texte — pas sur l'envoi.
- **La lecture des notifications déjà en file.** Le regroupement lit ce que le
  système a en attente. Cette lecture n'est pas testée, et elle échoue en
  silence dans Expo Go : sans elle, la veille part simplement à l'heure
  choisie.
- **Le retour de l'application au premier plan.** Le déclencheur du bandeau
  n'est pas testé ; la règle qui décide de l'afficher l'est entièrement.
- **Le navigateur.** Ni l'ouverture intégrée, ni le repli sur le navigateur du
  téléphone.

### La base de données

Les migrations ne tournent pas dans les tests. Ce qui est vérifié : qu'aucun
fichier ne contient `DROP TABLE`, que les données de départ se tiennent, et
que l'expiration écrit ce qu'il faut sur un carnet en mémoire. Ce qui ne l'est
pas : que l'ajout des colonnes se passe bien sur une base existante.

### L'apparence

Rien ne vérifie qu'un texte anglais plus long ne déborde pas, ni que l'écran
de veille reste lisible avec quarante sujets.

### La qualité de l'anglais

Les 696 textes existent dans les deux langues et portent les mêmes valeurs à
insérer. Personne n'a relu l'anglais. 197 sont marqués d'un astérisque dans
`traductions-a-relire.md`.

### Le service d'IA

Il n'existe pas. Ce qui est testé, ce sont les deux règles qui l'encadreront :
ce qu'on lui enverra, et ce qu'on acceptera de lui. Le filtre sur les mesures
est une heuristique, et le test le dit en toutes lettres : un programme ne
peut pas savoir si une posologie est inventée.

---

## 5. À vérifier sur le téléphone

### Ce qui ne peut pas se vérifier dans Expo Go

**Les notifications locales ne fonctionnent pas de façon fiable dans Expo Go
depuis le SDK 53.** Tout ce qui suit sur les notifications demande une
version compilée de l'application — un *development build*. Dans Expo Go, le
code ne plante pas : il échoue en silence, et rien n'arrive.

La lecture des notifications déjà en file, donc le regroupement à 19 h, est
dans le même cas.

### Le reste, vérifiable dans Expo Go

**Premier lancement**
- Menu → « Ma veille clinique » doit apparaître, avec sa phrase d'explication.
- Liens et infos utiles → ouvrez un signet fourni, revenez dans l'application :
  le bandeau « Ce que tu retiens ? » doit apparaître en bas.
- Fermez le bandeau, ressortez et rentrez : il ne doit **pas** revenir.

**Les sujets**
- « Suivre un sujet », tapez « uti » : « Infections urinaires » doit sortir.
- Tapez « bronchite », créez-le, puis retapez « Bronchite » : aucun doublon ne
  doit être proposé.
- Passez l'application en anglais : « Infections urinaires » devient « Urinary
  tract infections », « Bronchite » reste « Bronchite ».

**Les notes**
- Écrivez une note depuis le bandeau : la source et ses sujets doivent être
  déjà remplis, et la version de la source affichée en dessous.
- Le texte gris du champ doit dire « Pas de renseignements sur un patient. »
- Touchez le micro du clavier : la dictée doit écrire dans le champ.

**La révision**
- Une note écrite aujourd'hui revient dans deux jours. Pour l'essayer tout de
  suite, écrivez-en une, puis avancez la date du téléphone de deux jours.
- « Commencer » → la question, « Révéler », puis les trois boutons.
- À la fin : « Terminé pour aujourd'hui. » **Vérifiez qu'aucun score
  n'apparaît nulle part** — ni pourcentage, ni « 7 sur 10 », ni série de jours.

**L'expiration**
- Liens et infos utiles → un signet → mettez-lui la version « 2024 ».
- Écrivez une note rattachée à ce signet.
- Revenez au signet, changez la version pour « 2026 ».
- Veille → « À revérifier » : la note doit y être, avec « La source est passée
  à 2026 ». « Toujours valide » doit la ramener dans les révisions.

**Les réglages**
- Paramètres → « Veille clinique » : les cinq réglages doivent être là.
- Coupez « Proposer d'écrire une note » : plus aucun bandeau, pour aucun lien.
- Activez « Ouvrir les liens dans l'application » et ouvrez le PIQ : jugez
  vous-même si le PDF est plus ou moins pratique ainsi. C'est exactement la
  raison pour laquelle ce réglage existe, et il est à « non » par défaut.

**Avec une version compilée, pour les notifications**
- Réglez l'heure à deux minutes plus tard, écrivez une note due aujourd'hui :
  la notification doit arriver et nommer le sujet.
- Ajoutez un quart qui se termine deux heures avant l'heure réglée : la
  notification de veille doit partir en même temps que le mémo de fin de
  quart, pas une heure après.
- Passez en anglais, attendez la suivante : elle doit arriver en anglais.

---

## 6. Ce qui reste ouvert

Trois choses que vous seul pouvez trancher, une fois l'application en main.

1. **Le fil de notifications** (écart 3.5). Si les deux notifications du soir
   n'apparaissent pas groupées sur votre téléphone, dites-le-moi : il y a une
   solution, mais elle demande de toucher au code des rappels de quart.
2. **Le niveau de départ.** Une note revient deux jours après son écriture.
   Si c'est trop court à l'usage, c'est une constante et un test à changer.
3. **La liste des douze sujets.** Elle s'enrichit toute seule, mais si vous
   voyez beaucoup de santé mentale ou de dermatologie au comptoir, autant les
   semer dès le départ plutôt que de les créer à la main.
