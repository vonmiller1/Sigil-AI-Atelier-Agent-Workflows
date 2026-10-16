import React from 'react';

const WorkspaceContainer = ({ activePage }) => {
  return (
    <div className="flex-1 h-screen bg-[var(--bg-canvas)] flex flex-col relative overflow-hidden transition-all duration-200">
      
      {/* Top Header Row for Workspace Title */}
      <header className="bg-[var(--bg-card)] h-[64px] border-b border-[var(--border-color)] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all">
        <h1 className="text-sm font-bold text-[var(--text-main)] tracking-tight font-sans">
          {activePage}
        </h1>
        <div className="text-[10px] font-bold text-[var(--text-muted)]/60 uppercase tracking-widest">
          Sigil AI Atelier Platform Canvas
        </div>
      </header>

      {/* Dynamic Content Center Stage */}
      <div className="flex-1 flex items-center justify-center p-8">
        
        {/* Centered Dynamic Page Card with elegant clean borders */}
        <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand-lg shadow-brand-card p-10 text-center relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-color)]" />
          
          <div className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-widest mb-2">
            Active Workspace State
          </div>
          
          <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-4">
            {activePage} page
          </h2>
          
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            This module dynamically renders within the right workspace grid. Reusable hooks are tracking active menu state transitions in real time.
          </p>

          {/* Micro structural highlight block to ground the view */}
          <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sigil-ai-atelier-status-live-text animate-pulse"></span>
            <span className="text-[10px] font-bold text-sigil-ai-atelier-status-live-text uppercase tracking-wide">
              Verified & Connected
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default WorkspaceContainer;
