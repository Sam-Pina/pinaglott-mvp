import React, { useEffect, useState } from "react";
import { CategoryCard } from "@/entities/CategoryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { recordProgress, XP_REWARDS } from "@/lib/gamification";

const TOTAL = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QualATraducao({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    build();
  }, []);

  const build = async () => {
    setLoading(true);
    const all = await CategoryCard.filter({ language: "en" });
    const pool = all.filter((c) => c.word && c.translation);

    const byCategory = {};
    pool.forEach((c) => {
      byCategory[c.category_slug] = byCategory[c.category_slug] || [];
      byCategory[c.category_slug].push(c);
    });

    const chosen = shuffle(pool).slice(0, TOTAL);
    const qs = chosen.map((c) => {
      let distractorPool = (byCategory[c.category_slug] || []).filter((p) => p.translation !== c.translation);
      if (distractorPool.length < 3) distractorPool = pool.filter((p) => p.translation !== c.translation);
      const distractors = shuffle(distractorPool).slice(0, 3);
      return { answer: c, options: shuffle([c, ...distractors]) };
    });
    setQuestions(qs);
    setLoading(false);
  };

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option);
    if (option.translation === questions[index].answer.translation) setScore((s) => s + 1);
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
            Você acertou {score} de {questions.length} traduções e ganhou{" "}
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
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{current.answer.word}</h2>
            <p className="text-gray-500">Qual é a tradução?</p>
            {selected && current.answer.image_url && (
              <img
                src={current.answer.image_url}
                alt={current.answer.word}
                className="mt-4 mx-auto w-40 h-40 object-cover rounded-xl border border-gray-100"
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((option) => {
            const isCorrect = option.translation === current.answer.translation;
            const isSelected = selected && option.translation === selected.translation;
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
                {option.translation}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-1">
              Resposta correta: <span className="font-semibold">{current.answer.translation}</span>
            </p>
            <Button className="mt-3 bg-blue-600 hover:bg-blue-700" onClick={handleNext}>
              {index < questions.length - 1 ? "Continuar" : "Finalizar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}