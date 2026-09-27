import React, { useState } from "react";
import { Gamepad2, Volume2, Grid3x3, Languages, Flame, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import QuePalavraEessa from "@/components/games/QuePalavraEessa";
import CacaPalavras from "@/components/games/CacaPalavras";
import QualATraducao from "@/components/games/QualATraducao";
import { useProgress, getLevelInfo } from "@/lib/gamification";

const GAMES = [
  {
    id: "listen",
    title: "Que palavra é essa?",
    description: "Ouça a pronúncia e escolha a palavra correta.",
    icon: Volume2,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "wordsearch",
    title: "Caça-palavras",
    description: "Encontre as palavras escondidas na grade.",
    icon: Grid3x3,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "translation",
    title: "Qual é a tradução?",
    description: "Escolha a tradução correta da palavra.",
    icon: Languages,
    color: "bg-purple-100 text-purple-600",
  },
];

export default function Jogos() {
  const [activeGame, setActiveGame] = useState(null);
  const { progress, reload } = useProgress();
  const xp = progress?.xp || 0;
  const info = getLevelInfo(xp);

  const exitGame = () => {
    setActiveGame(null);
    reload();
  };

  if (activeGame === "listen") return <QuePalavraEessa onExit={exitGame} />;
  if (activeGame === "wordsearch") return <CacaPalavras onExit={exitGame} />;
  if (activeGame === "translation") return <QualATraducao onExit={exitGame} />;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Gamepad2 className="w-10 h-10 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Jogos</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Pratique o vocabulário de forma divertida e ganhe XP a cada partida.
          </p>
        </div>

        <Card className="mb-8 border-blue-100">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Nível {info.level}</p>
                  <p className="text-xs text-gray-500">{xp} XP</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full self-start">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">
                  {progress?.streak || 0} {(progress?.streak || 0) === 1 ? "dia" : "dias"}
                </span>
              </div>
            </div>
            <Progress value={info.progress} className="h-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <Card
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <CardHeader>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${game.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-xl">{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-blue-600">Jogar agora →</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}