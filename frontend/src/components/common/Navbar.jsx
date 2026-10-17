import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Video,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  History,
  Clock,
  ThumbsUp,
  Tv,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { resolveMediaUrl } from '../../utils/formatters';

const Navbar = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    addToast('Signed out successfully', 'info');
    navigate('/');
  };

  const channelPath = user?.channel?._id ? `/channel/${user.channel._id}` : '/profile';

  return (
    <nav className="sticky top-0 z-50 h-14 bg-white dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-[#222222] px-3 sm:px-4 flex items-center justify-between flex-nowrap transition-colors shadow-2xs">
      {/* Left: Sidebar Hamburger & Logo */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-700 dark:text-gray-200 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-red-400 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <svg
              className="w-4 h-4 text-white fill-current ml-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:inline-block text-gray-900 dark:text-white">
            Vid<span className="text-brand-500">Sphere</span>
          </span>
        </Link>
      </div>

      {/* Middle: Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex-1 max-w-xl mx-2 sm:mx-6 flex items-center min-w-0"
      >
        <div className="relative w-full flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos, topics, channels..."
            className="w-full h-10 pl-4 pr-10 rounded-l-full border border-gray-300 dark:border-[#303030] bg-gray-50 dark:bg-[#121212] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-500 dark:focus:border-brand-500 focus:bg-white dark:focus:bg-[#181818] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="h-10 px-5 rounded-r-full bg-gray-100 dark:bg-[#222222] border border-l-0 border-gray-300 dark:border-[#303030] hover:bg-gray-200 dark:hover:bg-[#2b2b2b] text-gray-600 dark:text-gray-300 transition flex items-center justify-center shrink-0"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Color Theme"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-600 dark:text-gray-300 transition"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>

        {isAuthenticated ? (
          <>
            {/* Create Video Button */}
            <Link
              to="/upload"
              className="hidden sm:flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 text-sm font-medium px-3.5 py-1.5 rounded-full transition"
            >
              <Plus className="w-4 h-4 text-brand-500" />
              <span>Create</span>
            </Link>

            {/* Mobile upload button */}
            <Link
              to="/upload"
              aria-label="Upload Video"
              className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-700 dark:text-gray-200 transition"
            >
              <Plus className="w-5 h-5 text-brand-500" />
            </Link>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-brand-500/50 transition focus:outline-none"
              >
                <img
                  src={resolveMediaUrl(user.avatar)}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d2d2d] py-2 text-sm z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2d2d2d] flex items-center gap-3">
                    <img
                      src={resolveMediaUrl(user.avatar)}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                    />
                    <div className="overflow-hidden">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.channel?.name || user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{user.channel?.handle || user.username}
                      </p>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to={channelPath}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                    >
                      <Tv className="w-4 h-4 text-gray-500" />
                      <span>Your Channel</span>
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                    >
                      <History className="w-4 h-4 text-gray-500" />
                      <span>History</span>
                    </Link>
                    <Link
                      to="/watch-later"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                    >
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Watch Later</span>
                    </Link>
                    <Link
                      to="/liked"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                    >
                      <ThumbsUp className="w-4 h-4 text-gray-500" />
                      <span>Liked Videos</span>
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span>Account Settings</span>
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 dark:border-[#2d2d2d] pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 border border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 px-3.5 py-1.5 rounded-full text-sm font-semibold transition"
          >
            <User className="w-4 h-4" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
