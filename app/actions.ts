"use server";

import { revalidatePath } from "next/cache";
import { gradeCard } from "@/lib/queries";
import type { Confidence } from "@/lib/sm2";

export async function submitReview(cardId: number, confidence: Confidence) {
  gradeCard(cardId, confidence);
  revalidatePath("/");
}
