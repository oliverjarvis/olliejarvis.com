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
} from "lucide-react";

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

export default function Game() {
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
    setDueCount(getDueCards().length);
  }, []);

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

  const submitAnswer = (answer: string) => {
    if (!currentConv) return;
    const exchange = currentConv.exchanges[exchangeIdx];
    setUserAnswer(answer);
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
    const conv = conversations.find((c) => c.id === replayId);
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
            <h1 className="font-extrabold text-lg text-gray-800">
              {conv.title}
            </h1>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Replay
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

  // Select screen
  if (phase === "select") {
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
        </header>

        <div className="flex flex-1">
          <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
            <p className="text-gray-500 mb-6 font-medium">
              Practice Japanese through conversations. Tap a conversation to
              begin!
            </p>

            <div className="space-y-4">
              {conversations.map((conv, idx) => {
                const isSaved = !!savedConversations[conv.id];
                const colors = LEVEL_COLORS[conv.level];
                const cardColors = [
                  "from-sky-400 to-blue-500",
                  "from-purple-400 to-indigo-500",
                  "from-orange-400 to-rose-500",
                ];

                return (
                  <div
                    key={conv.id}
                    className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-gray-100 hover:shadow-lg transition-shadow"
                  >
                    <div
                      className={`bg-gradient-to-r ${cardColors[idx % cardColors.length]} p-4 text-white`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-xl">
                            {conv.title}
                          </h3>
                          <p className="text-white/80 text-sm font-medium">
                            {conv.titleEn}
                          </p>
                        </div>
                        {isSaved && (
                          <div className="bg-white/20 rounded-full p-2">
                            <Trophy size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${colors.badge}`}
                        >
                          {conv.level}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {conv.exchanges.length} exchanges
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        <span className="font-semibold text-gray-700">
                          {conv.speaker}
                        </span>{" "}
                        &mdash; {conv.speakerDescription}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startConversation(conv)}
                          className="flex-1 flex items-center justify-center gap-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                        >
                          {isSaved ? "Restart" : "Start"}
                          <ChevronRight size={16} />
                        </button>
                        {isSaved && (
                          <button
                            onClick={() => startReplay(conv.id)}
                            className="flex items-center gap-1 px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <RotateCcw size={14} />
                            Replay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
              <h1 className="font-extrabold text-lg text-gray-800">
                {currentConv?.title}
              </h1>
              <p className="text-xs text-gray-400 font-semibold">
                {currentConv?.speaker} &middot; {exchangeIdx + 1}/
                {currentConv?.exchanges.length}
              </p>
            </div>
          </div>
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
                </div>
                {userAnswer === currentExchange.suggestedAnswer ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                    <div className="p-1.5 bg-emerald-500 rounded-full">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <span className="font-extrabold text-emerald-700">
                      Perfect match!
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-sm text-amber-700 font-medium">
                    Compare your answer with the suggested one. Both may be
                    correct &mdash; there are many ways to express the same idea
                    in Japanese!
                  </div>
                )}
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
