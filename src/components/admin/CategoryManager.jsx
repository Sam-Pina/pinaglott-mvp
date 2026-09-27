import React, { useState, useEffect } from "react";
import { Category } from "@/entities/Category";
import { CategoryCard } from "@/entities/CategoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, ChevronRight, ArrowLeft } from "lucide-react";

const EMPTY_CATEGORY = { name: "", slug: "", description: "", icon: "📚", image_url: "", active: true, order: 0, language: "en" };
const EMPTY_CARD = { word: "", translation: "", example: "", example_translation: "", image_url: "", language: "en", translation_language: "pt" };

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cards, setCards] = useState([]);

  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState(EMPTY_CATEGORY);

  const [cardDialog, setCardDialog] = useState(false);
  const [cardForm, setCardForm] = useState(EMPTY_CARD);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const list = await Category.list("order");
    setCategories(list);
    setLoading(false);
  };

  const loadCards = async (slug) => {
    const list = await CategoryCard.filter({ category_slug: slug });
    setCards(list);
  };

  const openCategory = (cat) => {
    setSelected(cat);
    loadCards(cat.slug);
  };

  const saveCategory = async () => {
    const { id, created_date, updated_date, created_by, created_by_id, ...rest } = catForm;
    const payload = { ...rest, slug: catForm.slug || slugify(catForm.name) };
    if (id) {
      await Category.update(id, payload);
    } else {
      await Category.create(payload);
    }
    setCatDialog(false);
    setCatForm(EMPTY_CATEGORY);
    await loadCategories();
  };

  const toggleActive = async (cat) => {
    await Category.update(cat.id, { active: !cat.active });
    await loadCategories();
  };

  const deleteCategory = async (cat) => {
    await Category.delete(cat.id);
    await loadCategories();
  };

  const saveCard = async () => {
    const { id, created_date, updated_date, created_by, created_by_id, ...rest } = cardForm;
    if (id) {
      await CategoryCard.update(id, rest);
    } else {
      await CategoryCard.create({ ...rest, category_slug: selected.slug });
    }
    setCardDialog(false);
    setCardForm(EMPTY_CARD);
    await loadCards(selected.slug);
  };

  const deleteCard = async (card) => {
    await CategoryCard.delete(card.id);
    await loadCards(selected.slug);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Gerenciar flashcards de uma categoria
  if (selected) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => setSelected(null)} className="border-gray-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setCardForm(EMPTY_CARD);
              setCardDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nova palavra
          </Button>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {selected.icon} {selected.name} — {cards.length} palavras
        </h3>
        <div className="space-y-2">
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <span className="font-medium">{card.word}</span>
                <span className="text-gray-500"> — {card.translation}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCardForm(card);
                    setCardDialog(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteCard(card)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-gray-500 text-center py-6">Nenhuma palavra nesta categoria.</p>
          )}
        </div>

        <Dialog open={cardDialog} onOpenChange={setCardDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{cardForm.id ? "Editar palavra" : "Nova palavra"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <Input placeholder="Palavra" value={cardForm.word} onChange={(e) => setCardForm({ ...cardForm, word: e.target.value })} />
              <Input placeholder="Tradução" value={cardForm.translation} onChange={(e) => setCardForm({ ...cardForm, translation: e.target.value })} />
              <Input placeholder="Exemplo" value={cardForm.example} onChange={(e) => setCardForm({ ...cardForm, example: e.target.value })} />
              <Input placeholder="Tradução do exemplo" value={cardForm.example_translation} onChange={(e) => setCardForm({ ...cardForm, example_translation: e.target.value })} />
              <Input placeholder="URL da imagem" value={cardForm.image_url} onChange={(e) => setCardForm({ ...cardForm, image_url: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCardDialog(false)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveCard} disabled={!cardForm.word || !cardForm.translation}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Lista de categorias
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setCatForm(EMPTY_CATEGORY);
            setCatDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova categoria
        </Button>
      </div>
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <p className="font-medium text-gray-800">{cat.name}</p>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={cat.active} onCheckedChange={() => toggleActive(cat)} />
              <Button variant="ghost" size="sm" onClick={() => openCategory(cat)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCatForm(cat);
                  setCatDialog(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteCategory(cat)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{catForm.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input placeholder="Nome" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            <Input placeholder="Descrição" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            <Input placeholder="Ícone (emoji)" value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} />
            <Input placeholder="URL da imagem de capa" value={catForm.image_url} onChange={(e) => setCatForm({ ...catForm, image_url: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveCategory} disabled={!catForm.name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}