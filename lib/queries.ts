import { getDb } from "./db";
import { schedule, toDateString, type Confidence } from "./sm2";

export interface DeckSummary {
  id: number;
  name: string;
  totalCards: number;
  dueCards: number;
  newCards: number;
}

export interface DueCard {
  id: number;
  question: string;
  answer: string;
  totalReviews: number;
}

export function today(): string {
  return toDateString(new Date());
}

export function listDecks(): DeckSummary[] {
  return getDb()
    .prepare(
      `SELECT
         d.id AS id,
         d.name AS name,
         COUNT(c.id) AS totalCards,
         COALESCE(SUM(c.next_review_at <= ?), 0) AS dueCards,
         COALESCE(SUM(c.total_reviews = 0), 0) AS newCards
       FROM decks d
       LEFT JOIN cards c ON c.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.name`,
    )
    .all(today()) as DeckSummary[];
}

export function getDeck(deckId: number): { id: number; name: string } | undefined {
  return getDb()
    .prepare(`SELECT id, name FROM decks WHERE id = ?`)
    .get(deckId) as { id: number; name: string } | undefined;
}

export function getDueCards(deckId: number): DueCard[] {
  return getDb()
    .prepare(
      `SELECT id, question, answer, total_reviews AS totalReviews
       FROM cards
       WHERE deck_id = ? AND next_review_at <= ?
       ORDER BY next_review_at, id`,
    )
    .all(deckId, today()) as DueCard[];
}

interface CardRow {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export function gradeCard(cardId: number, confidence: Confidence): void {
  const db = getDb();

  db.transaction(() => {
    const card = db
      .prepare(
        `SELECT ease_factor, interval_days, repetitions FROM cards WHERE id = ?`,
      )
      .get(cardId) as CardRow | undefined;

    if (!card) throw new Error(`Carte ${cardId} introuvable`);

    const next = schedule(
      {
        easeFactor: card.ease_factor,
        intervalDays: card.interval_days,
        repetitions: card.repetitions,
      },
      confidence,
    );

    db.prepare(
      `UPDATE cards SET
         ease_factor = ?,
         interval_days = ?,
         repetitions = ?,
         last_confidence = ?,
         last_reviewed_at = datetime('now'),
         next_review_at = ?,
         total_reviews = total_reviews + 1
       WHERE id = ?`,
    ).run(
      next.easeFactor,
      next.intervalDays,
      next.repetitions,
      confidence,
      next.nextReviewAt,
      cardId,
    );

    db.prepare(
      `INSERT INTO review_history (card_id, confidence, interval_after)
       VALUES (?, ?, ?)`,
    ).run(cardId, confidence, next.intervalDays);
  })();
}
