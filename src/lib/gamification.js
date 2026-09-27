import { useEffect, useState } from "react";
import { UserProgress } from "@/entities/UserProgress";

// Recompensas de XP por atividade
export const XP_REWARDS = {
  flashcard: 5,
  correctAnswer: 10,
  gameComplete: 30,
  categoryComplete: 50,
};

// Limiares de XP por nível
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1850, 2500, 3250, 4100];

export function getLevelInfo(xp = 0) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const currentBase = LEVEL_THRESHOLDS[level - 1];
  const nextBase = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
  const xpForNext = nextBase === null ? 0 : nextBase - currentBase;
  const xpInLevel = xp - currentBase;
  return {
    level,
    currentBase,
    nextBase,
    xpInLevel,
    xpForNext,
    progress: nextBase === null ? 100 : Math.min(100, Math.round((xpInLevel / xpForNext) * 100)),
  };
}

export const ACHIEVEMENTS = [
  { key: "first_flashcard", title: "Primeiro passo", description: "Complete o primeiro flashcard.", icon: "Award" },
  { key: "first_category", title: "Primeira categoria", description: "Complete uma categoria.", icon: "Layers" },
  { key: "words_100", title: "100 palavras", description: "Estude 100 palavras.", icon: "BookOpen" },
  { key: "first_game", title: "Primeiro jogo", description: "Complete seu primeiro jogo.", icon: "Gamepad2" },
  { key: "vocab_master", title: "Mestre do vocabulário", description: "Alcance 500 XP.", icon: "Trophy" },
  { key: "streak_7", title: "7 dias", description: "Estude 7 dias seguidos.", icon: "Flame" },
];

export function evaluateAchievements(p = {}) {
  const unlocked = new Set(p.achievements || []);
  if ((p.flashcards_studied || 0) >= 1) unlocked.add("first_flashcard");
  if ((p.categories_completed || 0) >= 1) unlocked.add("first_category");
  if ((p.flashcards_studied || 0) >= 100) unlocked.add("words_100");
  if ((p.games_played || 0) >= 1) unlocked.add("first_game");
  if ((p.xp || 0) >= 500) unlocked.add("vocab_master");
  if ((p.longest_streak || 0) >= 7) unlocked.add("streak_7");
  return Array.from(unlocked);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function getProgress() {
  const list = await UserProgress.list("-created_date", 1);
  return list[0] || null;
}

export async function ensureProgress() {
  const existing = await getProgress();
  if (existing) return existing;
  return await UserProgress.create({
    xp: 0,
    level: 1,
    streak: 0,
    longest_streak: 0,
    achievements: [],
    completed_categories: [],
  });
}

// Atualiza o progresso do usuário: XP, contadores, sequência e conquistas.
export async function recordProgress({
  xp = 0,
  flashcards = 0,
  games = 0,
  categoryComplete = null,
  correct = 0,
  total = 0,
} = {}) {
  const p = await ensureProgress();
  const today = todayStr();

  let streak = p.streak || 0;
  let longest = p.longest_streak || 0;
  if (p.last_activity_date !== today) {
    streak = p.last_activity_date === yesterdayStr() ? streak + 1 : 1;
    if (streak > longest) longest = streak;
  }

  const completed = new Set(p.completed_categories || []);
  if (categoryComplete) completed.add(categoryComplete);

  const next = {
    xp: (p.xp || 0) + xp,
    flashcards_studied: (p.flashcards_studied || 0) + flashcards,
    games_played: (p.games_played || 0) + games,
    correct_answers: (p.correct_answers || 0) + correct,
    total_answers: (p.total_answers || 0) + total,
    streak,
    longest_streak: longest,
    last_activity_date: today,
    completed_categories: Array.from(completed),
    categories_completed: completed.size,
  };
  next.level = getLevelInfo(next.xp).level;
  next.achievements = evaluateAchievements(next);

  return await UserProgress.update(p.id, next);
}

// Hook para consumir o progresso de gamificação
export function useProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setProgress(await getProgress());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  return { progress, loading, reload: load };
}