import React from 'react';

const AuthCard = ({ children, title, subtitle }) => {
  return (
    <div className="w-full max-w-[440px] bg-white rounded-brand-lg border border-sigil-ai-atelier-border-light shadow-brand-card p-8 md:p-10 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
      {/* Top subtle blue top-border bar for brand connection */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-sigil-ai-atelier-blue-500" />
      
      <div className="flex flex-col items-start mb-8">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-md bg-white border border-sigil-ai-atelier-border-light flex items-center justify-center overflow-hidden shadow-sm">
            <img src="/Sigil_Logo.png" alt="Sigil Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[16px] tracking-wide text-sigil-ai-atelier-text-primary uppercase font-sans">
              Sigil AI Atelier
            </span>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sigil-ai-atelier-status-live-text animate-pulse"></span>
              <span className="text-[10px] font-semibold text-sigil-ai-atelier-text-muted uppercase tracking-wider">
                Agent Platform
              </span>
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        {title && (
          <h2 className="text-xl md:text-2xl font-bold text-sigil-ai-atelier-text-primary tracking-tight text-left">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mt-2 text-sm text-sigil-ai-atelier-text-muted text-left font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Form Content */}
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
};

export default AuthCard;
