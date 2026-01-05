import Home from './pages/Home';
import Search from './pages/Search';
import Flashcards from './pages/Flashcards';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Search": Search,
    "Flashcards": Flashcards,
    "Profile": Profile,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};