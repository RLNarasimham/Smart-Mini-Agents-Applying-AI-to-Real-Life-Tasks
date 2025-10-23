import { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { DashboardLayout } from './components/DashboardLayout';
import { HomePage } from './components/HomePage';
import { SandboxPage } from './components/SandboxPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import  Pricing  from './components/Pricing'
 
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastUpdated: Date;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [sandboxAutoRun, setSandboxAutoRun] = useState(false);
  const [continueSession, setContinueSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    document.title = 'Nava AI';
  }, []);

  const handleNavigateToLogin = () => {
    setShowLogin(true);
    setShowSignUp(false);
  };

  const handleNavigateToSignUp = () => {
    setShowSignUp(true);
    setShowLogin(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleSignUp = () => {
    setIsLoggedIn(true);
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page !== 'sandbox') {
      setSandboxAutoRun(false);
    }
  };

  const handleNavigateToSandboxWithAutoRun = () => {
    setSandboxAutoRun(true);
    setCurrentPage('sandbox');
  };

  const handleContinueChat = (session: ChatSession) => {
    setContinueSession(session);
    setCurrentPage('home');
  };


  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowLogin(false);
    setShowSignUp(false);
    setCurrentPage('home');
    setContinueSession(null);
  };

  if (!showLogin && !showSignUp && !isLoggedIn) {
    return (
      <ThemeProvider>
        <LandingPage onNavigateToLogin={handleNavigateToLogin} />
      </ThemeProvider>
    );
  }

  if (showSignUp && !isLoggedIn) {
    return (
      <ThemeProvider>
        <SignUpPage onSignUp={handleSignUp} onNavigateToLogin={handleNavigateToLogin} />
      </ThemeProvider>
    );
  }

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate} onLogout={handleLogout}>
        {currentPage === 'home' && (
          <HomePage 
            onNavigateToSandbox={handleNavigateToSandboxWithAutoRun} 
            continueSession={continueSession}
          />
        )}
        {currentPage === 'sandbox' && <SandboxPage autoRun={sandboxAutoRun} />}
        {currentPage === 'history' && <HistoryPage onContinueChat={handleContinueChat} />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'pricing' && <Pricing />}
      </DashboardLayout>
    </ThemeProvider>
  );
}