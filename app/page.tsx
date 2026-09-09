import Link from "next/link";
import { listDecks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const decks = listDecks();
  const totalDue = decks.reduce((sum, deck) => sum + deck.dueCards, 0);

  return (
    <>
      <h1>Flashcards</h1>
      <p className="subtitle">
        {totalDue > 0
          ? `${totalDue} carte${totalDue > 1 ? "s" : ""} à réviser aujourd'hui`
          : "Rien à réviser aujourd'hui"}
      </p>

      {decks.length === 0 ? (
        <div className="empty-state">
          Aucun deck. Ajoutez du contenu dans <code>content/</code> puis lancez{" "}
          <code>npm run add-cards</code>.
        </div>
      ) : (
        <ul className="deck-list">
          {decks.map((deck) => (
            <li key={deck.id} className="deck">
              <div>
                <p className="deck-name">{deck.name}</p>
                <p className="deck-meta">
                  {deck.totalCards} carte{deck.totalCards > 1 ? "s" : ""}
                  {deck.newCards > 0 && ` · ${deck.newCards} jamais révisée${deck.newCards > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="deck-action">
                <span
                  className={deck.dueCards > 0 ? "due-badge" : "due-badge empty"}
                >
                  {deck.dueCards}
                </span>
                {deck.dueCards > 0 && (
                  <Link className="button" href={`/decks/${deck.id}/review`}>
                    Réviser
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
