/**
 * Importe les fichiers de content/*.json dans la base SQLite.
 *
 * Idempotent : une carte déjà présente (même question) garde son historique et
 * son planning de révision. Seul le texte question/réponse est rafraîchi.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../lib/db";
import { toDateString } from "../lib/sm2";

interface CardInput {
  question: string;
  answer: string;
}

interface DeckFile {
  deck: string;
  cards: CardInput[];
}

const CONTENT_DIR = path.join(process.cwd(), "content");

function contentKey(question: string): string {
  const normalized = question.trim().replace(/\s+/g, " ").toLowerCase();
  return crypto.createHash("sha1").update(normalized).digest("hex");
}

function readDeckFiles(): { file: string; data: DeckFile }[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      file,
      data: JSON.parse(
        fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"),
      ) as DeckFile,
    }));
}

function main() {
  const db = getDb();
  const files = readDeckFiles();

  if (files.length === 0) {
    console.log(`Aucun fichier .json dans ${CONTENT_DIR}`);
    return;
  }

  const findDeck = db.prepare(`SELECT id FROM decks WHERE name = ?`);
  const insertDeck = db.prepare(`INSERT INTO decks (name) VALUES (?)`);
  const findCard = db.prepare(
    `SELECT id, question, answer FROM cards WHERE deck_id = ? AND content_key = ?`,
  );
  const insertCard = db.prepare(
    `INSERT INTO cards (deck_id, content_key, question, answer, next_review_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const updateCard = db.prepare(
    `UPDATE cards SET question = ?, answer = ? WHERE id = ?`,
  );

  const today = toDateString(new Date());

  for (const { file, data } of files) {
    if (!data.deck || !Array.isArray(data.cards)) {
      console.error(`${file} : format invalide (attendu { deck, cards[] })`);
      continue;
    }

    const deckId = db.transaction(() => {
      const existing = findDeck.get(data.deck) as { id: number } | undefined;
      return existing?.id ?? Number(insertDeck.run(data.deck).lastInsertRowid);
    })();

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    db.transaction(() => {
      for (const card of data.cards) {
        const key = contentKey(card.question);
        const existing = findCard.get(deckId, key) as
          | { id: number; question: string; answer: string }
          | undefined;

        if (!existing) {
          insertCard.run(deckId, key, card.question, card.answer, today);
          added++;
        } else if (
          existing.question !== card.question ||
          existing.answer !== card.answer
        ) {
          updateCard.run(card.question, card.answer, existing.id);
          updated++;
        } else {
          unchanged++;
        }
      }
    })();

    console.log(
      `${data.deck} : ${added} ajoutée(s), ${updated} mise(s) à jour, ${unchanged} inchangée(s)`,
    );
  }
}

main();
