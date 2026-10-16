import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme, setFont, resetToDefault } from '../redux/slices/themeSlice';
import { Check, RefreshCw, AlertCircle } from 'lucide-react';

const ThemeFonts = () => {
  const dispatch = useDispatch();
  const currentTheme = useSelector((state) => state.theme.theme);
  const currentFont = useSelector((state) => state.theme.font);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 1. Theme Configurations for Visual Previews
  const themes = [
    {
      id: 'default',
      name: 'Default Light',
      desc: 'Visual crisp off-white workspace layout.',
      colors: {
        sidebar: '#F8F9FA',
        canvas: '#F9FAFB',
        card: '#FFFFFF',
        accent: '#3B82F6',
        text: '#111827'
      }
    },
    {
      id: 'one-dark-pro',
      name: 'One Dark Pro',
      desc: 'Sleek dark editor canvas with vivid details.',
      colors: {
        sidebar: '#1E2227',
        canvas: '#282C34',
        card: '#21252B',
        accent: '#C678DD',
        text: '#ABB2BF'
      }
    },
    {
      id: 'dracula',
      name: 'Dracula',
      desc: 'Cyberpunk deep purple theme with pink accents.',
      colors: {
        sidebar: '#1E1F29',
        canvas: '#282A36',
        card: '#2D2F3F',
        accent: '#FF79C6',
        text: '#F8F8F2'
      }
    },
    {
      id: 'solarized-dark',
      name: 'Solarized Dark',
      desc: 'Low-contrast terminal design with deep teal tones.',
      colors: {
        sidebar: '#002B36',
        canvas: '#073642',
        card: '#0A3E4D',
        accent: '#2AA198',
        text: '#93A1A1'
      }
    }
  ];

  // 2. Typography Options
  const fonts = [
    { name: 'Inter', desc: 'Default UI Sans font' },
    { name: 'Fira Code', desc: 'Developer monospace font' },
    { name: 'JetBrains Mono', desc: 'Premium programming typography' }
  ];

  // 3. API settings update dispatcher
  const savePreferencesToDB = async (themeName, fontName) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          theme: themeName || currentTheme,
          font: fontName || currentFont
        })
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to sync preferences to database.');
      }

      setSuccess('Preferences synced securely to your cloud profile!');
      
      // Update local storage user record to keep consistency
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        user.settings = {
          theme: themeName || currentTheme,
          font: fontName || currentFont
        };
        localStorage.setItem('user', JSON.stringify(user));
      }

    } catch (err) {
      setError(err.message);
    }
  };

  const handleThemeChange = (themeId) => {
    dispatch(setTheme(themeId));
    savePreferencesToDB(themeId, currentFont);
  };

  const handleFontChange = (fontName) => {
    dispatch(setFont(fontName));
    savePreferencesToDB(currentTheme, fontName);
  };

  const handleReset = () => {
    dispatch(resetToDefault());
    savePreferencesToDB('default', 'Inter');
  };

  return (
    <div className="flex-1 min-h-screen bg-[var(--bg-canvas)] flex flex-col relative overflow-hidden transition-all duration-200">
      
      {/* Control Header */}
      <header className="bg-[var(--bg-card)] h-[64px] border-b border-[var(--border-color)] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[var(--text-main)] tracking-tight font-sans">
            Theme & Fonts Settings
          </h1>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Configure workspace skins and editor typographies</span>
        </div>
        
        {/* Reset Action Button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 py-1.5 px-3.5 bg-[var(--bg-sidebar)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-main)] rounded-brand text-xs font-semibold shadow-sm hover:shadow transition-all duration-150"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset to Default</span>
        </button>
      </header>

      {/* Main Form Fields Container */}
      <div className="flex-1 p-6 md:p-10 max-w-5xl w-full mx-auto space-y-8 overflow-y-auto">
        
        {/* Sync Status Banners */}
        {success && (
          <div className="p-3.5 rounded-brand bg-sigil-ai-atelier-status-live-bg border border-sigil-ai-atelier-status-live-text/10 text-xs font-semibold text-sigil-ai-atelier-status-live-text flex items-center gap-2 transition-all">
            <Check className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-brand bg-sigil-ai-atelier-status-alert-bg border border-sigil-ai-atelier-status-alert-text/10 text-xs font-semibold text-sigil-ai-atelier-status-alert-text flex items-center gap-2 transition-all">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Theme Selection Grid */}
        <section className="space-y-4">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-[var(--text-main)] tracking-tight">
              Color Themes
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">Select a custom color palette for your sidebar, canvas grids, and active cards.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {themes.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`cursor-pointer rounded-brand-lg border p-5 flex flex-col justify-between h-[160px] bg-[var(--bg-card)] transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]/10 shadow-sm'
                      : 'border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-main)]">{theme.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-normal pr-4">{theme.desc}</span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[var(--accent-color)] text-white shadow-sm shadow-[var(--accent-color)]/25">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* VS Code Mini Preview Box */}
                  <div className="w-full h-[48px] rounded border border-[var(--border-color)] flex overflow-hidden mt-3" style={{ borderColor: theme.colors.border }}>
                    {/* Mock Sidebar */}
                    <div className="w-[30%] h-full flex flex-col justify-between p-1.5" style={{ backgroundColor: theme.colors.sidebar }}>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }}></div>
                        <div className="w-6 h-1 rounded" style={{ backgroundColor: theme.colors.text, opacity: 0.2 }}></div>
                      </div>
                      <div className="w-8 h-1 rounded" style={{ backgroundColor: theme.colors.text, opacity: 0.15 }}></div>
                    </div>
                    {/* Mock Canvas & Card */}
                    <div className="flex-1 h-full p-2 flex items-center justify-center" style={{ backgroundColor: theme.colors.canvas }}>
                      <div className="w-full h-full rounded border border-[rgba(0,0,0,0.03)] flex items-center justify-between px-2" style={{ backgroundColor: theme.colors.card }}>
                        <div className="w-10 h-1 rounded" style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}></div>
                        <div className="w-2.5 h-1.5 rounded-sm" style={{ backgroundColor: theme.colors.accent }}></div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Font Management Section */}
        <section className="space-y-4 pt-4 border-t border-[var(--border-color)]">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-[var(--text-main)] tracking-tight">
              Typography Font
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">Customize the layout typography. Displays using the font's native styles.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fonts.map((font) => {
              const isSelected = currentFont === font.name;
              
              // Map native font family inline styles
              const fontInlineStyle = {
                'Inter': "'Inter', sans-serif",
                'Fira Code': "'Fira Code', monospace",
                'JetBrains Mono': "'JetBrains Mono', monospace"
              }[font.name];

              return (
                <button
                  key={font.name}
                  onClick={() => handleFontChange(font.name)}
                  style={{ fontFamily: fontInlineStyle }}
                  className={`p-4 border rounded-brand text-left bg-[var(--bg-card)] flex flex-col justify-between h-[100px] transition-all hover:shadow-sm ${
                    isSelected
                      ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]/10 text-[var(--text-main)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-bold">{font.name}</span>
                    {isSelected && (
                      <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center bg-[var(--accent-color)] text-white shadow-[var(--accent-color)]/10">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-relaxed opacity-75 mt-2" style={{ fontFamily: fontInlineStyle }}>
                    Aa Bb Cc 123
                  </span>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ThemeFonts;
