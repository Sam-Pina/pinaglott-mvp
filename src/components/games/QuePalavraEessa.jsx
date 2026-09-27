import React, { useEffect, useState } from "react";
import { CategoryCard } from "@/entities/CategoryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, Loader2, RotateCcw } from "lucide-react";
import { recordProgress, XP_REWARDS } from "@/lib/gamification";

const LANG_MAP = { en: "en-US", es: "es-ES", fr: "fr-FR", pt: "pt-BR" };
const TOTAL = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text, lang = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_MAP[lang] || "en-US";
  u.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang.startsWith((lang || "en").slice(0, 2)));
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

export default function QuePalavraEessa({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(true);

  useEffect(() => {
    build();
  }, []);

  useEffect(() => {
    if (!finished && questions[index] && speechAvailable) {
      const t = setTimeout(() => speak(questions[index].answer.word, "en"), 350);
      return () => clearTimeout(t);
    }
  }, [index, questions, finished, speechAvailable]);

  const build = async () => {
    setLoading(true);
    const all = await CategoryCard.filter({ language: "en" });
    const pool = all.filter((c) => c.word);
    const chosen = shuffle(pool).slice(0, TOTAL);
    const qs = chosen.map((c) => {
      const distractors = shuffle(pool.filter((p) => p.word !== c.word)).slice(0, 3);
      return { answer: c, options: shuffle([c, ...distractors]) };
    });
    setQuestions(qs);
    setSpeechAvailable(typeof window !== "undefined" && !!window.speechSynthesis);
    setLoading(false);
  };

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option);
    if (option.word === questions[index].answer.word) setScore((s) => s + 1);
  };

  const handleNext = async () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
      await recordProgress({
        xp: score * XP_REWARDS.correctAnswer + XP_REWARDS.gameComplete,
        games: 1,
        correct: score,
        total: questions.length,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const current = questions[index];

  if (finished) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-xl text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Jogo concluído!</h1>
          <p className="text-gray-600 mb-6">
            Você acertou {score} de {questions.length} palavras e ganhou{" "}
            {score * XP_REWARDS.correctAnswer + XP_REWARDS.gameComplete} XP.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={onExit} className="border-gray-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar aos jogos
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setIndex(0);
                setSelected(null);
                setScore(0);
                setFinished(false);
                build();
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Jogar de novo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onExit} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Sair
          </Button>
          <Badge variant="outline">Pergunta {index + 1} de {questions.length}</Badge>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            {speechAvailable ? (
              <>
                <button
                  onClick={() => speak(current.answer.word, "en")}
                  className="w-24 h-24 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors flex items-center justify-center mx-auto mb-4"
                >
                  <Volume2 className="w-12 h-12 text-blue-600" />
                </button>
                <p className="text-gray-600">Toque para ouvir novamente</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{current.answer.word}</h2>
                <p className="text-sm text-orange-600">
                  O áudio não está disponível neste navegador.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((option) => {
            const isCorrect = option.word === current.answer.word;
            const isSelected = selected && option.word === selected.word;
            let cls = "border-gray-200 hover:bg-blue-50";
            if (selected) {
              if (isCorrect) cls = "border-green-400 bg-green-50 text-green-700";
              else if (isSelected) cls = "border-red-400 bg-red-50 text-red-700";
              else cls = "border-gray-200 opacity-60";
            }
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                disabled={!!selected}
                className={`p-4 rounded-xl border text-lg font-medium transition-colors ${cls}`}
              >
                {option.word}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-1">
              <span className="font-semibold">{current.answer.word}</span> ={" "}
              {current.answer.translation}
            </p>
            <Button className="mt-3 bg-blue-600 hover:bg-blue-700" onClick={handleNext}>
              {index < questions.length - 1 ? "Próxima" : "Finalizar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}