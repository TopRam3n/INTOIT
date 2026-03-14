import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearnerProfile, EngagementEvent, Session, Screen, LessonPhase, DifficultyMode, Course, Topic, ReelCard } from '../types';
import { ALL_TOPICS } from '../data/courses';
import { bktUpdate, computeFeedScores, processEngagement, predictForTopic, isUnlocked } from '../lib/engine';
import { sm2Update, initSM2Card, scoreToGrade, getDueCards } from '../lib/sm2';
import { saveSession, streamEvent, syncProfile } from '../lib/api';
import { buildFeedQueue } from '../lib/engine';

// ── Initial profile ────────────────────────────────────
function makeProfile(): LearnerProfile {
  const knowledge: LearnerProfile['knowledge'] = {};
  const sm2Cards: LearnerProfile['sm2Cards'] = {};
  ALL_TOPICS.forEach(t => {
    knowledge[t.id] = { topicId: t.id, pKnow: 0.1, attempts: 0, lastSeen: 0, consecutiveCorrect: 0, consecutiveWrong: 0 };
    sm2Cards[t.id] = initSM2Card(t.id);
  });
  return { userId: `user_${Date.now()}`, xp: 0, streak: 0, knowledge, sm2Cards, sessions: [], events: [], struggles: {}, openAiKey: '', youtubeApiKey: '', topicScores: {}, difficultyMode: 'normal', currentCardDifficulty: {} };
}

// ── Store ──────────────────────────────────────────────
interface AppStore {
  // UI state
  screen: Screen;
  lessonPhase: LessonPhase;
  selectedCourse: Course | null;
  selectedTopic: Topic | null;
  isDark: boolean;
  showSettings: boolean;
  lastResult: any;
  difficultyMode: DifficultyMode;

  // Feed state
  feedCards: ReelCard[];
  feedIdx: number;
  feedLoading: boolean;

  // Learner
  profile: LearnerProfile;
  backendStatus: 'unknown' | 'connected' | 'offline';

  // Actions — UI
  setScreen: (s: Screen) => void;
  setLessonPhase: (p: LessonPhase) => void;
  startTopic: (course: Course, topic: Topic) => void;
  setIsDark: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setDifficultyMode: (m: DifficultyMode) => void;

  // Actions — Feed
  buildFeed: () => Promise<void>;
  swipeFeed: (dir: 'up' | 'down', cardId: string, action: string, correct?: boolean) => void;

  // Actions — Learner
  recordSession: (args: { topicId: string; topicDifficulty: number; answers: boolean[]; timeOnTask: number }) => void;
  recordEvent: (event: EngagementEvent) => void;
  setKeys: (keys: { openAiKey?: string; youtubeApiKey?: string }) => void;

  // Selectors
  getPredictedSat: (topicId: string, difficulty: number) => number;
  isStruggling: (topicId: string) => boolean;
  getDueReviewCards: () => { topicId: string; pKnow: number }[];
  getAdaptiveLesson: (topicId: string) => string;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      screen: 'home',
      lessonPhase: 'reading',
      selectedCourse: null,
      selectedTopic: null,
      isDark: true,
      showSettings: false,
      lastResult: null,
      difficultyMode: 'normal',
      feedCards: [],
      feedIdx: 0,
      feedLoading: false,
      profile: makeProfile(),
      backendStatus: 'unknown',

      setScreen: (screen) => set({ screen }),
      setLessonPhase: (lessonPhase) => set({ lessonPhase }),
      startTopic: (course, topic) => set({ selectedCourse: course, selectedTopic: topic, lessonPhase: 'reading', lastResult: null, screen: 'lesson' }),
      setIsDark: (isDark) => set({ isDark }),
      setShowSettings: (showSettings) => set({ showSettings }),
      setDifficultyMode: (difficultyMode) => set({ difficultyMode, profile: { ...get().profile, difficultyMode } }),

      buildFeed: async () => {
        const { profile } = get();
        set({ feedLoading: true, feedCards: [], feedIdx: 0 });
        const cards = await buildFeedQueue(profile, profile.youtubeApiKey, 25);
        set({ feedCards: cards, feedLoading: false });
      },

