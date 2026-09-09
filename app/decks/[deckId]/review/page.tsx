import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getDueCards } from "@/lib/queries";
import Session from "./session";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const deck = getDeck(Number(deckId));
  if (!deck) notFound();

  const cards = getDueCards(deck.id);

  return (
    <>
      <Link className="back-link" href="/">
        ← Tous les decks
      </Link>

      {cards.length === 0 ? (
        <div className="empty-state">
          Aucune carte due dans « {deck.name} ». Revenez plus tard.
        </div>
      ) : (
        <Session deckName={deck.name} cards={cards} />
      )}
    </>
  );
}
