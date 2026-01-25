import Admin from './pages/Admin';
import Categories from './pages/Categories';
import Flashcards from './pages/Flashcards';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Search from './pages/Search';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Categories": Categories,
    "Flashcards": Flashcards,
    "Home": Home,
    "Profile": Profile,
    "Search": Search,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};