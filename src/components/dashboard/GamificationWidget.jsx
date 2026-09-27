import React from "react";
import { Link } from "react-router-dom";
import { Flame, Trophy, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useProgress, getLevelInfo } from "@/lib/gamification";

export default function GamificationWidget() {
  const { progress } = useProgress();
  const xp = progress?.xp || 0;
  const info = getLevelInfo(xp);
  const streak = progress?.streak || 0;

  return (
    <Card className="border-blue-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Nível {info.level}</p>
              <p className="text-xs text-gray-500">{xp} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-600">
              {streak} {streak === 1 ? "dia" : "dias"}
            </span>
          </div>
        </div>

        <Progress value={info.progress} className="h-2 mb-2" />
        <p className="text-xs text-gray-500 mb-4">
          {info.nextBase
            ? `${info.xpInLevel} / ${info.xpForNext} XP para o nível ${info.level + 1}`
            : "Nível máximo alcançado!"}
        </p>

        <Link to="/Jogos">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Gamepad2 className="w-4 h-4 mr-2" />
            Jogar agora
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}