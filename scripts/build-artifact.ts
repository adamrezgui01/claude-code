/**
 * Génère la version web autonome (build/flashcards.html) à partir de content/*.json.
 *
 * Les identifiants de carte sont les mêmes clés de contenu que dans SQLite, donc
 * la progression enregistrée survit à l'ajout de nouvelles cartes.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface DeckFile {
  deck: string;
  cards: { question: string; answer: string }[];
}

const CONTENT_DIR = path.join(process.cwd(), "content");
const TEMPLATE = path.join(process.cwd(), "scripts", "artifact-template.html");
const OUTPUT = path.join(process.cwd(), "build", "flashcards.html");

function contentKey(question: string): string {
  const normalized = question.trim().replace(/\s+/g, " ").toLowerCase();
  return crypto.createHash("sha1").update(normalized).digest("hex");
}

const decks = fs
  .readdirSync(CONTENT_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => {
    const data = JSON.parse(
      fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"),
    ) as DeckFile;

    return {
      id: file.replace(/\.json$/, ""),
      name: data.deck,
      cards: data.cards.map((card) => ({
        id: contentKey(card.question),
        q: card.question,
        a: card.answer,
      })),
    };
  });

const html = fs
  .readFileSync(TEMPLATE, "utf8")
  .replace("/*__DECKS__*/ []", JSON.stringify(decks));

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, html);

const total = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
console.log(
  `${OUTPUT} : ${decks.length} deck(s), ${total} cartes, ${(html.length / 1024).toFixed(0)} Ko`,
);