      swipeFeed: (dir, cardId, action, correct) => {
        const { feedCards, feedIdx, profile } = get();
        const card = feedCards.find(c => c.id === cardId);
        if (!card) return;

        const event: EngagementEvent = { cardId, topicId: card.topicId, type: card.type, action: action as any, timeSpent: 0, timestamp: Date.now() };
        const newProfile = processEngagement(profile, event);
        set({ profile: newProfile });
        streamEvent(event, profile.userId);

        if (dir === 'up' || action !== 'replay') {
          const nextIdx = feedIdx + 1;
          // Refill when low
          if (nextIdx >= feedCards.length - 5) {
            buildFeedQueue(newProfile, newProfile.youtubeApiKey, 12).then(more =>
              set(s => ({ feedCards: [...s.feedCards, ...more] }))
            );
          }
          set({ feedIdx: nextIdx });
        }
      },

      recordSession: ({ topicId, topicDifficulty, answers, timeOnTask }) => {
        const { profile } = get();
        const k = profile.knowledge[topicId] ?? { topicId, pKnow: 0.1, attempts: 0, lastSeen: 0, consecutiveCorrect: 0, consecutiveWrong: 0 };
        const pKnowBefore = k.pKnow;
        let pKnow = pKnowBefore;
        answers.forEach(c => { pKnow = bktUpdate(pKnow, c); });

        const quizScore = answers.filter(Boolean).length / answers.length;
        const knowledgeGain = pKnow - pKnowBefore;
        const isStruggling = quizScore < 0.5;

        // Update SM-2
        const grade = scoreToGrade(quizScore);
        const currentSM2 = profile.sm2Cards[topicId] ?? initSM2Card(topicId);
        const updatedSM2 = sm2Update(currentSM2, grade);

        const session: Session = {
          sessionId: `${Date.now()}`, topicId, quizScore, timeOnTask,
          pKnowBefore, pKnowAfter: pKnow, knowledgeGain,
          satisfaction: quizScore * 0.6 + (1 - Math.abs(topicDifficulty - pKnowBefore)) * 0.4,
          predictedSatisfaction: predictForTopic(profile, topicId, topicDifficulty),
          timestamp: Date.now(),
        };

        const newProfile: LearnerProfile = {
          ...profile,
          xp: profile.xp + Math.round(quizScore * 50 + (quizScore === 1 ? 20 : 0)),
          streak: profile.streak + (quizScore >= 0.67 ? 1 : 0),
          knowledge: { ...profile.knowledge, [topicId]: { ...k, pKnow, attempts: k.attempts + 1, lastSeen: Date.now(), consecutiveCorrect: quizScore >= 0.67 ? (k.consecutiveCorrect ?? 0) + 1 : 0, consecutiveWrong: isStruggling ? (k.consecutiveWrong ?? 0) + 1 : 0 } },
          sm2Cards: { ...profile.sm2Cards, [topicId]: updatedSM2 },
          struggles: isStruggling ? { ...profile.struggles, [topicId]: (profile.struggles[topicId] ?? 0) + 1 } : profile.struggles,
          sessions: [...profile.sessions, session],
        };

        set({ profile: newProfile, lastResult: { quizScore, pKnowBefore, pKnowAfter: pKnow, satisfaction: session.satisfaction } });
        saveSession(session, profile.userId);
        syncProfile(newProfile);
      },

      recordEvent: (event) => {
        const { profile } = get();
        set({ profile: processEngagement(profile, event) });
        streamEvent(event, profile.userId);
      },

      setKeys: (keys) => set(s => ({ profile: { ...s.profile, ...keys } })),

      getPredictedSat: (topicId, difficulty) => predictForTopic(get().profile, topicId, difficulty),
      isStruggling: (topicId) => (get().profile.struggles[topicId] ?? 0) >= 1,

      getDueReviewCards: () => {
        const { profile } = get();
        return getDueCards(profile.sm2Cards).map(c => ({
          topicId: c.topicId,
          pKnow: profile.knowledge[c.topicId]?.pKnow ?? 0.1,
        }));
      },

      getAdaptiveLesson: (topicId) => {
        const { profile, difficultyMode } = get();
        const topic = ALL_TOPICS.find(t => t.id === topicId);
        if (!topic) return '';
        if (difficultyMode === 'eli5' && topic.lessonELI5) return topic.lessonELI5;
        return topic.lesson;
      },
    }),
    {
      name: 'intoit-v3',
      partialize: (state) => ({
        profile: state.profile,
        isDark: state.isDark,
        difficultyMode: state.difficultyMode,
      }),
    }
  )
);
