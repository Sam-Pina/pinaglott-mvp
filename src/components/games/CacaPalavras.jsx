import React, { useEffect, useState } from "react";
import { CategoryCard } from "@/entities/CategoryCard";
import { Category } from "@/entities/Category";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { recordProgress, XP_REWARDS } from "@/lib/gamification";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
];

function buildGrid(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placements = [];

  words.forEach((raw) => {
    const w = raw.toUpperCase().replace(/[^A-Z]/g, "");
    if (!w || w.length > size) return;
    let placed = false;
    let tries = 0;
    while (!placed && tries < 300) {
      tries++;
      const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const endR = r + dr * (w.length - 1);
      const endC = c + dc * (w.length - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        if (grid[rr][cc] && grid[rr][cc] !== w[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < w.length; i++) {
        grid[r + dr * i][c + dc * i] = w[i];
      }
      placements.push(w);
      placed = true;
    }
  });

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(Math.random() * 26)];
    }
  }
  return { grid, placements };
}

export default function CacaPalavras({ onExit }) {
  const [categories, setCategories] = useState([]);
  const [categorySlug, setCategorySlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [found, setFound] = useState([]);
  const [selected, setSelected] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await Category.filter({ active: true }, "order");
    setCategories(cats);
    setLoading(false);
  };

  const startGame = async (slug) => {
    setBuilding(true);
    setCategorySlug(slug);
    const cards = await CategoryCard.filter({ category_slug: slug, language: "en" });
    const picked = cards.slice(0, 10);
    const size = Math.max(
      12,
      ...picked.map((c) => c.word.replace(/[^A-Za-z]/g, "").length + 1)
    );
    const { grid: g, placements } = buildGrid(picked.map((c) => c.word), Math.min(size, 14));
    setGrid(g);
    setWords(placements);
    setFound([]);
    setSelected([]);
    setDone(false);
    setBuilding(false);
  };

  const cellKey = (r, c) => `${r}-${c}`;
  const foundCells = new Set(found.flatMap((f) => f.cells));

  const handleCellClick = (r, c) => {
    if (done) return;
    if (selected.length === 0) {
      setSelected([{ r, c }]);
      return;
    }
    if (selected.length === 1) {
      const start = selected[0];
      const dr = Math.sign(r - start.r);
      const dc = Math.sign(c - start.c);
      const isLine =
        start.r === r || start.c === c || Math.abs(r - start.r) === Math.abs(c - start.c);
      if (!isLine) {
        setSelected([{ r, c }]);
        return;
      }
      const len = Math.max(Math.abs(r - start.r), Math.abs(c - start.c)) + 1;
      let text = "";
      const cells = [];
      for (let i = 0; i < len; i++) {
        const rr = start.r + dr * i;
        const cc = start.c + dc * i;
        text += grid[rr][cc];
        cells.push(cellKey(rr, cc));
      }
      const reversed = text.split("").reverse().join("");
      const match = words.find(
        (w) =>
          !found.some((f) => f.word === w) &&
          (w === text || w === reversed)
      );
      if (match) {
        const newFound = [...found, { word: match, cells }];
        setFound(newFound);
        setSelected([]);
        if (newFound.length === words.length) {
          setDone(true);
          recordProgress({
            xp: XP_REWARDS.gameComplete + newFound.length * XP_REWARDS.flashcard,
            games: 1,
          });
        }
      } else {
        setSelected([{ r, c }]);
      }
      return;
    }
    setSelected([{ r, c }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onExit} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Sair
          </Button>
          {grid && (
            <Badge variant="outline">
              {found.length} / {words.length} palavras encontradas
            </Badge>
          )}
        </div>

        {!grid && (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Escolha uma categoria
              </h2>
              <Select value={categorySlug} onValueChange={startGame}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug} className="text-base">
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {building && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          </div>
        )}

        {grid && !building && (
          <>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {words.map((w) => (
                <span
                  key={w}
                  className={`text-sm px-2 py-1 rounded-md ${
                    found.some((f) => f.word === w)
                      ? "bg-green-100 text-green-700 line-through"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>

            <div className="overflow-x-auto pb-2">
              <div
                className="grid gap-1 mx-auto"
                style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))`, maxWidth: "560px" }}
              >
                {grid.map((row, r) =>
                  row.map((letter, c) => {
                    const isFound = foundCells.has(cellKey(r, c));
                    const isSelected =
                      selected.length === 2 &&
                      selected.some((s) => s.r === r && s.c === c);
                    const isStart =
                      selected.length === 1 && selected[0].r === r && selected[0].c === c;
                    return (
                      <button
                        key={cellKey(r, c)}
                        onClick={() => handleCellClick(r, c)}
                        className={`aspect-square flex items-center justify-center rounded-md text-sm sm:text-base font-semibold transition-colors ${
                          isFound
                            ? "bg-green-500 text-white"
                            : isStart || isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-gray-50 text-gray-700 hover:bg-blue-100"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {done && (
              <div className="text-center mt-6">
                <div className="text-5xl mb-2">🏆</div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Parabéns! Você encontrou todas as palavras!
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={onExit} className="border-gray-200">
                    Voltar aos jogos
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => startGame(categorySlug)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Jogar de novo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}