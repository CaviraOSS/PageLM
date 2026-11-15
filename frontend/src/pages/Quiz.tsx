import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { quizStart, connectQuizStream, listSources, type QuizEvent, type QuizSettings, type SourceItem } from "../lib/api";
import TopicBar from "../components/Quiz/TopicBar";
import QuizHeader from "../components/Quiz/QuizHeader";
import QuestionCard from "../components/Quiz/QuestionCard";
import ResultsPanel from "../components/Quiz/ResultsPanel";
import ReviewModal from "../components/Quiz/ReviewModal";

const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  count: 10,
  difficulty: "medium",
  questionType: "mcq",
  language: "auto",
  hints: true,
  optionsCount: 4,
};

export type Question = { id: number; question: string; options: string[]; correct: number; hint: string; explanation: string; imageHtml?: string };
export type UA = { questionId: number; selectedAnswer: number; correct: boolean; question: string; selectedOption: string; correctOption: string; explanation: string };

function takeQuizArray(a: unknown): Question[] {
  if (Array.isArray(a)) return a as Question[];
  if (Array.isArray((a as any)?.quiz)) return (a as any).quiz as Question[];
  return [];
}

export default function Quiz() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const passedTopic = (location?.state && location.state.topic) || "";
  const initialTopic = search.get("topic") || passedTopic || "";
  const passedQuestions: Question[] | null = Array.isArray(location?.state?.questions)
    ? (location.state.questions as Question[])
    : null;
  const passedMode = location?.state?.mode === "qcm" ? "qcm" : "quiz";
  const examMode = passedMode === "qcm" || location?.state?.mode === "exam";
  const passedSourceId = typeof location?.state?.sourceId === "string" ? location.state.sourceId : "";

  const [topic, setTopic] = useState(initialTopic);
  const [qs, setQs] = useState<Question[]>(passedQuestions || []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<UA[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceId, setSourceId] = useState(passedSourceId || search.get("sourceId") || "");
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [error, setError] = useState("");
  const [activeSourceName, setActiveSourceName] = useState("");

  const [connecting, setConnecting] = useState(false);

  const closeRef = useRef<null | (() => void)>(null);
  const autoStartedRef = useRef(false);

  const total = qs.length;
  const q = qs[idx];

  const percentage = useMemo(() => (total ? Math.round((score / total) * 100) : 0), [score, total]);
  const resultVisual = useMemo(() => { if (percentage >= 90) return { msg: "Excellent! You have mastered this topic!", cls: "bg-green-900/20 border border-green-700 text-green-200", icon: "🏆" }; if (percentage >= 70) return { msg: "Great job! You have a solid understanding.", cls: "bg-blue-900/20 border border-blue-700 text-blue-200", icon: "🎉" }; if (percentage >= 50) return { msg: "Good effort! Review the concepts and try again.", cls: "bg-yellow-900/20 border border-yellow-700 text-yellow-200", icon: "📚" }; return { msg: "Keep studying! Practice makes perfect.", cls: "bg-red-900/20 border border-red-700 text-red-200", icon: "💪" }; }, [percentage]);

  useEffect(() => () => { if (closeRef.current) closeRef.current(); }, []);

  useEffect(() => {
    let alive = true;
    setSourcesLoading(true);
    listSources()
      .then((res) => { if (alive) setSources(res.sources || []); })
      .catch((e: any) => { if (alive) setError(e?.message || "تعذر تحميل المصادر"); })
      .finally(() => { if (alive) setSourcesLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (passedQuestions?.length || autoStartedRef.current) return;
    if (!initialTopic) return;
    autoStartedRef.current = true;
    start(initialTopic);
  }, [initialTopic, passedQuestions]);

  useEffect(() => {
    if (!sourceId) return;
    const src = sources.find((s) => s.id === sourceId);
    if (!src) return;
    setTopic((prev: string) => (prev.trim() ? prev : src.name.replace(/\.[^.]+$/, "")));
  }, [sources, sourceId]);

  function resetQuestionState() {
    setIdx(0);
    setSelected(null);
    setShowHint(false);
    setShowExp(false);
  }

  async function start(t: string) {
    const selectedSource = sources.find((s) => s.id === sourceId);
    const trimmed = t.trim() || String(selectedSource?.name || "").replace(/\.[^.]+$/, "").trim();
    if (!trimmed && !sourceId) {
      setError("اختر مصدرًا أو اكتب موضوعًا لبدء الاختبار.");
      return;
    }
    autoStartedRef.current = true;
    if (closeRef.current) closeRef.current();

    setError("");
    setActiveSourceName(selectedSource?.name || "");
    setQs([]);
    resetQuestionState();
    setScore(0);
    setDone(false);
    setAnswers([]);
    setConnecting(true);

    try {
      const s = await quizStart(trimmed, { ...settings, sourceId: sourceId || undefined });
      if (s.sourceName) setActiveSourceName(s.sourceName);
      const { close } = connectQuizStream(s.quizId, (ev: QuizEvent) => {
        if (ev.type === "quiz") {
          const arr = takeQuizArray(ev.quiz).map(q => ({
            ...q,
            correct: typeof q.correct === "number" ? Math.max(0, q.correct - 1) : 0
          }));
          setQs(arr);
          resetQuestionState();
          setConnecting(false);
        }
        if (ev.type === "error") {
          setError(ev.error || "تعذر توليد الاختبار");
          setConnecting(false);
        }
        if (ev.type === "done") {
          setConnecting(false);
        }
      });
      closeRef.current = close;

      const nextSource = sourceId || "";
      const sameTopic = search.get("topic") === trimmed;
      const sameSource = (search.get("sourceId") || "") === nextSource;
      if (!sameTopic || !sameSource) {
        const params = new URLSearchParams(search);
        if (trimmed) params.set("topic", trimmed);
        else params.delete("topic");
        if (nextSource) params.set("sourceId", nextSource);
        else params.delete("sourceId");
        navigate(`/quiz?${params.toString()}`, {
          replace: true,
          state: { topic: trimmed, sourceId: nextSource || undefined },
        });
      }
    } catch (e: any) {
      setError(e?.message || "تعذر بدء الاختبار");
      setConnecting(false);
    }
  }

  const onSelect = (i: number) => { if (!showExp) setSelected(i); };

  const advance = () => {
    if (idx === total - 1) setDone(true);
    else {
      setIdx(n => n + 1);
      setSelected(null);
      setShowHint(false);
      setShowExp(false);
    }
  };

  const onNext = () => {
    if (selected == null || !q) return;
    if (showExp) {
      advance();
      return;
    }
    const correct = selected === q.correct;
    const ua: UA = {
      questionId: q.id,
      selectedAnswer: selected,
      correct,
      question: q.question,
      selectedOption: q.options[selected],
      correctOption: q.options[q.correct],
      explanation: q.explanation,
    };
    setAnswers(a => [...a, ua]);
    if (correct) setScore(s => s + 1);
    if (examMode) {
      advance();
      return;
    }
    setShowExp(true);
  };

  const changeSource = (id: string) => {
    setSourceId(id);
    setError("");
    const src = sources.find((s) => s.id === id);
    if (src) setTopic(src.name.replace(/\.[^.]+$/, ""));
  };

  const patchSettings = (patch: Partial<QuizSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  };

  const newTopic = () => {
    setDone(false);
    setQs([]);
    setTopic("");
    setAnswers([]);
    resetQuestionState();
    setScore(0);
    setError("");
    setActiveSourceName("");
    const params = new URLSearchParams();
    if (sourceId) params.set("sourceId", sourceId);
    navigate(`/quiz${params.size ? `?${params.toString()}` : ""}`, {
      replace: true,
      state: { sourceId: sourceId || undefined },
    });
  };

  return (
    <div className="flex flex-col min-h-screen w-full pl-4 pr-4 md:pl-32">
      <div className="w-full max-w-4xl mx-auto p-4 pt-8 pb-24 my-auto">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={(passedSourceId || sourceId) ? `/studio?sourceId=${encodeURIComponent(passedSourceId || sourceId)}` : '/'}
              className="p-2 rounded-xl bg-stone-950 border border-zinc-800 hover:bg-stone-900 transition-colors"
              aria-label="Back">
              <svg viewBox="0 0 24 24" className="size-5 text-stone-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              {passedQuestions && examMode ? "اختبار · وضع الامتحان" : "اختبار"}
              {passedQuestions && (
                <span className="text-[11px] font-medium px-2 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300">
                  {passedQuestions.length} أسئلة
                </span>
              )}
            </h1>
          </div>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium">
            BETA
          </div>
        </div>

        {qs.length === 0 && !done && (
          <>
            {activeSourceName && !passedQuestions && (
              <div className="mb-3 flex items-center gap-2 text-xs text-stone-500" dir="auto">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                المصدر النشط: <span className="text-stone-300">{activeSourceName}</span>
              </div>
            )}
            <TopicBar
              value={topic}
              onChange={setTopic}
              onStart={() => start(topic)}
              phase="نبني اختبارك…"
              isLoading={connecting}
              sources={sources}
              sourcesLoading={sourcesLoading}
              sourceId={sourceId}
              onSourceChange={changeSource}
              settings={settings}
              onSettingsChange={patchSettings}
              error={error}
            />
          </>
        )}

        {qs.length > 0 && !done && q && (
          <>
            <QuizHeader topic={topic || "Quiz"} idx={idx} total={total} score={score} />
            <QuestionCard
              q={q}
              selected={selected}
              showExp={showExp}
              showHint={showHint}
              examMode={examMode}
              onSelect={onSelect}
              onHint={() => setShowHint(true)}
              onNext={onNext}
              isLast={idx === total - 1}
            />
          </>
        )}

        {done && (
          <ResultsPanel
            score={score}
            total={total}
            percentage={percentage}
            visual={resultVisual}
            answers={answers}
            onRetake={() => { resetQuestionState(); setScore(0); setDone(false); setAnswers([]); }}
            onReview={() => setReviewOpen(true)}
            onNewTopic={newTopic}
          />
        )}

        {reviewOpen && (
          <ReviewModal answers={answers} onClose={() => setReviewOpen(false)} />
        )}
      </div>
    </div>
  );
}