import { createSlice } from '@reduxjs/toolkit';

// Retrieve initial states from local storage
const initialTheme = localStorage.getItem('theme') || 'default';
const initialFont = localStorage.getItem('font') || 'Inter';

// Helper to apply theme to HTML element
const applyThemeToDOM = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

// Helper to apply font family to document body
const applyFontToDOM = (font) => {
  const fontMapping = {
    'Inter': "'Inter', 'Plus Jakarta Sans', sans-serif",
    'Fira Code': "'Fira Code', monospace",
    'JetBrains Mono': "'JetBrains Mono', monospace"
  };
  document.body.style.fontFamily = fontMapping[font] || "'Inter', sans-serif";
};

// Apply initial states on load
applyThemeToDOM(initialTheme);
applyFontToDOM(initialFont);

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    theme: initialTheme,
    font: initialFont,
  },
  reducers: {
    setTheme: (state, action) => {
      const themeName = action.payload;
      state.theme = themeName;
      localStorage.setItem('theme', themeName);
      applyThemeToDOM(themeName);
    },
    setFont: (state, action) => {
      const fontName = action.payload;
      state.font = fontName;
      localStorage.setItem('font', fontName);
      applyFontToDOM(fontName);
    },
    resetToDefault: (state) => {
      state.theme = 'default';
      state.font = 'Inter';
      localStorage.removeItem('theme');
      localStorage.removeItem('font');
      applyThemeToDOM('default');
      applyFontToDOM('Inter');
    }
  }
});

export const { setTheme, setFont, resetToDefault } = themeSlice.actions;
export default themeSlice.reducer;
