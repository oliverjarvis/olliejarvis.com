"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Conversation,
  ConversationExchange,
  GamePhase,
  AnswerMode,
  DisplayMessage,
  KuromojiToken,
  VocabWord,
} from "../types";
import { conversations } from "../conversations";
import {
  dbGetProfile,
  dbInitProfile,
  dbRecordMCResult,
  dbRebuildProfile,
  dbRecordTokens,
  dbBookmarkWord,
  dbGetJournalStats,
  dbRecordGrammarPatterns,
  dbRecordConversation,
  dbGetSavedConversations,
  dbSaveSavedConversations,
  dbGetAiConversations,
  dbSaveAiConversations,
  dbEnsureUserRow,
  dbRecordGrammarPointIds,
  dbBackfillMeanings,
  dbGetWordJournal,
  computeGrammarPointsStats,
  dbGetGrammarPointsJournal,
  serializeProfileForPrompt,
  SavedConversation,
} from "../db";
import { findCandidates } from "../grammar-detection";
import { supabase } from "@/lib/supabase";
import MessageBubble from "./MessageBubble";
import MultipleChoice from "./MultipleChoice";
import AnswerPanel from "./AnswerPanel";
import WordJournalPanel from "./WordJournalPanel";
import OnboardingFlow from "./OnboardingFlow";
import TokenizedText from "./TokenizedText";
import AudioButton from "./AudioButton";
import GrammarBreakdown from "./GrammarBreakdown";
import ProfileDialog from "./ProfileDialog";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  RotateCcw,
  Check,
  X as XIcon,
  Shuffle,
  PenLine,
  Lightbulb,
  Sparkles,
  Trophy,
  MessageCircle,
  Palette,
  Wand2,
  Loader2,
  Settings,
  LogOut,
} from "lucide-react";
import { useHighlight } from "../highlight-context";

