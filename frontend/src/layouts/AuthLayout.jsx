import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-sigil-ai-atelier-bg-canvas">
      {/* Main Container */}
      <div className="relative w-full flex justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
