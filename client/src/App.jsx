import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ChefHat, BarChart3 } from 'lucide-react';
import MenuPage from './pages/MenuPage';
import KitchenPage from './pages/KitchenPage';
import AnalyticsPage from './pages/AnalyticsPage';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-stone-900">
      <nav className="bg-stone-900/95 backdrop-blur-md text-white border-b border-stone-800 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">福</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-wider">LING'S</span>
            </Link>
            <div className="flex gap-2">
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                  location.pathname === '/'
                    ? 'bg-amber-500 text-stone-900'
                    : 'text-white hover:text-amber-500'
                }`}
              >
                <ShoppingBag size={16} />
                Menu
              </Link>
              <Link
                to="/kitchen"
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                  location.pathname === '/kitchen'
                    ? 'bg-amber-500 text-stone-900'
                    : 'text-white hover:text-amber-500'
                }`}
              >
                <ChefHat size={16} />
                Kitchen
              </Link>
              <Link
                to="/analytics"
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                  location.pathname === '/analytics'
                    ? 'bg-amber-500 text-stone-900'
                    : 'text-white hover:text-amber-500'
                }`}
              >
                <BarChart3 size={16} />
                Analytics
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>

      <footer className="bg-stone-950 text-stone-500 py-8 border-t border-stone-800">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm">
          <p>Chinese Takeaway Order System</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
