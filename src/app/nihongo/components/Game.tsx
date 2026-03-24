"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Conversation,
  GamePhase,
  AnswerMode,
  DisplayMessage,
  KuromojiToken,
  VocabWord,
} from "../types";
import { conversations } from "../conversations";
import { addCard, getDueCards } from "../srs";
import MessageBubble from "./MessageBubble";
import MultipleChoice from "./MultipleChoice";
import AnswerPanel from "./AnswerPanel";
import SRSPanel from "./SRSPanel";
import TokenizedText from "./TokenizedText";
import AudioButton from "./AudioButton";
import GrammarBreakdown from "./GrammarBreakdown";
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
} from "lucide-react";
import { useHighlight } from "../highlight-context";

interface SavedConversation {
  messages: DisplayMessage[];
  completedAt: number;
}

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

  const [showSRS, setShowSRS] = useState(false);
  const [srsRefresh, setSrsRefresh] = useState(0);
  const [dueCount, setDueCount] = useState(0);

  const [aiFeedback, setAiFeedback] = useState<{
    isValid: boolean;
    feedback: string;
    grammarTip: string | null;
  } | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const [aiConversations, setAiConversations] = useState<Conversation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateLevel, setGenerateLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  const [tokenCache, setTokenCache] = useState<
    Record<string, KuromojiToken[]>
  >({});

  const [savedConversations, setSavedConversations] = useState<
    Record<string, SavedConversation>
  >({});
  const [replayId, setReplayId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nihongo-saved-conversations");
      if (saved) setSavedConversations(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    try {
      const aiSaved = localStorage.getItem("nihongo-ai-conversations");
      if (aiSaved) setAiConversations(JSON.parse(aiSaved));
    } catch {
      /* ignore */
    }
    setDueCount(getDueCards().length);
  }, []);

  const allConversations = [...conversations, ...aiConversations];

  const generateConversation = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/nihongo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: generateTopic || undefined,
          level: generateLevel,
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        const conv = data.conversation as Conversation;
        // Ensure unique ID
        conv.id = `ai-${Date.now()}`;
        const updated = [...aiConversations, conv];
        setAiConversations(updated);
        localStorage.setItem("nihongo-ai-conversations", JSON.stringify(updated));
        setShowGenerateForm(false);
        setGenerateTopic("");
      }
    } catch (error) {
      console.error("Generation failed:", error);
    }
    setIsGenerating(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          return data.tokens;
        }
      } catch {
        /* fallback */
      }
      return [];
    },
    [tokenCache],
  );

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

  const handleQuizAnswer = (choiceIdx: number) => {
    if (!currentConv) return;
    const exchange = currentConv.exchanges[exchangeIdx];
    setSelectedChoice(choiceIdx);
    setQuizCorrect(choiceIdx === exchange.correctChoiceIndex);
    setPhase("quiz_result");
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
    const exchange = currentConv.exchanges[exchangeIdx];
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

    // Fetch AI feedback in background
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

  const nextExchange = () => {
    if (!currentConv) return;
    const nextIdx = exchangeIdx + 1;
    if (nextIdx >= currentConv.exchanges.length) {
      const saved = {
        ...savedConversations,
        [currentConv.id]: { messages, completedAt: Date.now() },
      };
      setSavedConversations(saved);
      localStorage.setItem(
        "nihongo-saved-conversations",
        JSON.stringify(saved),
      );
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

  const handleAddToSRS = (word: string, reading: string, meaning: string) => {
    addCard(word, reading, meaning);
    setDueCount(getDueCards().length);
    setSrsRefresh((n) => n + 1);
  };

  const goBack = () => {
    setPhase("select");
    setCurrentConv(null);
    setReplayId(null);
    setMessages([]);
  };

  const startReplay = (convId: string) => {
    setReplayId(convId);
  };

  const getAllVocabulary = (): VocabWord[] => {
    if (!currentConv) return [];
    const vocab: VocabWord[] = [];
    for (let i = 0; i <= exchangeIdx; i++) {
      vocab.push(...currentConv.exchanges[i].vocabulary);
    }
    return vocab;
  };

  const currentExchange = currentConv?.exchanges[exchangeIdx];
  const vocabulary = getAllVocabulary();
  const progress = currentConv
    ? ((exchangeIdx + 1) / currentConv.exchanges.length) * 100
    : 0;

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
              onAddToSRS={handleAddToSRS}
            />
          ))}
        </div>
      </div>
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
                onClick={() => setShowSRS(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white hover:bg-white/30 transition-colors"
              >
                <BookOpen size={16} />
                SRS
                {dueCount > 0 && (
                  <span className="bg-orange-400 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold">
                    {dueCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

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
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["beginner", "intermediate", "advanced"] as const).map(
                        (lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setGenerateLevel(lvl)}
                            className={`py-2 rounded-xl text-sm font-bold transition-colors ${
                              generateLevel === lvl
                                ? lvl === "beginner"
                                  ? "bg-emerald-500 text-white"
                                  : lvl === "intermediate"
                                    ? "bg-amber-500 text-white"
                                    : "bg-rose-500 text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {lvl}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <button
                    onClick={generateConversation}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-extrabold disabled:opacity-60 disabled:cursor-not-allowed hover:from-violet-600 hover:to-purple-700 transition-all shadow-md shadow-violet-200"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {showSRS && (
            <SRSPanel
              onClose={() => setShowSRS(false)}
              refreshTrigger={srsRefresh}
            />
          )}
        </div>
      </div>
    );
  }

  // Active conversation
  return (
    <div className="min-h-screen flex flex-col bg-[#f0f0f0]">
      <header className="bg-white border-b-4 border-emerald-400 sticky top-0 z-40">
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
              onClick={() => setShowSRS(!showSRS)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 rounded-full text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <BookOpen size={14} />
              SRS
              {dueCount > 0 && (
                <span className="bg-orange-400 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold">
                  {dueCount}
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
                onAddToSRS={handleAddToSRS}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Interaction panel */}
          <div
            ref={interactionRef}
            className="border-t-2 border-gray-200 bg-white p-4 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
          >
            {phase === "reading" && (
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
                onAddToSRS={handleAddToSRS}
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
                            onAddToSRS={handleAddToSRS}
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
                  onAddToSRS={handleAddToSRS}
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
                  onAddToSRS={handleAddToSRS}
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
                      onAddToSRS={handleAddToSRS}
                      tokenCache={tokenCache}
                      onTokenized={handleTokenized}
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
                      onAddToSRS={handleAddToSRS}
                      tokenCache={tokenCache}
                      onTokenized={handleTokenized}
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
                  {exchangeIdx + 1 < (currentConv?.exchanges.length ?? 0)
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

        {showSRS && (
          <SRSPanel
            onClose={() => setShowSRS(false)}
            refreshTrigger={srsRefresh}
          />
        )}
      </div>
    </div>
  );
}
