import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Tv,
  History,
  Clock,
  ThumbsUp,
  User,
  Settings,
  HelpCircle,
  TrendingUp,
  Flame,
  Music,
  Gamepad2,
  Code,
  Layers3,
  WalletCards,
  Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { channelService } from '../../services/api';
import { resolveMediaUrl } from '../../utils/formatters';

const Sidebar = ({ isOpen, isMobile, onCloseMobile }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      channelService
        .getMySubscriptions()
        .then((res) => {
          if (res.data?.subscriptions) {
            setSubscriptions(res.data.subscriptions);
          }
        })
        .catch(() => {});
    } else {
      setSubscriptions([]);
    }
  }, [isAuthenticated]);

  const navClass = ({ isActive }) =>
    `flex items-center gap-4 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
      isActive
        ? 'bg-gray-100 dark:bg-[#272727] text-gray-900 dark:text-white font-semibold'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1f1f1f]'
    }`;

  const compactNavClass = ({ isActive }) =>
    `flex flex-col items-center justify-center py-3 px-1 rounded-xl text-[10px] font-medium transition ${
      isActive
        ? 'text-brand-500 font-bold'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
    }`;

  // If mobile overlay
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-out Drawer */}
        <div className="relative w-64 max-w-xs bg-white dark:bg-[#0f0f0f] h-full shadow-2xl overflow-y-auto p-3 flex flex-col z-10 border-r border-gray-200 dark:border-[#222222]">
          <div className="p-3 mb-2 flex items-center gap-2 border-b border-gray-200 dark:border-[#222222]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-red-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="font-bold text-base text-gray-900 dark:text-white">
              Vid<span className="text-brand-500">Sphere</span>
            </span>
          </div>

          <div className="space-y-1">
            <NavLink to="/" onClick={onCloseMobile} className={navClass}>
              <Home className="w-5 h-5" />
              <span>Home</span>
            </NavLink>
            <NavLink to="/suite" onClick={onCloseMobile} className={navClass}>
              <Layers3 className="w-5 h-5 text-brand-500" />
              <span>Suite</span>
            </NavLink>
            <NavLink to="/search?q=trending" onClick={onCloseMobile} className={navClass}>
              <Flame className="w-5 h-5 text-orange-500" />
              <span>Trending</span>
            </NavLink>
            <NavLink to="/subscriptions" onClick={onCloseMobile} className={navClass}>
              <Tv className="w-5 h-5" />
              <span>Subscriptions</span>
            </NavLink>
            <NavLink to="/membership" onClick={onCloseMobile} className={navClass}>
              <WalletCards className="w-5 h-5 text-brand-500" />
              <span>Membership</span>
            </NavLink>
            <NavLink to="/meetings" onClick={onCloseMobile} className={navClass}>
              <Video className="w-5 h-5 text-red-500" />
              <span>Live meetings</span>
            </NavLink>
          </div>

          <hr className="my-3 border-gray-200 dark:border-[#222222]" />

          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              You
            </div>
            <NavLink to="/history" onClick={onCloseMobile} className={navClass}>
              <History className="w-5 h-5" />
              <span>History</span>
            </NavLink>
            <NavLink to="/watch-later" onClick={onCloseMobile} className={navClass}>
              <Clock className="w-5 h-5" />
              <span>Watch Later</span>
            </NavLink>
            <NavLink to="/liked" onClick={onCloseMobile} className={navClass}>
              <ThumbsUp className="w-5 h-5" />
              <span>Liked Videos</span>
            </NavLink>
            {isAuthenticated && user?.channel && (
              <NavLink
                to={`/channel/${user.channel._id}`}
                onClick={onCloseMobile}
                className={navClass}
              >
                <User className="w-5 h-5" />
                <span>Your Channel</span>
              </NavLink>
            )}
          </div>

          {subscriptions.length > 0 && (
            <>
              <hr className="my-3 border-gray-200 dark:border-[#222222]" />
              <div className="space-y-1">
                <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Subscriptions
                </div>
                {subscriptions.map((chan) => (
                  <NavLink
                    key={chan._id}
                    to={`/channel/${chan._id}`}
                    onClick={onCloseMobile}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#242424] transition truncate"
                  >
                    <img
                      src={resolveMediaUrl(chan.avatar)}
                      alt={chan.name}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <span className="truncate">{chan.name}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}

          <hr className="my-3 border-gray-200 dark:border-[#222222]" />
          <NavLink to="/profile" onClick={onCloseMobile} className={navClass}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>
    );
  }

  // Desktop Collapsed Mini Icon Sidebar
  if (!isOpen) {
    return (
      <aside className="hidden md:flex flex-col w-16 h-[calc(100vh-3.5rem)] sticky top-14 bg-white dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-[#222222] py-2 px-1 z-30 transition-colors shrink-0">
        <NavLink to="/" className={compactNavClass}>
          <Home className="w-5 h-5 mb-1" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/suite" className={compactNavClass}>
          <Layers3 className="w-5 h-5 mb-1 text-brand-500" />
          <span>Suite</span>
        </NavLink>
        <NavLink to="/search?q=trending" className={compactNavClass}>
          <Flame className="w-5 h-5 mb-1 text-orange-500" />
          <span>Trending</span>
        </NavLink>
        <NavLink to="/subscriptions" className={compactNavClass}>
          <Tv className="w-5 h-5 mb-1" />
          <span>Subscriptions</span>
        </NavLink>
        <NavLink to="/membership" className={compactNavClass}>
          <WalletCards className="w-5 h-5 mb-1 text-brand-500" />
          <span>Plans</span>
        </NavLink>
        <NavLink to="/meetings" className={compactNavClass}>
          <Video className="w-5 h-5 mb-1 text-red-500" />
          <span>Meet</span>
        </NavLink>
        <NavLink to="/history" className={compactNavClass}>
          <History className="w-5 h-5 mb-1" />
          <span>History</span>
        </NavLink>
        <NavLink to="/watch-later" className={compactNavClass}>
          <Clock className="w-5 h-5 mb-1" />
          <span>Saved</span>
        </NavLink>
      </aside>
    );
  }

  // Desktop Expanded Full Sidebar
  return (
    <aside className="hidden md:flex flex-col w-60 h-[calc(100vh-3.5rem)] sticky top-14 bg-white dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-[#222222] p-3 overflow-y-auto z-30 transition-colors shrink-0">
      <div className="space-y-1">
        <NavLink to="/" className={navClass}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/suite" className={navClass}>
          <Layers3 className="w-5 h-5 text-brand-500" />
          <span>Suite</span>
        </NavLink>
        <NavLink to="/search?q=trending" className={navClass}>
          <Flame className="w-5 h-5 text-orange-500" />
          <span>Trending</span>
        </NavLink>
        <NavLink to="/subscriptions" className={navClass}>
          <Tv className="w-5 h-5" />
          <span>Subscriptions</span>
        </NavLink>
        <NavLink to="/membership" className={navClass}>
          <WalletCards className="w-5 h-5 text-brand-500" />
          <span>Membership & Downloads</span>
        </NavLink>
        <NavLink to="/meetings" className={navClass}>
          <Video className="w-5 h-5 text-red-500" />
          <span>Live meetings</span>
        </NavLink>
      </div>

      <hr className="my-3 border-gray-200 dark:border-[#222222]" />

      <div className="space-y-1">
        <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          You
        </div>
        <NavLink to="/history" className={navClass}>
          <History className="w-5 h-5" />
          <span>History</span>
        </NavLink>
        <NavLink to="/watch-later" className={navClass}>
          <Clock className="w-5 h-5" />
          <span>Watch Later</span>
        </NavLink>
        <NavLink to="/liked" className={navClass}>
          <ThumbsUp className="w-5 h-5" />
          <span>Liked Videos</span>
        </NavLink>
        {isAuthenticated && user?.channel && (
          <NavLink to={`/channel/${user.channel._id}`} className={navClass}>
            <User className="w-5 h-5" />
            <span>Your Channel</span>
          </NavLink>
        )}
      </div>

      {subscriptions.length > 0 && (
        <>
          <hr className="my-3 border-gray-200 dark:border-[#222222]" />
          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Subscriptions
            </div>
            {subscriptions.map((chan) => (
              <NavLink
                key={chan._id}
                to={`/channel/${chan._id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#242424] transition truncate"
              >
                <img
                  src={resolveMediaUrl(chan.avatar)}
                  alt={chan.name}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
                <span className="truncate">{chan.name}</span>
              </NavLink>
            ))}
          </div>
        </>
      )}

      <hr className="my-3 border-gray-200 dark:border-[#222222]" />

      <div className="space-y-1">
        <NavLink to="/profile" className={navClass}>
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>
      </div>

      <div className="mt-auto pt-4 px-3 text-xs text-gray-400">
        <p>© 2026 VidSphere Inc.</p>
        <p className="mt-1 text-[11px] text-gray-500">Built for next-gen video streaming.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
