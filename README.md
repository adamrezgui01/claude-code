# Flashcards

Application locale de révision par répétition espacée (algorithme SM-2), avec base SQLite.

## Démarrer

```bash
npm install
npm run add-cards   # importe content/*.json dans la base
npm run dev         # http://localhost:3000
```

La base est créée automatiquement dans `data/flashcards.db`.

## Utilisation

- **Vue decks** (`/`) : liste des decks avec le nombre de cartes dues aujourd'hui.
- **Session de révision** : une carte à la fois. Clic ou barre d'espace pour retourner la carte, puis notation de 1 à 5 (touches 1-5 au clavier).

Une note inférieure à 3 remet la carte en fin de file de la session en cours. Une note de 3 ou plus programme la carte selon SM-2 : 1 jour, puis 6 jours, puis intervalle × facteur de facilité.

## Version web (téléphone)

`npm run build-web` génère `build/flashcards.html`, une page autonome contenant les mêmes cartes et le même algorithme, publiée comme artefact Claude et consultable au téléphone. La progression y est enregistrée dans la base de l'artefact, avec copie locale dans le navigateur.

Les identifiants de carte sont les mêmes des deux côtés (hash de la question), mais les deux progressions sont distinctes : la version locale suit ses propres révisions, la version web les siennes.

## Ajouter des cartes

Le contenu des cartes vit dans `content/*.json` :

```json
{
  "deck": "Nom du deck",
  "cards": [{ "question": "...", "answer": "..." }]
}
```

`npm run add-cards` importe ces fichiers dans la base. L'import est idempotent :

- une carte absente de la base est ajoutée, due immédiatement ;
- une carte déjà présente (même question) conserve son historique et son planning — seul le texte est rafraîchi si vous l'avez corrigé ;
- ajouter des cartes à un deck existant ne touche à aucune carte déjà présente.

Le fichier `data/flashcards.db` n'est pas versionné : il contient votre progression, propre à votre machine. Le contenu des cartes, lui, est versionné dans `content/`.

## Structure

```
app/
  page.tsx                          Vue decks
  actions.ts                        Server action de notation
  decks/[deckId]/review/            Session de révision
lib/
  db.ts                             Connexion SQLite + schéma
  sm2.ts                            Algorithme de répétition espacée
  queries.ts                        Requêtes
scripts/add-cards.ts                Import de content/*.json
content/                            Cartes (versionnées)
data/flashcards.db                  Base locale (non versionnée)
```

## Schéma

- `decks` : id, name, created_at
- `cards` : id, deck_id, content_key, question, answer, ease_factor, interval_days, repetitions, last_confidence, last_reviewed_at, next_review_at, total_reviews, created_at
- `review_history` : une ligne par révision (card_id, confidence, reviewed_at, interval_after)
