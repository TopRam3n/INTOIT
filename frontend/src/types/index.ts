export type CourseId = 'algebra' | 'calculus' | 'statistics';
export type CardType = 'quiz' | 'formula' | 'analogy' | 'youtube';
export type Screen = 'home' | 'course' | 'lesson' | 'feed' | 'review' | 'graph' | 'dashboard';
export type LessonPhase = 'reading' | 'quiz' | 'results';
export type DifficultyMode = 'eli5' | 'normal' | 'challenge';

// ── Content ────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  formula?: string;
  difficulty?: 'easy' | 'normal' | 'hard'; // adaptive difficulty
}

export interface Topic {
  id: string;
  courseId: CourseId;
  title: string;
  difficulty: number;
  estimatedMinutes: number;
  lesson: string;
  lessonELI5?: string;   // simplified version
  formula: string;
  quiz: QuizQuestion[];
  quizHard?: QuizQuestion[]; // harder variants
  youtubeQuery: string;
}

export interface Course {
  id: CourseId;
  title: string;
  emoji: string;
  tagline: string;
  color: string;
  accent: string;
  topics: Topic[];
}

// ── Knowledge Graph ────────────────────────────────────
export interface GraphNode {
  id: string;
  label: string;
  courseId: string;
  difficulty: number;
  prerequisites: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
}

// ── SM-2 Spaced Repetition ─────────────────────────────
export interface SM2Card {
  topicId: string;
  interval: number;      // days until next review
  repetition: number;    // number of successful reviews
  easeFactor: number;    // difficulty multiplier (default 2.5)
  nextReview: number;    // timestamp
  lastReview: number;
}

// ── Reels Feed ─────────────────────────────────────────
export interface ReelCard {
  id: string;
  type: CardType;
  topicId: string;
  topicTitle: string;
  courseColor: string;
  difficulty?: 'easy' | 'normal' | 'hard'; // adaptive
  question?: QuizQuestion;
  title?: string;
  body?: string;
  formula?: string;
  videoId?: string;
  videoTitle?: string;
  thumbnail?: string;
  channelName?: string;
}

export interface EngagementEvent {
  cardId: string;
  topicId: string;
  type: CardType;
  action: 'complete' | 'skip' | 'correct' | 'incorrect' | 'youtube_open' | 'voice_answer';
  timeSpent: number;
  timestamp: number;
  userId?: string;
}

// ── Learner ────────────────────────────────────────────
export interface KnowledgeState {
  topicId: string;
  pKnow: number;
  attempts: number;
  lastSeen: number;
  consecutiveCorrect: number;   // for adaptive difficulty
  consecutiveWrong: number;
}

export interface Session {
  sessionId: string;
  topicId: string;
  quizScore: number;
  timeOnTask: number;
  pKnowBefore: number;
  pKnowAfter: number;
  knowledgeGain: number;
  satisfaction: number;
  predictedSatisfaction: number;
  timestamp: number;
}

export interface LearnerProfile {
  userId: string;
  xp: number;
  streak: number;
  knowledge: Record<string, KnowledgeState>;
  sm2Cards: Record<string, SM2Card>;
  sessions: Session[];
  events: EngagementEvent[];
  struggles: Record<string, number>;
  openAiKey: string;
  youtubeApiKey: string;
  topicScores: Record<string, number>;
  difficultyMode: DifficultyMode;
  // adaptive difficulty state
  currentCardDifficulty: Record<string, 'easy' | 'normal' | 'hard'>;
}

// ── Backend API types ──────────────────────────────────
export interface ApiSession extends Session {
  userId: string;
}

export interface ApiEvent extends EngagementEvent {
  userId: string;
}
