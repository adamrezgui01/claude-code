export type Confidence = 1 | 2 | 3 | 4 | 5;

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  1: "Aucune idée",
  2: "Difficile",
  3: "Hésitant",
  4: "Bien su",
  5: "Parfaitement su",
};

export interface CardState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Schedule extends CardState {
  nextReviewAt: string;
}

const MIN_EASE_FACTOR = 1.3;
const PASSING_CONFIDENCE = 3;

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function nextEaseFactor(easeFactor: number, confidence: Confidence): number {
  const gap = 5 - confidence;
  const adjusted = easeFactor + (0.1 - gap * (0.08 + gap * 0.02));
  return Math.max(MIN_EASE_FACTOR, Number(adjusted.toFixed(4)));
}

function nextInterval(
  state: CardState,
  easeFactor: number,
  confidence: Confidence,
): number {
  // Note < 3 : la carte revient dans la même session plutôt que le lendemain.
  if (confidence < PASSING_CONFIDENCE) return 0;
  if (state.repetitions === 0) return 1;
  if (state.repetitions === 1) return 6;
  return Math.max(state.intervalDays + 1, Math.round(state.intervalDays * easeFactor));
}

export function schedule(
  state: CardState,
  confidence: Confidence,
  today: Date = new Date(),
): Schedule {
  const easeFactor = nextEaseFactor(state.easeFactor, confidence);
  const intervalDays = nextInterval(state, easeFactor, confidence);
  const repetitions =
    confidence < PASSING_CONFIDENCE ? 0 : state.repetitions + 1;

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: toDateString(addDays(today, intervalDays)),
  };
}
