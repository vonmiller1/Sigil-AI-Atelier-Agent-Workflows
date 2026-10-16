import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setTheme, setFont } from '../redux/slices/themeSlice';
import Sidebar from '../components/Sidebar';
import WorkspaceContainer from '../components/WorkspaceContainer';
import ThemeFonts from '../pages/ThemeFonts';
import ProviderKeys from '../pages/ProviderKeys';
import AgentRegistry from '../pages/AgentRegistry';
import Playground from '../pages/Playground';
import KnowledgeBase from '../pages/KnowledgeBase';
import IntegrationHub from '../pages/IntegrationHub';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [activePage, setActivePage] = useState(() => {
    if (location.pathname === '/knowledge-base') {
      return 'Knowledge Base';
    }
    if (location.pathname === '/integration-hub') {
      return 'Integration Hub';
    }
    const saved = localStorage.getItem('activePage');
    return saved || 'Workflow Maker';
  }); 
  const [activeAgent, setActiveAgent] = useState(() => {
    const saved = localStorage.getItem('activeAgent');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  useEffect(() => {
    if (activeAgent) {
      localStorage.setItem('activeAgent', JSON.stringify(activeAgent));
    } else {
      localStorage.removeItem('activeAgent');
    }
  }, [activeAgent]);

  useEffect(() => {
    // Protected route logic: Redirect to login if user is unauthenticated
    if (!user) {
      navigate('/login');
      return;
    }

    // Sync saved database settings from user record to Redux store on layout mount
    if (user.settings) {
      if (user.settings.theme) {
        dispatch(setTheme(user.settings.theme));
      }
      if (user.settings.font) {
        dispatch(setFont(user.settings.font));
      }
    }
  }, [user, navigate, dispatch]);

  useEffect(() => {
    if (location.pathname === '/knowledge-base') {
      setActivePage('Knowledge Base');
    } else if (location.pathname === '/integration-hub') {
      setActivePage('Integration Hub');
    } else if (location.pathname === '/dashboard') {
      setActivePage(current => (current === 'Knowledge Base' || current === 'Integration Hub') ? 'Workflow Maker' : current);
    }
  }, [location.pathname]);

  // Avoid accessing sub-elements if redirect is currently in progress
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activePage');
    localStorage.removeItem('activeAgent');
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] font-sans antialiased text-[var(--text-main)]">
      {/* Sidebar Panel */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        handleLogout={handleLogout} 
        user={user} 
      />

      {/* Main Right Stage Workspace Container, Theme, or Keys Page */}
      {activePage === 'Theme & Fonts' ? (
        <ThemeFonts />
      ) : activePage === 'Provider Keys' ? (
        <ProviderKeys />
      ) : activePage === 'Agent Registry' ? (
        <AgentRegistry 
          activePage={activePage} 
          setActivePage={setActivePage} 
          activeAgent={activeAgent} 
          setActiveAgent={setActiveAgent} 
        />
      ) : activePage === 'Playground' ? (
        <Playground 
          activePage={activePage} 
          setActivePage={setActivePage} 
          activeAgent={activeAgent} 
          setActiveAgent={setActiveAgent} 
        />
      ) : activePage === 'Knowledge Base' ? (
        <KnowledgeBase />
      ) : activePage === 'Integration Hub' ? (
        <IntegrationHub />
      ) : (
        <WorkspaceContainer activePage={activePage} />
      )}
    </div>
  );
};

export default DashboardLayout;
