# Le site

Les écrans et la logique de l'application « pharmacien remplaçant », dans un
navigateur. Bâti de zéro dans ce dossier : ce n'est pas un portage du code
React Native, et rien de l'application n'est touché. Elle continue de tourner
comme avant, sans le savoir.

C'est un prototype. Ni persistance durable, ni comptes, ni notifications : on
cherche à voir les écrans et à s'en servir.

## Démarrer

```
cd site
npm install
npm run dev
```

Puis `localhost:5173`. Avec `npm run dev -- --host`, l'adresse réseau permet de
l'ouvrir sur un téléphone du même réseau.

`npm test` lance le typage, le lint, puis les tests.

## Ce qui le compose

Vite, React et TypeScript. Trois dépendances, chacune pour une raison :

- `wouter`, un routeur léger pour les cinq onglets ;
- `recharts`, pour le graphique des statistiques ;
- `date-fns`, pour les dates.

Aucune bibliothèque de style ni de composants. Le CSS s'écrit à la main, à
partir de `src/styles/jetons.css`, et les icônes sont dessinées dans
`src/ui/Icone.tsx` : une vingtaine de traits ne justifient pas une quatrième
dépendance.

## Les jetons

Les mêmes que ceux de l'application (V2.6), parce que le site et l'application
doivent avoir l'air du même produit : les onze rôles typographiques des Human
Interface Guidelines, la pile de polices du système, l'échelle d'espacement
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40, quatre neutres nommés par leur rôle et
l'accent mauve.

`jetons.css` est le seul fichier où une couleur, une taille ou une dimension
s'écrit en valeur. `tests/jetons.test.ts` vérifie les jetons contre le tableau
des HIG et contre le fichier de jetons de l'application, puis refuse toute
valeur écrite en dur ailleurs.

Le contenu ne dépasse pas 700 pixels de large. Sous 700 pixels de fenêtre, la
page devient celle d'un téléphone : une colonne, la barre d'onglets en bas.

## Ce que le site ne fait pas

- **Aucune notification.** Une page web ne se réveille pas toute seule. Le
  rendez-vous du soir, le rappel de quart et la relance de facture n'existent
  pas ici.
- **Aucune dictée.** Le lecteur de commandes est du texte et pourrait
  fonctionner, mais le micro qui remplit le champ est celui du clavier d'iOS.
- **Aucune impression de facture en PDF.**
- **Aucune carte géographique.**

Ces quatre absences ne sont pas des choses à corriger plus tard. Ce sont les
raisons pour lesquelles l'application existe.
