import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Search, Book, Home, User as UserIcon, LogIn, Menu, X, Shield, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();

  // Verificar se o usuário está logado
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await User.me();
        setIsLoggedIn(true);
        setUserRole(userData.role); // Set user role from API response
      } catch (error) {
        setIsLoggedIn(false);
        setUserRole(null); // Clear user role on error
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  const handleLogin = async () => {
    await User.login();
  };

  const handleLogout = async () => {
    await User.logout();
    setIsLoggedIn(false);
    setUserRole(null); // Clear user role on logout
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap');
        
        .logo-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .logo-img {
          max-height: 40px;
          height: auto;
          width: auto;
        }
        
        .logo-text {
          font-family: 'Poppins', sans-serif;
          font-weight: 700;
          font-size: 20px;
          color: #2563eb;
          text-decoration: none;
        }
        
        @media (max-width: 768px) {
          .logo-img {
            max-height: 32px;
          }
          .logo-text {
            font-size: 18px;
          }
        }
        
        @media (max-width: 480px) {
          .logo-img {
            max-height: 28px;
          }
          .logo-text {
            font-size: 16px;
          }
        }
      `}</style>
      
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="logo-wrapper">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b0c5c59ca_teste3.jpg" 
                alt="Logo Pinaglott" 
                className="logo-img" 
              />
              <span className="logo-text">Pinaglott</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link 
                to={createPageUrl("Home")} 
                className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                  isActive(createPageUrl("Home")) 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Home size={18} />
                <span>Início</span>
              </Link>
              
              <Link 
                to={createPageUrl("Search")} 
                className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                  isActive(createPageUrl("Search")) 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Search size={18} />
                <span>Pesquisar</span>
              </Link>

              {isLoggedIn && (
                <>
                  <Link 
                    to={createPageUrl("Flashcards")} 
                    className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                      isActive(createPageUrl("Flashcards")) 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Book size={18} />
                    <span>Meus Flashcards</span>
                  </Link>

                  <Link 
                    to={createPageUrl("Categories")} 
                    className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                      isActive(createPageUrl("Categories")) 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Layers size={18} />
                    <span>Categorias</span>
                  </Link>

                  <Link 
                    to={createPageUrl("Profile")} 
                    className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                      isActive(createPageUrl("Profile")) 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UserIcon size={18} />
                    <span>Perfil</span>
                  </Link>

                  {userRole === 'admin' && ( // Conditionally render Admin link for desktop
                    <Link 
                      to={createPageUrl("Admin")} 
                      className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                        isActive(createPageUrl("Admin")) 
                          ? "bg-blue-50 text-blue-600 font-medium" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Shield size={18} />
                      <span>Admin</span>
                    </Link>
                  )}
                </>
              )}
            </nav>

            <div className="hidden md:block">
              {!isLoading && (
                isLoggedIn ? (
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Sair
                  </Button>
                ) : (
                  <Button 
                    onClick={handleLogin}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <LogIn size={18} className="mr-2" />
                    Entrar
                  </Button>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-md">
          <div className="container mx-auto px-4 py-2">
            <nav className="flex flex-col space-y-1">
              <Link 
                to={createPageUrl("Home")} 
                className={`px-4 py-3 rounded-md flex items-center space-x-2 ${
                  isActive(createPageUrl("Home")) 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-gray-600"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Home size={20} />
                <span>Início</span>
              </Link>
              
              <Link 
                to={createPageUrl("Search")} 
                className={`px-4 py-3 rounded-md flex items-center space-x-2 ${
                  isActive(createPageUrl("Search")) 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-gray-600"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Search size={20} />
                <span>Pesquisar</span>
              </Link>

              {isLoggedIn && (
                <>
                  <Link 
                    to={createPageUrl("Flashcards")} 
                    className={`px-4 py-3 rounded-md flex items-center space-x-2 ${
                      isActive(createPageUrl("Flashcards")) 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-gray-600"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Book size={20} />
                    <span>Meus Flashcards</span>
                  </Link>

                  <Link 
                    to={createPageUrl("Categories")} 
                    className={`px-4 py-3 rounded-md flex items-center space-x-2 ${
                      isActive(createPageUrl("Categories")) 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-gray-600"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Layers size={20} />
                    <span>Categorias</span>
                  </Link>

                  <Link 
                    to={createPageUrl("Profile")} 
                    className={`px-4 py-3 rounded-md flex items-center space-x-2 ${
                      isActive(createPageUrl("Profile")) 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-gray-600"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserIcon size={20} />
                    <span>Perfil</span>
                  </Link>

                  {userRole === 'admin' && ( // Conditionally render Admin link for mobile
                    <Link 
                      to={createPageUrl("Admin")} 
                      className={`px-4 py-3 rounded-md flex items-center space-x-2 ${
                        isActive(createPageUrl("Admin")) 
                          ? "bg-blue-50 text-blue-600 font-medium" 
                          : "text-gray-600"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield size={20} />
                      <span>Admin</span>
                    </Link>
                  )}
                </>
              )}
              
              {!isLoading && (
                isLoggedIn ? (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="mt-2 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Sair
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      handleLogin();
                      setIsMenuOpen(false);
                    }}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <LogIn size={18} className="mr-2" />
                    Entrar
                  </Button>
                )
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-blue-100 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="logo-wrapper justify-center md:justify-start">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b0c5c59ca_teste3.jpg" 
                  alt="Logo Pinaglott" 
                  className="logo-img" 
                  style={{ maxHeight: '32px' }}
                />
                <span className="logo-text" style={{ fontSize: '18px' }}>Pinaglott</span>
              </div>
              <p className="text-gray-500 text-sm mt-2 text-center md:text-left">Aprenda idiomas de forma contextualizada e visual</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Pinaglott. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}