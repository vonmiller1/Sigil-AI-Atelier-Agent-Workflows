import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Palette, 
  Terminal, 
  Cpu, 
  GitFork, 
  Database, 
  Key, 
  Plus,
  LogOut
} from 'lucide-react';

const Sidebar = ({ activePage, setActivePage, handleLogout, user }) => {
  const navigate = useNavigate();
  
  // Navigation Menu Configurations matching Screenshot exactly
  const topMenu = {
    name: "Theme & Fonts",
    icon: Palette
  };

  const coreMenu = [
    { name: "Playground", icon: Terminal },
    { name: "Agent Registry", icon: Cpu },
    { name: "Workflow Maker", icon: GitFork },
    { name: "Knowledge Base", icon: Database },
    { name: "Integration Hub", icon: Key }
  ];

  return (
    <div className="w-[260px] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col justify-between select-none transition-all duration-200">
      
      {/* Top Section */}
      <div className="p-5 flex flex-col gap-6">
        
        {/* Brand Header with Live Status Dot */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Round Blue Logo container */}
            <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border-color)] flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/Sigil_Logo.png" alt="Sigil Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[12px] tracking-wide text-[var(--text-main)] uppercase font-sans">
                SIGIL AI ATELIER
              </span>
              <span className="text-[10px] font-bold text-[var(--text-main)]/80 uppercase -mt-0.5 tracking-wider">
                AGENT
              </span>
            </div>
          </div>
          
          {/* Pulsing Live indicator */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2.5 py-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sigil-ai-atelier-status-live-text animate-pulse"></span>
            <span className="text-[9px] font-bold text-[var(--text-main)] uppercase tracking-wide">Live</span>
          </div>
        </div>

        {/* "+ New Chat" Pill Action Button */}
        <button 
          onClick={() => alert('Starting a new agent chat session...')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] hover:text-[var(--accent-color)] font-semibold text-xs rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-sm transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>

        {/* Navigation Menus */}
        <nav className="flex flex-col gap-5 mt-2">
          
          {/* Top Tier Single Link */}
          <button
            onClick={() => {
              setActivePage(topMenu.name);
              navigate('/dashboard');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-brand text-xs font-semibold transition-all duration-150 ${
              activePage === topMenu.name
                ? 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-color)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }`}
          >
            <topMenu.icon className={`w-4 h-4 ${activePage === topMenu.name ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`} />
            <span>{topMenu.name}</span>
          </button>

          {/* AI PLATFORM Group Section */}
          <div className="flex flex-col gap-1.5">
            <span className="px-3 text-[10px] font-bold text-[var(--text-muted)]/65 uppercase tracking-widest">
              AI PLATFORM
            </span>
            
            {/* Core Links list */}
            <div className="flex flex-col gap-1">
              {coreMenu.map((item) => {
                const isActive = activePage === item.name;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActivePage(item.name);
                      if (item.name === "Knowledge Base") {
                        navigate('/knowledge-base');
                      } else if (item.name === "Integration Hub") {
                        navigate('/integration-hub');
                      } else {
                        navigate('/dashboard');
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-brand text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? item.name === "Integration Hub"
                          ? 'bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-[#ff4d6d] shadow-[0_1px_3px_rgba(255,77,109,0.02)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-color)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${
                      isActive
                        ? item.name === "Integration Hub"
                          ? 'text-[#ff4d6d]'
                          : 'text-[var(--accent-color)]'
                        : 'text-[var(--text-muted)]'
                    }`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
        </nav>
      </div>

      {/* Pinned Bottom Footer Section */}
      <div className="p-4 border-t border-[var(--border-color)] flex flex-col gap-2 bg-[var(--bg-sidebar)]">
        
        {/* Provider Keys Link */}
        <button
          onClick={() => {
            setActivePage("Provider Keys");
            navigate('/dashboard');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-brand text-xs font-semibold transition-all duration-150 ${
            activePage === "Provider Keys"
              ? 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-color)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Key className={`w-4 h-4 ${activePage === "Provider Keys" ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`} />
          <span>Provider Keys</span>
        </button>

        {/* Logout action */}
        {handleLogout && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-brand text-xs font-semibold text-sigil-ai-atelier-status-alert-text hover:bg-sigil-ai-atelier-status-alert-bg/50 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 text-sigil-ai-atelier-status-alert-text" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default Sidebar;
