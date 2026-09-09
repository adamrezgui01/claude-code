"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { submitReview } from "@/app/actions";
import { CONFIDENCE_LABELS, type Confidence } from "@/lib/sm2";
import type { DueCard } from "@/lib/queries";

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  1: "#e03131",
  2: "#e8590c",
  3: "#f08c00",
  4: "#66a80f",
  5: "#2f9e44",
};

const SCORES: Confidence[] = [1, 2, 3, 4, 5];

export default function Session({
  deckName,
  cards,
}: {
  deckName: string;
  cards: DueCard[];
}) {
  const [queue, setQueue] = useState(cards);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [pending, startTransition] = useTransition();

  const current = queue[0];

  const rate = useCallback(
    (confidence: Confidence) => {
      if (!current || pending) return;
      startTransition(async () => {
        await submitReview(current.id, confidence);
        setQueue((rest) =>
          confidence < 3
            ? [...rest.slice(1), rest[0]]
            : rest.slice(1),
        );
        setAnswered((count) => count + 1);
        setRevealed(false);
      });
    },
    [current, pending],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!current) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const score = Number(event.key);
        if (score >= 1 && score <= 5) rate(score as Confidence);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, revealed, rate]);

  if (!current) {
    return (
      <div className="session-done">
        <h2>Session terminée</h2>
        <p>
          {answered} révision{answered > 1 ? "s" : ""} dans « {deckName} ».
        </p>
        <Link className="button" href="/">
          Retour aux decks
        </Link>
      </div>
    );
  }

  const remaining = queue.length;
  const progress = (answered / (answered + remaining)) * 100;

  return (
    <>
      <div className="session-header">
        <span>{deckName}</span>
        <span>
          {remaining} restante{remaining > 1 ? "s" : ""}
        </span>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card" onClick={() => !revealed && setRevealed(true)}>
        <div>
          <p className="card-label">Question</p>
          <p className="card-question">{current.question}</p>
        </div>

        {revealed && (
          <>
            <hr className="card-divider" />
            <div>
              <p className="card-label">Réponse</p>
              <p className="card-answer">{current.answer}</p>
            </div>
          </>
        )}

        {!revealed && (
          <p className="card-hint">Cliquez ou appuyez sur Espace pour retourner</p>
        )}
      </div>

      {revealed ? (
        <div className="rating">
          <p className="rating-prompt">
            Votre niveau de confiance sur cette carte ?
          </p>
          <div className="rating-buttons">
            {SCORES.map((score) => (
              <button
                key={score}
                className="rating-button"
                style={
                  {
                    "--score-color": CONFIDENCE_COLORS[score],
                  } as React.CSSProperties
                }
                onClick={() => rate(score)}
                disabled={pending}
              >
                <span className="rating-score">{score}</span>
                <span className="rating-label">{CONFIDENCE_LABELS[score]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          className="button flip-button"
          onClick={() => setRevealed(true)}
        >
          Voir la réponse
        </button>
      )}
    </>
  );
}
