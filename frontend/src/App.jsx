import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import ProtectedRoute from './components/auth/ProtectedRoute';

import HomePage from './pages/HomePage';
import VideoPage from './pages/VideoPage';
import SearchPage from './pages/SearchPage';
import UploadPage from './pages/UploadPage';
import ChannelPage from './pages/ChannelPage';
import HistoryPage from './pages/HistoryPage';
import WatchLaterPage from './pages/WatchLaterPage';
import LikedVideosPage from './pages/LikedVideosPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Layout wrapper to control sidebar visibility on watch page
const Layout = () => {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch/');

  const [isSidebarOpen, setIsSidebarOpen] = useState(!isWatchPage);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapse sidebar by default on watch page for maximum player view area
  useEffect(() => {
    if (isWatchPage) {
      setIsSidebarOpen(false);
    } else if (!isMobile) {
      setIsSidebarOpen(true);
    }
  }, [location.pathname, isWatchPage, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0f0f0f] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar
          isOpen={isSidebarOpen}
          isMobile={isMobile}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/watch/:id" element={<VideoPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/channel/:id" element={<ChannelPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watch-later"
              element={
                <ProtectedRoute>
                  <WatchLaterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liked"
              element={
                <ProtectedRoute>
                  <LikedVideosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <SubscriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Layout />
    </Router>
  );
};

export default App;
