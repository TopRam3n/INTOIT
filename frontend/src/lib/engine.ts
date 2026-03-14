import type { LearnerProfile, EngagementEvent, ReelCard, Topic, KnowledgeState } from '../types';
import { ALL_TOPICS, GRAPH_NODES, COURSES } from '../data/courses';

// ── BKT ────────────────────────────────────────────────
export function bktUpdate(pKnow: number, correct: boolean): number {
  const pL = 0.3, pG = 0.2, pS = 0.1;
  const post = correct
    ? ((1 - pS) * pKnow) / ((1 - pS) * pKnow + pG * (1 - pKnow))
    : (pS * pKnow) / (pS * pKnow + (1 - pG) * (1 - pKnow));
  return Math.min(1, Math.max(0, post + (1 - post) * pL));
}

// ── Adaptive difficulty ────────────────────────────────
export function getAdaptiveDifficulty(k: KnowledgeState): 'easy' | 'normal' | 'hard' {
  if (k.consecutiveCorrect >= 3) return 'hard';
  if (k.consecutiveWrong >= 2) return 'easy';
  return 'normal';
}

// ── Satisfaction predictor ─────────────────────────────
function difficultyMatch(pKnow: number, diff: number) {
  return Math.max(0, 1 - Math.abs(diff - (pKnow + 0.15)) * 2);
}

export function predictSatisfaction(args: {
  completionRate: number; quizScore: number; timeOnTask: number;
  retryCount: number; difficultyMatch: number; knowledgeGain: number;
}): number {
  return Math.min(1, Math.max(0,
    0.30 * args.completionRate + 0.25 * args.quizScore +
    0.15 * args.difficultyMatch + 0.15 * args.knowledgeGain +
    0.10 * Math.min(args.timeOnTask / 300, 1) +
    0.05 * (1 - Math.min(args.retryCount / 3, 1))
  ));
}

export function predictForTopic(profile: LearnerProfile, topicId: string, difficulty: number): number {
  const pKnow = profile.knowledge[topicId]?.pKnow ?? 0.1;
  return predictSatisfaction({
    completionRate: 0.85, quizScore: pKnow, timeOnTask: 150,
    retryCount: profile.struggles[topicId] ?? 0,
    difficultyMatch: difficultyMatch(pKnow, difficulty),
    knowledgeGain: 0.15,
  });
}

// ── Prerequisite gate ──────────────────────────────────
export function isUnlocked(topicId: string, knowledge: LearnerProfile['knowledge']): boolean {
  const node = GRAPH_NODES.find(n => n.id === topicId);
  if (!node) return true;
  return node.prerequisites.every(p => (knowledge[p]?.pKnow ?? 0) >= 0.5);
}

// ── Feed scoring ───────────────────────────────────────
export function computeFeedScores(profile: LearnerProfile): Record<string, number> {
  const scores: Record<string, number> = {};
  const recent = profile.events.slice(-30);
  ALL_TOPICS.forEach(topic => {
    const k = profile.knowledge[topic.id];
    const pKnow = k?.pKnow ?? 0.1;
    const hoursAgo = (Date.now() - (k?.lastSeen ?? 0)) / 3_600_000;
    const recency = Math.min(1, hoursAgo / 24);
    const topicEvents = recent.filter(e => e.topicId === topic.id);
    const struggleBoost = topicEvents.filter(e => e.action === 'incorrect').length > topicEvents.filter(e => e.action === 'correct').length ? 1.4 : 1.0;
    const unlockMult = isUnlocked(topic.id, profile.knowledge) ? 1 : 0.05;
    const zpd = Math.max(0, 1 - Math.abs(topic.difficulty - (pKnow + 0.15)) * 2);
    scores[topic.id] = Math.max(0, (1 - pKnow) * recency * struggleBoost * unlockMult * zpd);
  });
  return scores;
}

// ── YouTube fallbacks ──────────────────────────────────
const YT: Record<string, { id: string; title: string; channel: string }[]> = {
  alg_vars:        [{ id: 'fHyVCIyXBwg', title: 'What are Variables?', channel: 'Math Antics' }],
  alg_linear:      [{ id: 'Qyd_v3DGzTM', title: 'Solving Linear Equations', channel: 'Khan Academy' }],
  alg_quad:        [{ id: 'MHKJ9-UGS0c', title: 'Quadratic Formula', channel: 'Professor Leonard' }],
  alg_functions:   [{ id: 'kvGsIo1TmsM', title: 'Functions & Graphs', channel: 'Khan Academy' }],
  calc_limits:     [{ id: 'riXcZT2ICjA', title: 'Limits Explained', channel: '3Blue1Brown' }],
  calc_deriv:      [{ id: '9vKqVkMQHKk', title: 'Derivatives', channel: '3Blue1Brown' }],
  calc_integ:      [{ id: 'rfG8ce4nNh0', title: 'Integrals', channel: '3Blue1Brown' }],
  stat_desc:       [{ id: 'GvftKv9iqf8', title: 'Mean Median Mode', channel: 'Math Antics' }],
  stat_prob:       [{ id: 'KzfWUEJjG18', title: 'Probability Basics', channel: 'Math Antics' }],
  stat_normal:     [{ id: 'rzFX5NWojp0', title: 'Normal Distribution', channel: 'StatQuest' }],
  stat_regression: [{ id: 'zPG4NjIkCjc', title: 'Linear Regression', channel: 'StatQuest' }],
};

