import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function DashboardLayout({ children, currentPage, onNavigate, onLogout }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAppPreview, setShowAppPreview] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleAppPreview = () => {
    setShowAppPreview(!showAppPreview);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar onToggleSidebar={toggleSidebar} onToggleAppPreview={toggleAppPreview} showAppPreview={showAppPreview} onLogout={onLogout} />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}