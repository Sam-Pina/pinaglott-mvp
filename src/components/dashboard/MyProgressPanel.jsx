import React from "react";
import { Flame, Trophy, Gamepad2, BookOpen, Layers, Target, Award, Lock, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useProgress, getLevelInfo, ACHIEVEMENTS } from "@/lib/gamification";

const ICONS = { Award, Layers, BookOpen, Gamepad2, Trophy, Flame };

export default function MyProgressPanel() {
  const { progress } = useProgress();
  const xp = progress?.xp || 0;
  const info = getLevelInfo(xp);
  const accuracy = progress?.total_answers
    ? Math.round((progress.correct_answers / progress.total_answers) * 100)
    : 0;
  const unlocked = new Set(progress?.achievements || []);

  const stats = [
    { label: "Categorias concluídas", value: progress?.categories_completed || 0, icon: Layers, color: "text-indigo-600 bg-indigo-100" },
    { label: "Flashcards estudados", value: progress?.flashcards_studied || 0, icon: BookOpen, color: "text-blue-600 bg-blue-100" },
    { label: "Jogos realizados", value: progress?.games_played || 0, icon: Gamepad2, color: "text-purple-600 bg-purple-100" },
    { label: "Percentual de acertos", value: `${accuracy}%`, icon: Target, color: "text-green-600 bg-green-100" },
  ];

  return (
    <div>
      <Card className="mb-6 border-blue-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Nível {info.level}</h3>
                <p className="text-sm text-gray-500">{xp} XP acumulados</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-600">
                {progress?.streak || 0} {(progress?.streak || 0) === 1 ? "dia" : "dias"}
              </span>
            </div>
          </div>
          <Progress value={info.progress} className="h-2 mb-2" />
          <p className="text-xs text-gray-500">
            {info.nextBase
              ? `${info.xpInLevel} / ${info.xpForNext} XP para o nível ${info.level + 1}`
              : "Nível máximo alcançado!"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h3 className="text-lg font-medium mb-4">Conquistas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENTS.map((a) => {
          const Icon = ICONS[a.icon] || Award;
          const done = unlocked.has(a.key);
          return (
            <Card key={a.key} className={done ? "border-green-200 bg-green-50" : "opacity-70"}>
              <CardContent className="p-4 flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${done ? "bg-green-100" : "bg-gray-100"}`}>
                  {done ? <Icon className="w-6 h-6 text-green-600" /> : <Lock className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{a.title}</h4>
                    {done && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <p className="text-sm text-gray-500">{a.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}