const LEVEL_COLORS = {
  beginner: {
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  intermediate: {
    bg: "bg-amber-500",
    bgLight: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  advanced: {
    bg: "bg-rose-500",
    bgLight: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
  },
};

const HIGHLIGHT_LABELS = { off: "Off", subtle: "Subtle", vivid: "Vivid" } as const;

export default function Game() {
  const { level: highlightLevel, cycle: cycleHighlight } = useHighlight();
  const [phase, setPhase] = useState<GamePhase>("select");
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null);
  const [exchangeIdx, setExchangeIdx] = useState(0);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);

  const [answerMode, setAnswerMode] = useState<AnswerMode | null>(null);
  const [userAnswer, setUserAnswer] = useState("");

  const [showJournal, setShowJournal] = useState(false);
  const [journalRefresh, setJournalRefresh] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [grammarCount, setGrammarCount] = useState(0);
  const [hasProfile, setHasProfile] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const [aiFeedback, setAiFeedback] = useState<{
    isValid: boolean;
    feedback: string;
    grammarTip: string | null;
  } | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const [aiConversations, setAiConversations] = useState<Conversation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Live conversation mode
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveConvId, setLiveConvId] = useState<string | null>(null);
  const [liveSpeaker, setLiveSpeaker] = useState("");
  const [liveSpeakerDesc, setLiveSpeakerDesc] = useState("");
  const [liveTopic, setLiveTopic] = useState("");
  const [liveLevel, setLiveLevel] = useState("");
  const [liveExchange, setLiveExchange] = useState<ConversationExchange | null>(null);
  const [liveHistory, setLiveHistory] = useState<{ role: "speaker" | "user"; text: string; translation: string }[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveEnded, setLiveEnded] = useState(false);

  const [tokenCache, setTokenCache] = useState<
    Record<string, KuromojiToken[]>
  >({});
  const [newWords, setNewWords] = useState<Set<string>>(new Set());

  const [savedConversations, setSavedConversations] = useState<
    Record<string, SavedConversation>
  >({});
  const [replayId, setReplayId] = useState<string | null>(null);

  // Cached profile level for display (avoids async reads in render)
  const [cachedLevel, setCachedLevel] = useState<string>("N5");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      await dbEnsureUserRow();

      const [profile, saved, aiSaved, stats, gpJournal, wordJournal] = await Promise.all([
        dbGetProfile(),
        dbGetSavedConversations(),
        dbGetAiConversations(),
        dbGetJournalStats(),
        dbGetGrammarPointsJournal(),
        dbGetWordJournal(),
      ]);

      setSavedConversations(saved);
      setAiConversations(aiSaved);
      setWordCount(stats.total);
      setGrammarCount(computeGrammarPointsStats(gpJournal).total);
      setHasProfile(!!profile);
      if (profile) setCachedLevel(profile.estimatedLevel);
      setDataLoading(false);

      // Background: backfill meanings for existing words without definitions
      const wordsWithoutMeaning = Object.values(wordJournal)
        .filter((w) => !w.meaning && w.encounterCount > 0)
        .map((w) => w.word);
      if (wordsWithoutMeaning.length > 0) {
        dbBackfillMeanings(wordsWithoutMeaning).then(() => {
          setJournalRefresh((n) => n + 1);
        });
      }
    };

    loadData();
  }, []);

  const allConversations = [...conversations, ...aiConversations];

  const generateConversation = async () => {
    setIsGenerating(true);
    try {
      const profile = await dbRebuildProfile();
      const learnerProfile = serializeProfileForPrompt(profile);
      setCachedLevel(profile.estimatedLevel);

      const res = await fetch("/api/nihongo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: generateTopic || undefined,
          level: profile.estimatedLevel,
          learnerProfile,
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        const conv = data.conversation as Conversation;
        conv.id = `ai-${Date.now()}`;
        const updated = [...aiConversations, conv];
        setAiConversations(updated);
        await dbSaveAiConversations(updated);
        setShowGenerateForm(false);
        setGenerateTopic("");
      }
    } catch (error) {
      console.error("Generation failed:", error);
    }
    setIsGenerating(false);
  };

  // === Live conversation mode ===

  const startLiveConversation = async (topic: string, level: string, speaker?: string, speakerDesc?: string) => {
    const convId = `live-${Date.now()}`;
    const spk = speaker || "相手";
    const desc = speakerDesc || "Your conversation partner";
    setLiveConvId(convId);
    setLiveSpeaker(spk);
    setLiveSpeakerDesc(desc);
    setLiveTopic(topic);
    setLiveLevel(level);
    setIsLiveMode(true);
    setLiveHistory([]);
    setLiveExchange(null);
    setLiveEnded(false);
    setMessages([]);
    setNewWords(new Set());
    setPhase("reading");
    setExchangeIdx(0);
    setSelectedChoice(null);
    setQuizCorrect(null);
    setAnswerMode(null);
    setUserAnswer("");
    setCurrentConv({
      id: convId,
      title: topic,
      titleEn: topic,
      level: level as Conversation["level"],
      speaker: spk,
      speakerDescription: desc,
      exchanges: [],
    });

    // Fetch first message
    setIsLiveLoading(true);
    try {
      const profile = await dbRebuildProfile();
      const learnerProfile = serializeProfileForPrompt(profile);

      const res = await fetch("/api/nihongo/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker: spk,
          speakerDescription: desc,
          topic,
          level,
          learnerProfile,
          isFirstMessage: true,
        }),
      });
      const exchange = await res.json();
      if (exchange.error) throw new Error(exchange.error);

      setLiveExchange(exchange);
      setLiveHistory([{
        role: "speaker",
        text: exchange.speakerMessage,
        translation: exchange.speakerMessageTranslation,
      }]);
      setMessages([{
        speaker: spk,
        text: exchange.speakerMessage,
        isUser: false,
        translation: exchange.speakerMessageTranslation,
      }]);
      tokenize(exchange.speakerMessage);
    } catch (error) {
      console.error("Live conversation failed:", error);
      setPhase("select");
      setIsLiveMode(false);
    }
    setIsLiveLoading(false);
  };

  const fetchNextLiveExchange = async (userText: string) => {
    setIsLiveLoading(true);
    try {
      const profile = await dbGetProfile();
      const learnerProfile = profile ? serializeProfileForPrompt(profile) : undefined;

      const newHistory = [
        ...liveHistory,
        { role: "user" as const, text: userText, translation: "" },
      ];
      setLiveHistory(newHistory);

      const res = await fetch("/api/nihongo/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker: liveSpeaker,
          speakerDescription: liveSpeakerDesc,
          topic: liveTopic,
          level: liveLevel,
          conversationHistory: newHistory,
          userMessage: userText,
          learnerProfile,
          isFirstMessage: false,
        }),
      });
      const exchange = await res.json();
      if (exchange.error) throw new Error(exchange.error);

      if (exchange.shouldEnd) {
        setLiveEnded(true);
      }

      setLiveExchange(exchange);
      setLiveHistory((prev) => [
        ...prev,
        {
          role: "speaker",
          text: exchange.speakerMessage,
          translation: exchange.speakerMessageTranslation,
        },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          speaker: liveSpeaker,
          text: exchange.speakerMessage,
          isUser: false,
          translation: exchange.speakerMessageTranslation,
        },
      ]);
      setExchangeIdx((n) => n + 1);
      tokenize(exchange.speakerMessage);
      setPhase("reading");
    } catch (error) {
      console.error("Live exchange failed:", error);
    }
    setIsLiveLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLiveLoading]);

  useEffect(() => {
    if (phase !== "select" && phase !== "reading") {
      setTimeout(() => {
        interactionRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [phase]);

  const tokenize = useCallback(
    async (text: string): Promise<KuromojiToken[]> => {
      if (tokenCache[text]) return tokenCache[text];
      try {
        const res = await fetch("/api/nihongo/tokenize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (data.tokens) {
          setTokenCache((prev) => ({ ...prev, [text]: data.tokens }));
          // Record to word journal + grammar patterns
          if (currentConv) {
            const result = await dbRecordTokens(data.tokens, currentConv.id, vocabulary);
            if (result.newWords.size > 0) {
              setNewWords((prev) => new Set([...prev, ...result.newWords]));
              // Background: lookup meanings for new words without definitions
              dbBackfillMeanings([...result.newWords]).then(() => {
                setJournalRefresh((n) => n + 1);
              });
            }
            await dbRecordGrammarPatterns(data.tokens);
            const stats = await dbGetJournalStats();
            setWordCount(stats.total);
            setJournalRefresh((n) => n + 1);

            // Grammar point detection (background — don't await)
            detectGrammarPoints(text, data.tokens, currentConv.id);
          }
          return data.tokens;
        }
      } catch {
        /* fallback */
      }
      return [];
    },
    [tokenCache],
  );

  // Grammar point detection: runs in background after tokenization
  const detectGrammarPoints = useCallback(
    async (text: string, tokens: KuromojiToken[], conversationId: string) => {
      try {
        const candidates = findCandidates(text, tokens);
        if (candidates.length === 0) return;

        // Send candidates to LLM for confirmation
        const res = await fetch("/api/nihongo/grammar-detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentence: text,
            candidates: candidates.map((c) => ({
              id: c.id,
              name: c.name,
              meaning: c.meaning,
            })),
          }),
        });
        const data = await res.json();
        if (data.confirmedIds?.length > 0) {
          await dbRecordGrammarPointIds(data.confirmedIds, conversationId);
          const gpJournal = await dbGetGrammarPointsJournal();
          setGrammarCount(computeGrammarPointsStats(gpJournal).total);
          setJournalRefresh((n) => n + 1);
        }
      } catch (error) {
        console.error("Grammar detection failed:", error);
      }
    },
    [],
  );

  const vocabulary = useMemo((): VocabWord[] => {
    const vocab: VocabWord[] = [];
    if (currentConv) {
      for (let i = 0; i <= exchangeIdx; i++) {
        if (currentConv.exchanges[i]) {
          vocab.push(...currentConv.exchanges[i].vocabulary);
        }
      }
    }
    if (liveExchange?.vocabulary) {
      vocab.push(...liveExchange.vocabulary);
    }
    return vocab;
  }, [currentConv, exchangeIdx, liveExchange]);

  const handleTokenized = useCallback(
    (text: string, tokens: KuromojiToken[]) => {
      setTokenCache((prev) => ({ ...prev, [text]: tokens }));
    },
    [],
  );

  const startConversation = useCallback(
    (conv: Conversation) => {
      setCurrentConv(conv);
      setExchangeIdx(0);
      setReplayId(null);
      setNewWords(new Set());
      const exchange = conv.exchanges[0];
      const firstMessage: DisplayMessage = {
        speaker: conv.speaker,
        text: exchange.speakerMessage,
        isUser: false,
        translation: exchange.speakerMessageTranslation,
      };
      setMessages([firstMessage]);
      setPhase("reading");
      setSelectedChoice(null);
      setQuizCorrect(null);
      setAnswerMode(null);
      setUserAnswer("");
      tokenize(exchange.speakerMessage);
    },
    [tokenize],
  );

  const handleQuizAnswer = async (choiceIdx: number) => {
    const exchange = isLiveMode ? liveExchange : currentConv?.exchanges[exchangeIdx];
    if (!exchange) return;
    const correct = choiceIdx === exchange.correctChoiceIndex;
    setSelectedChoice(choiceIdx);
    setQuizCorrect(correct);
    setPhase("quiz_result");
    await dbRecordMCResult(correct);
  };

  const continueAfterQuiz = () => {
    setPhase("mode_select");
    setSelectedChoice(null);
    setQuizCorrect(null);
  };

  const selectMode = (mode: AnswerMode) => {
    setAnswerMode(mode);
    setPhase("answering");
    setUserAnswer("");
  };

  const submitAnswer = async (answer: string) => {
    if (!currentConv) return;
    const exchange = isLiveMode ? liveExchange : currentConv.exchanges[exchangeIdx];
    if (!exchange) return;

    setUserAnswer(answer);
    setAiFeedback(null);
    setMessages((prev) => [
      ...prev,
      {
        speaker: "You",
        text: answer,
        isUser: true,
        translation: exchange.suggestedAnswerTranslation,
      },
    ]);
    setPhase("answer_feedback");
    tokenize(answer);

    setIsFeedbackLoading(true);
    try {
      const res = await fetch("/api/nihongo/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAnswer: answer,
          suggestedAnswer: exchange.suggestedAnswer,
          suggestedTranslation: exchange.suggestedAnswerTranslation,
          context: `Speaker said: "${exchange.speakerMessage}" (${exchange.speakerMessageTranslation})`,
        }),
      });
      const data = await res.json();
      setAiFeedback(data);
    } catch {
      setAiFeedback({
        isValid: true,
        feedback: "Great effort! Keep going!",
        grammarTip: null,
      });
    }
    setIsFeedbackLoading(false);
  };

  const nextExchange = async () => {
    if (!currentConv) return;

    // Live mode: fetch next exchange from AI
    if (isLiveMode) {
      if (liveEnded) {
        const saved = {
          ...savedConversations,
          [currentConv.id]: { messages, completedAt: Date.now() },
        };
        setSavedConversations(saved);
        await dbSaveSavedConversations(saved);
        await dbRecordConversation({
          id: currentConv.id,
          title: liveTopic,
          level: liveLevel,
          topic: liveTopic,
          completedAt: Date.now(),
          newWordsIntroduced: 0,
          exchangeCount: exchangeIdx + 1,
        });
        await dbRebuildProfile();
        setPhase("complete");
        return;
      }
      setSelectedChoice(null);
      setQuizCorrect(null);
      setAnswerMode(null);
      setUserAnswer("");
      fetchNextLiveExchange(userAnswer);
      return;
    }

    // Scripted mode
    const nextIdx = exchangeIdx + 1;
    if (nextIdx >= currentConv.exchanges.length) {
      const saved = {
        ...savedConversations,
        [currentConv.id]: { messages, completedAt: Date.now() },
      };
      setSavedConversations(saved);
      await dbSaveSavedConversations(saved);
      await dbRecordConversation({
        id: currentConv.id,
        title: currentConv.title,
        level: currentConv.level,
        topic: currentConv.titleEn,
        completedAt: Date.now(),
        newWordsIntroduced: 0,
        exchangeCount: currentConv.exchanges.length,
      });
      await dbRebuildProfile();
      setPhase("complete");
      return;
    }
    setExchangeIdx(nextIdx);
    setAnswerMode(null);
    setSelectedChoice(null);
    setQuizCorrect(null);
    setUserAnswer("");
    const exchange = currentConv.exchanges[nextIdx];
    setMessages((prev) => [
      ...prev,
      {
        speaker: currentConv.speaker,
        text: exchange.speakerMessage,
        isUser: false,
        translation: exchange.speakerMessageTranslation,
      },
    ]);
    tokenize(exchange.speakerMessage);
    setPhase("reading");
  };

  const handleBookmarkWord = async (word: string, reading: string, meaning: string) => {
    await dbBookmarkWord(word, reading, meaning);
    const stats = await dbGetJournalStats();
    setWordCount(stats.total);
    setJournalRefresh((n) => n + 1);
  };

  const goBack = () => {
    setPhase("select");
    setCurrentConv(null);
    setReplayId(null);
    setMessages([]);
    setIsLiveMode(false);
    setLiveExchange(null);
    setLiveHistory([]);
    setLiveEnded(false);
  };

  const startReplay = (convId: string) => {
    setReplayId(convId);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const currentExchange = isLiveMode ? liveExchange : currentConv?.exchanges[exchangeIdx];
  const progress = currentConv
    ? ((exchangeIdx + 1) / currentConv.exchanges.length) * 100
    : 0;

  // Loading state
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <Loader2 size={32} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Replay view
  if (replayId) {
    const saved = savedConversations[replayId];
    const conv = allConversations.find((c) => c.id === replayId);
    if (!saved || !conv) return null;
    const allVocab = conv.exchanges.flatMap((e) => e.vocabulary);

    return (
      <div className="min-h-screen flex flex-col bg-[#f0f0f0]">
        <header className="p-4 flex items-center gap-3 bg-white border-b-4 border-emerald-400 sticky top-0 z-40">
          <button
            onClick={() => setReplayId(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-lg text-gray-800">
                {conv.title}
              </h1>
              <AudioButton text={conv.title} size={14} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-400 font-semibold">
              {conv.titleEn} &middot; Replay
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {saved.messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              vocabulary={allVocab}
              tokens={tokenCache[msg.text]}
              onAddToSRS={handleBookmarkWord}
            />
          ))}
        </div>
      </div>
    );
  }

  // Onboarding — show on first visit
  if (!hasProfile) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setHasProfile(true);
        }}
      />
    );
  }

  // Select screen — messenger style
  if (phase === "select") {
    const AVATAR_COLORS = [
      "from-sky-400 to-blue-500",
      "from-purple-400 to-indigo-500",
      "from-orange-400 to-rose-500",
      "from-emerald-400 to-teal-500",
      "from-pink-400 to-rose-500",
    ];

    return (
      <div className="min-h-screen flex flex-col bg-[#f0f0f0]">
        <header className="p-5 bg-gradient-to-r from-emerald-500 to-teal-500 sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <MessageCircle
                size={28}
                className="text-white"
                fill="white"
                strokeWidth={0}
              />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                日本語練習
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleHighlight}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white hover:bg-white/30 transition-colors"
                title="Grammar highlight intensity"
              >
                <Palette size={14} />
                {HIGHLIGHT_LABELS[highlightLevel]}
              </button>
              <button
                onClick={() => setShowJournal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white hover:bg-white/30 transition-colors"
              >
                <BookOpen size={16} />
                Journal
                {(wordCount > 0 || grammarCount > 0) && (
                  <span className="bg-emerald-400 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold">
                    {wordCount + grammarCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowProfile(true)}
                className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-colors"
                title="Learner profile"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <ProfileDialog
          open={showProfile}
          onClose={() => setShowProfile(false)}
        />

        <div className="flex flex-1">
          <div className="flex-1 max-w-2xl mx-auto w-full">
            {/* Conversations as chat list */}
            <div className="bg-white sm:my-4 sm:mx-4 sm:rounded-2xl sm:shadow-lg overflow-hidden">
              {allConversations.map((conv, idx) => {
                const isSaved = !!savedConversations[conv.id];
                const colors = LEVEL_COLORS[conv.level];
                const avatarGradient = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const preview = conv.exchanges[0].speakerMessage;
                const initial = conv.speaker[0];

                return (
                  <div key={conv.id}>
                    <button
                      onClick={() => startConversation(conv)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div
                        className={`shrink-0 w-14 h-14 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-md relative`}
                      >
                        <span className="text-white font-extrabold text-xl">
                          {initial}
                        </span>
                        {isSaved && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-extrabold text-gray-900 text-base">
                            {conv.speaker}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${colors.badge}`}
                          >
                            {conv.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-bold text-gray-700">
                            {conv.title}
                          </span>
                          <AudioButton text={conv.title} size={12} className="text-gray-300 shrink-0" />
                          <span className="text-xs text-gray-400">
                            &middot; {conv.titleEn}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {preview}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight
                        size={20}
                        className="text-gray-300 shrink-0"
                      />
                    </button>

                    {/* Replay button if completed */}
                    {isSaved && (
                      <div className="flex px-4 pb-3 -mt-1 ml-[4.25rem]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startReplay(conv.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                          <RotateCcw size={12} />
                          Replay
                        </button>
                      </div>
                    )}

                    {/* Divider */}
                    {idx < allConversations.length - 1 && (
                      <div className="ml-[4.25rem] border-b border-gray-100" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Generate new conversation */}
            <div className="sm:mx-4 mt-4 mb-6">
              {!showGenerateForm ? (
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-extrabold text-base hover:from-violet-600 hover:to-purple-700 active:from-violet-700 active:to-purple-800 transition-all shadow-lg shadow-violet-200"
                >
                  <Wand2 size={20} />
                  Generate New Conversation
                </button>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-gray-800 flex items-center gap-2">
                      <Wand2 size={18} className="text-violet-500" />
                      AI Conversation
                    </h3>
                    <button
                      onClick={() => setShowGenerateForm(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="text-center text-sm">
                    <span className="text-gray-400">Your level: </span>
                    <span className="font-extrabold text-emerald-600">
                      {cachedLevel}
                    </span>
                    <span className="text-gray-400"> — difficulty adapts automatically</span>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Topic (optional)
                    </label>
                    <input
                      type="text"
                      value={generateTopic}
                      onChange={(e) => setGenerateTopic(e.target.value)}
                      placeholder="e.g. asking for directions, at the doctor, buying clothes..."
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        setShowGenerateForm(false);
                        const p = await dbGetProfile();
                        startLiveConversation(
                          generateTopic || "free conversation",
                          p?.estimatedLevel || "N5",
                        );
                      }}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-extrabold disabled:opacity-60 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-200"
                    >
                      <MessageCircle size={16} />
                      Live
                    </button>
                    <button
                      onClick={generateConversation}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-extrabold disabled:opacity-60 hover:from-violet-600 hover:to-purple-700 transition-all shadow-md shadow-violet-200"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          ...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Offline
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    <strong>Live</strong>: AI reacts to your responses in real-time.{" "}
                    <strong>Offline</strong>: Pre-generated, works without internet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {showJournal && (
            <WordJournalPanel
              onClose={() => setShowJournal(false)}
              refreshTrigger={journalRefresh}
            />
          )}
        </div>
      </div>
    );
  }

  // Active conversation
  return (
    <div className="h-screen flex flex-col bg-[#f0f0f0] overflow-hidden">
      <header className="bg-white border-b-4 border-emerald-400 shrink-0 z-40">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-lg text-gray-800">
                  {currentConv?.title}
                </h1>
                {currentConv && (
                  <AudioButton text={currentConv.title} size={14} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 font-semibold">
                {currentConv?.titleEn} &middot; {currentConv?.speaker} &middot; {exchangeIdx + 1}/
                {currentConv?.exchanges.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cycleHighlight}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors"
              title="Grammar highlight intensity"
            >
              <Palette size={14} />
              {HIGHLIGHT_LABELS[highlightLevel]}
            </button>
            <button
              onClick={() => setShowJournal(!showJournal)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 rounded-full text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <BookOpen size={14} />
              Journal
              {(wordCount > 0 || grammarCount > 0) && (
                <span className="bg-emerald-400 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold">
                  {wordCount + grammarCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                vocabulary={vocabulary}
                tokens={tokenCache[msg.text]}
                onAddToSRS={handleBookmarkWord}
              newWords={newWords}
              />
            ))}
            {isLiveLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-4 shadow-md border-2 border-gray-100">
                  <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1.5">
                    {liveSpeaker || "..."}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interaction panel */}
          <div
            ref={interactionRef}
            className="border-t-2 border-gray-200 bg-white p-4 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
          >
            {phase === "reading" && !isLiveLoading && (
              <button
                onClick={() => setPhase("quiz")}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Continue
              </button>
            )}

            {phase === "quiz" && currentExchange && (
              <MultipleChoice
                question={currentExchange.question}
                questionTranslation={currentExchange.questionTranslation}
                choices={currentExchange.choices}
                choiceTranslations={currentExchange.choiceTranslations}
                onSelect={handleQuizAnswer}
                selectedIndex={selectedChoice}
                correctIndex={currentExchange.correctChoiceIndex}
                showResult={false}
                vocabulary={vocabulary}
                onAddToSRS={handleBookmarkWord}
                tokenCache={tokenCache}
                onTokenized={handleTokenized}
              />
            )}

            {phase === "quiz_result" && currentExchange && (
              <div className="space-y-4">
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl ${
                    quizCorrect
                      ? "bg-emerald-50 border-2 border-emerald-200"
                      : "bg-rose-50 border-2 border-rose-200"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${quizCorrect ? "bg-emerald-500" : "bg-rose-500"}`}
                  >
                    {quizCorrect ? (
                      <Check size={20} className="text-white" />
                    ) : (
                      <XIcon size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`font-extrabold text-lg ${quizCorrect ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {quizCorrect ? "Correct!" : "Not quite!"}
                    </span>
                    {!quizCorrect && (
                      <div
                        className="text-sm text-rose-600 mt-1"
                      >
                        Answer:{" "}
                        <strong>
                          <TokenizedText
                            text={
                              currentExchange.choices[
                                currentExchange.correctChoiceIndex
                              ]
                            }
                            vocabulary={vocabulary}
                            onAddToSRS={handleBookmarkWord}
                            tokenCache={tokenCache}
                            onTokenized={handleTokenized}
                            showAudio={false}
                          />
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
                <MultipleChoice
                  question={currentExchange.question}
                  questionTranslation={currentExchange.questionTranslation}
                  choices={currentExchange.choices}
                  choiceTranslations={currentExchange.choiceTranslations}
                  onSelect={() => {}}
                  selectedIndex={selectedChoice}
                  correctIndex={currentExchange.correctChoiceIndex}
                  showResult={true}
                  vocabulary={vocabulary}
                  onAddToSRS={handleBookmarkWord}
                  tokenCache={tokenCache}
                  onTokenized={handleTokenized}
                />
                <button
                  onClick={continueAfterQuiz}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Now respond
                </button>
              </div>
            )}

            {phase === "mode_select" && currentExchange && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">
                  Choose your response mode
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => selectMode("scramble")}
                    className="flex items-center gap-3 p-4 bg-sky-50 border-2 border-sky-200 rounded-2xl hover:border-sky-400 hover:bg-sky-100 active:bg-sky-200 transition-colors text-left"
                  >
                    <div className="p-2 bg-sky-500 rounded-xl">
                      <Shuffle size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-sky-700">Unscramble</div>
                      <div className="text-xs text-sky-500">
                        Arrange words in order
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => selectMode("freetext")}
                    className="flex items-center gap-3 p-4 bg-violet-50 border-2 border-violet-200 rounded-2xl hover:border-violet-400 hover:bg-violet-100 active:bg-violet-200 transition-colors text-left"
                  >
                    <div className="p-2 bg-violet-500 rounded-xl">
                      <PenLine size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-violet-700">Free Text</div>
                      <div className="text-xs text-violet-500">
                        Type your own answer
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => selectMode("hybrid")}
                    className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl hover:border-amber-400 hover:bg-amber-100 active:bg-amber-200 transition-colors text-left"
                  >
                    <div className="p-2 bg-amber-500 rounded-xl">
                      <Lightbulb size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-700">
                        Hints
                      </div>
                      <div className="text-xs text-amber-500">
                        Free text + word bank
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {phase === "answering" && currentExchange && answerMode && (
              <div className="space-y-3">
                <button
                  onClick={() => setPhase("mode_select")}
                  className="flex items-center gap-1 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Change mode
                </button>
                <AnswerPanel
                  mode={answerMode}
                  exchange={currentExchange}
                  onSubmit={submitAnswer}
                  vocabulary={vocabulary}
                  onAddToSRS={handleBookmarkWord}
                  tokenCache={tokenCache}
                  onTokenized={handleTokenized}
                />
              </div>
            )}

            {phase === "answer_feedback" && currentExchange && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Your answer
                  </div>
                  <div className="p-4 bg-sky-50 border-2 border-sky-200 rounded-2xl text-lg">
                    <TokenizedText
                      text={userAnswer}
                      vocabulary={vocabulary}
                      onAddToSRS={handleBookmarkWord}
                      tokenCache={tokenCache}
                      onTokenized={handleTokenized}
                    newWords={newWords}
                    />
                  </div>
                  <GrammarBreakdown text={userAnswer} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Suggested answer
                  </div>
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-lg">
                    <TokenizedText
                      text={currentExchange.suggestedAnswer}
                      vocabulary={vocabulary}
                      onAddToSRS={handleBookmarkWord}
                      tokenCache={tokenCache}
                      onTokenized={handleTokenized}
                    newWords={newWords}
                    />
                  </div>
                  <div className="text-sm text-gray-500 italic">
                    {currentExchange.suggestedAnswerTranslation}
                  </div>
                  <GrammarBreakdown text={currentExchange.suggestedAnswer} />
                </div>
                {/* AI Feedback */}
                {isFeedbackLoading ? (
                  <div className="flex items-center gap-3 p-4 bg-violet-50 border-2 border-violet-200 rounded-2xl">
                    <Loader2
                      size={18}
                      className="text-violet-500 animate-spin shrink-0"
                    />
                    <span className="text-sm text-violet-600 font-medium">
                      Checking your answer...
                    </span>
                  </div>
                ) : aiFeedback ? (
                  <div
                    className={`p-4 rounded-2xl border-2 space-y-2 ${
                      aiFeedback.isValid
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`p-1.5 rounded-full shrink-0 mt-0.5 ${
                          aiFeedback.isValid
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      >
                        {aiFeedback.isValid ? (
                          <Sparkles size={14} className="text-white" />
                        ) : (
                          <Lightbulb size={14} className="text-white" />
                        )}
                      </div>
                      <p
                        className={`text-sm font-medium ${
                          aiFeedback.isValid
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {aiFeedback.feedback}
                      </p>
                    </div>
                    {aiFeedback.grammarTip && (
                      <div className="flex items-start gap-2 pt-2 border-t border-dashed border-gray-200">
                        <div className="p-1 bg-indigo-500 rounded-full shrink-0 mt-0.5">
                          <BookOpen size={12} className="text-white" />
                        </div>
                        <p className="text-xs text-indigo-700 font-medium">
                          {aiFeedback.grammarTip}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
                <button
                  onClick={nextExchange}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  {isLiveMode
                    ? liveEnded
                      ? "Finish"
                      : "Continue"
                    : exchangeIdx + 1 < (currentConv?.exchanges.length ?? 0)
                      ? "Continue"
                      : "Finish"}
                </button>
              </div>
            )}

            {phase === "complete" && (
              <div className="text-center space-y-5 py-6">
                <div className="inline-flex p-4 bg-amber-100 rounded-full">
                  <Trophy size={40} className="text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-gray-800">
                    Conversation Complete!
                  </div>
                  <p className="text-gray-500 mt-1 font-medium">
                    Great work practicing with {currentConv?.speaker}
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={goBack}
                    className="px-6 py-3 bg-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Back to list
                  </button>
                  {currentConv && (
                    <button
                      onClick={() => startConversation(currentConv)}
                      className="flex items-center gap-1 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                    >
                      <RotateCcw size={16} />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showJournal && (
          <WordJournalPanel
            onClose={() => setShowJournal(false)}
            refreshTrigger={journalRefresh}
          />
        )}
      </div>
    </div>
  );
}
