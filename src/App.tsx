/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { HomeView } from './components/HomeView.js';
import { AboutView } from './components/AboutView.js';
import { PortfolioView } from './components/PortfolioView.js';
import { ClientPortalView } from './components/ClientPortalView.js';
import { AdminDashboardView } from './components/AdminDashboardView.js';
import { ContactView } from './components/ContactView.js';
import { SelectedPhotoItem, User } from './types.js';
import { useTheme } from './context/ThemeContext.js';

export default function App() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('rocha_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotoItem[]>(() => {
    try {
      const saved = localStorage.getItem('rocha_album');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAlbumDrawerOpen, setIsAlbumDrawerOpen] = useState<boolean>(false);

  // Sync album to localStorage
  useEffect(() => {
    localStorage.setItem('rocha_album', JSON.stringify(selectedPhotos));
  }, [selectedPhotos]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rocha_user');
    setActiveTab('home');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#c99e64] selection:text-black transition-colors ${
        isLight ? 'bg-[#fcfcfc] text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
      }`}
    >
      {/* Top Luxury Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        selectedPhotosCount={selectedPhotos.length}
        onOpenMyAlbum={() => setIsAlbumDrawerOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
        {activeTab === 'empresa' && <AboutView setActiveTab={setActiveTab} />}
        {activeTab === 'portfolio' && (
          <PortfolioView onContactClick={() => setActiveTab('contato')} />
        )}
        {activeTab === 'cliente' && (
          <ClientPortalView
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            selectedPhotos={selectedPhotos}
            setSelectedPhotos={setSelectedPhotos}
            isAlbumDrawerOpen={isAlbumDrawerOpen}
            setIsAlbumDrawerOpen={setIsAlbumDrawerOpen}
            onGoToAdmin={() => setActiveTab('admin')}
          />
        )}
        {activeTab === 'admin' && (
          <AdminDashboardView
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        )}
        {activeTab === 'contato' && <ContactView />}
      </main>

      {/* Global Studio Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