async function fetchYT(topic: Topic, apiKey: string) {
  if (!apiKey) return YT[topic.id] ?? [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic.youtubeQuery)}&type=video&videoDuration=short&maxResults=3&key=${apiKey}`;
    const d = await (await fetch(url)).json();
    if (!d.items?.length) return YT[topic.id] ?? [];
    return d.items.map((i: any) => ({ id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle }));
  } catch { return YT[topic.id] ?? []; }
}

const ANALOGIES: Record<string, string> = {
  alg_vars: "A variable is a labelled box — it holds any number you put in.",
  alg_linear: "Solving an equation is balancing scales — keep both sides equal.",
  alg_quad: "Quadratics are parabolas — the exact shape of a thrown ball's path.",
  alg_functions: "A function is a machine: put a number in, always get the same out.",
  calc_limits: "A limit is walking toward a wall — infinitely close but never touching.",
  calc_deriv: "A derivative is your speedometer — exact speed at one instant.",
  calc_integ: "An integral counts area like sand grains under a curve.",
  stat_desc: "Mean is the balancing point — where data would balance on a see-saw.",
  stat_prob: "Probability is counting: favourites ÷ total possibilities.",
  stat_normal: "Most natural things cluster around average — that's the bell curve.",
  stat_regression: "Regression finds the line that misses all your points by the least.",
};

export async function buildFeedQueue(profile: LearnerProfile, ytKey: string, count = 20): Promise<ReelCard[]> {
  const scores = computeFeedScores(profile);
  const sorted = ALL_TOPICS.map(t => ({ t, s: scores[t.id] ?? 0 })).sort((a, b) => b.s - a.s);
  const cards: ReelCard[] = [];
  let i = 0;
  for (const { t } of sorted) {
    if (cards.length >= count) break;
    const color = Object.values(COURSES).find(c => c.id === t.courseId)?.color ?? '#818cf8';
    const k = profile.knowledge[t.id];
    const adaptiveDiff = k ? getAdaptiveDifficulty(k) : 'normal';
    const slot = i % 4;
    if (slot === 0) {
      cards.push({ id: `formula_${t.id}_${i}`, type: 'formula', topicId: t.id, topicTitle: t.title, courseColor: color, title: `Key Formula: ${t.title}`, formula: t.formula });
    } else if (slot === 1) {
      cards.push({ id: `analogy_${t.id}_${i}`, type: 'analogy', topicId: t.id, topicTitle: t.title, courseColor: color, title: '💡 Think of it this way...', body: ANALOGIES[t.id] ?? '' });
    } else if (slot === 2) {
      const vids = await fetchYT(t, ytKey);
      if (vids[0]) cards.push({ id: `yt_${t.id}_${vids[0].id}`, type: 'youtube', topicId: t.id, topicTitle: t.title, courseColor: color, videoId: vids[0].id, videoTitle: vids[0].title, channelName: vids[0].channel, thumbnail: `https://i.ytimg.com/vi/${vids[0].id}/mqdefault.jpg` });
      else cards.push({ id: `analogy2_${t.id}_${i}`, type: 'analogy', topicId: t.id, topicTitle: t.title, courseColor: color, title: '💡 Remember...', body: ANALOGIES[t.id] ?? '' });
    } else {
      // Pick question based on adaptive difficulty
      const pool = adaptiveDiff === 'hard' ? (t.quizHard ?? t.quiz) : adaptiveDiff === 'easy' ? t.quiz.filter(q => q.difficulty !== 'hard') : t.quiz;
      const q = pool[Math.floor(Math.random() * pool.length)];
      cards.push({ id: `quiz_${t.id}_${q.id}_${i}`, type: 'quiz', topicId: t.id, topicTitle: t.title, courseColor: color, question: q, difficulty: adaptiveDiff });
    }
    i++;
  }
  return cards;
}

// ── Process engagement ─────────────────────────────────
export function processEngagement(profile: LearnerProfile, event: EngagementEvent): LearnerProfile {
  const knowledge = { ...profile.knowledge };
  const k = knowledge[event.topicId] ?? { topicId: event.topicId, pKnow: 0.1, attempts: 0, lastSeen: 0, consecutiveCorrect: 0, consecutiveWrong: 0 };

  if (event.action === 'correct') {
    knowledge[event.topicId] = { ...k, pKnow: bktUpdate(k.pKnow, true), attempts: k.attempts + 1, lastSeen: Date.now(), consecutiveCorrect: (k.consecutiveCorrect ?? 0) + 1, consecutiveWrong: 0 };
  } else if (event.action === 'incorrect') {
    knowledge[event.topicId] = { ...k, pKnow: bktUpdate(k.pKnow, false), attempts: k.attempts + 1, lastSeen: Date.now(), consecutiveCorrect: 0, consecutiveWrong: (k.consecutiveWrong ?? 0) + 1 };
  } else {
    knowledge[event.topicId] = { ...k, lastSeen: Date.now() };
  }

  const xpDelta = event.action === 'correct' ? 15 : event.action === 'complete' ? 5 : 0;
  return {
    ...profile, xp: profile.xp + xpDelta, knowledge,
    events: [...profile.events.slice(-200), event],
    topicScores: computeFeedScores({ ...profile, knowledge }),
  };
}
