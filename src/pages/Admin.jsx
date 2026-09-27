import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Word } from "@/entities/Word";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, Calendar, BookOpen, Trophy,
  Loader2, Shield, Search, Filter,
  UserCheck, Crown, User as UserIcon,
  MoreHorizontal, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CategoryManager from '@/components/admin/CategoryManager';

export default function Admin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [userWords, setUserWords] = useState({});
  const [isResetting, setIsResetting] = useState(null); // user.id of resetting user

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      setIsLoading(true);
      try {
        const userData = await User.me();
        if (userData.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        await loadUsers();
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        navigate(createPageUrl("Home"));
      } finally {
        setIsLoading(false);
      }
    };
    checkAdminAndLoadData();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      const allUsers = await User.list("-created_date");
      setUsers(allUsers);
      
      const wordsPromises = allUsers.map(user => Word.filter({ created_by: user.email }));
      const allWordsByUser = await Promise.all(wordsPromises);
      
      const wordsMap = allUsers.reduce((acc, user, index) => {
        acc[user.id] = allWordsByUser[index] || [];
        return acc;
      }, {});
      
      setUserWords(wordsMap);
    } catch (error) {
      console.error("Erro ao carregar usuários e palavras:", error);
    }
  };

  useEffect(() => {
    let filtered = [...users];
    
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterBy !== "all") {
      filtered = filtered.filter(user => {
        const words = userWords[user.id] || [];
        switch (filterBy) {
          case "active": return words.length > 0;
          case "inactive": return words.length === 0;
          case "admin": return user.role === 'admin';
          default: return true;
        }
      });
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_date) - new Date(a.created_date);
        case "oldest": return new Date(a.created_date) - new Date(b.created_date);
        case "name": return (a.full_name || "").localeCompare(b.full_name || "");
        case "words": return (userWords[b.id]?.length || 0) - (userWords[a.id]?.length || 0);
        default: return 0;
      }
    });
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, sortBy, filterBy, userWords]);

  const getUserStats = (user) => {
    const words = userWords[user.id] || [];
    return {
      totalWords: words.length,
      masteredWords: words.filter(w => (w.mastery_level || 0) === 5).length,
      joinDate: user.created_date ? format(new Date(user.created_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A",
      level: user.level || "beginner",
      studyStreak: user.study_streak || 0
    };
  };

  const handleResetMasteredWords = async (userToReset) => {
    setIsResetting(userToReset.id);
    try {
      const wordsToReset = await Word.filter({ 
        created_by: userToReset.email, 
        mastery_level: 5 
      });

      if (wordsToReset.length > 0) {
        const updatePromises = wordsToReset.map(word => 
          Word.update(word.id, { mastery_level: 0 })
        );
        await Promise.all(updatePromises);
      }
      await loadUsers(); // Recarrega os dados para atualizar a UI
    } catch (error) {
      console.error("Erro ao resetar palavras dominadas:", error);
    } finally {
      setIsResetting(null);
    }
  };

  const getLevelLabel = (level) => ({
    'beginner': 'Iniciante',
    'intermediate': 'Intermediário',
    'advanced': 'Avançado'
  }[level] || 'Iniciante');

  const getPlanBadge = (user) => (
    <Badge className={user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}>
      {user.role === 'admin' ? <Crown className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
      {user.role === 'admin' ? 'Admin' : 'Gratuito'}
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Painel Administrativo</h1>
        </div>
        <p className="text-gray-600 mb-8">Gerencie usuários e monitore o uso da plataforma</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Cards de Estatísticas */}
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full"><Users className="w-6 h-6 text-blue-600" /></div>
              <div>
                <h3 className="text-2xl font-bold">{users.length}</h3>
                <p className="text-gray-500 text-sm">Total de usuários</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full"><UserCheck className="w-6 h-6 text-green-600" /></div>
              <div>
                <h3 className="text-2xl font-bold">{Object.values(userWords).filter(w => w.length > 0).length}</h3>
                <p className="text-gray-500 text-sm">Usuários ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full"><BookOpen className="w-6 h-6 text-yellow-600" /></div>
              <div>
                <h3 className="text-2xl font-bold">{Object.values(userWords).reduce((sum, words) => sum + words.length, 0)}</h3>
                <p className="text-gray-500 text-sm">Total de flashcards</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full"><Shield className="w-6 h-6 text-purple-600" /></div>
              <div>
                <h3 className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</h3>
                <p className="text-gray-500 text-sm">Administradores</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários Registrados</CardTitle>
            <CardDescription>Gerencie e monitore todos os usuários da plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Buscar por nome ou email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
              </div>
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-full sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigos</SelectItem>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                  <SelectItem value="words">Mais flashcards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                    <TableHead className="hidden sm:table-cell">Nível</TableHead>
                    <TableHead>Flashcards</TableHead>
                    <TableHead className="hidden lg:table-cell">Dominados</TableHead>
                    <TableHead className="hidden lg:table-cell">Sequência</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const stats = getUserStats(user);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || "Sem nome"}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{stats.joinDate}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{getLevelLabel(stats.level)}</Badge></TableCell>
                        <TableCell><span className="font-medium">{stats.totalWords}</span></TableCell>
                        <TableCell className="hidden lg:table-cell"><span className="text-green-600 font-medium">{stats.masteredWords}</span></TableCell>
                        <TableCell className="hidden lg:table-cell"><div className="flex items-center gap-1"><Trophy className="w-4 h-4 text-yellow-500" /><span>{stats.studyStreak}</span></div></TableCell>
                        <TableCell>{getPlanBadge(user)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isResetting === user.id}>
                                {isResetting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={stats.masteredWords === 0}>
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    <span>Resetar Dominadas</span>
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Reset</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Isso irá resetar o nível de todas as {stats.masteredWords} palavras dominadas por <strong>{user.full_name || user.email}</strong>. A ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleResetMasteredWords(user)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredUsers.length === 0 && <div className="text-center py-8"><p className="text-gray-500">Nenhum usuário encontrado.</p></div>}
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Categorias e Flashcards</CardTitle>
            <CardDescription>
              Gerencie as categorias de estudo e as palavras pré-cadastradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}