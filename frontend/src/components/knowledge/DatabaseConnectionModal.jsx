import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, ShieldCheck, Database } from 'lucide-react';

const DatabaseConnectionModal = ({ isOpen, onClose, onSaveSuccess, onSuccess }) => {
  const [name, setName] = useState('');
  const [engine, setEngine] = useState('postgresql');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('5432');
  const [databaseName, setDatabaseName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sslMode, setSslMode] = useState(false);

  // Connection testing states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Update default ports on engine change
  useEffect(() => {
    if (engine === 'postgresql') {
      setPort('5432');
    } else if (engine === 'mysql') {
      setPort('3306');
    }
    setTestResult(null); // Reset test status when params change
  }, [engine]);

  // Reset test status when details are edited
  useEffect(() => {
    setTestResult(null);
  }, [name, host, port, databaseName, username, password, sslMode]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!name.trim() || !host.trim() || !port || !databaseName.trim() || !username.trim()) {
      setError('All fields except password are required to test connection.');
      return;
    }
    setError('');
    setIsTesting(true);
    setTestResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/databases/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          engine,
          host,
          port: Number(port),
          databaseName,
          username,
          password,
          sslMode
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.message || 'Connection test failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Network error occurred.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async (e) => {
    e.preventDefault();
    if (!testResult || !testResult.success) return;

    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/databases/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          engine,
          host,
          port: Number(port),
          databaseName,
          username,
          password,
          sslMode
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (onSaveSuccess) onSaveSuccess(data.data);
        if (onSuccess) onSuccess(data.data);
        onClose();
      } else {
        setError(data.message || 'Failed to save database connection.');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl max-w-lg w-full relative overflow-hidden transition-all duration-200 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Top blue accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-[var(--accent-color)]" />
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Database className="w-6 h-6 text-[var(--accent-color)]" />
            <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Connect SQL Database</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-canvas)] transition-all focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSaveConnection} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Security Banner */}
          <div className="flex gap-3 p-4 bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-400 rounded-xl text-sm leading-relaxed">
            <ShieldCheck className="w-6 h-6 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-sky-900 dark:text-sky-300">Credential Isolation Security</strong>: Credentials are encrypted using AES-256-GCM at rest. Databases are represented to LLMs/Agents only as a connection ID. Connection details are never exposed to models.
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Connection Display Name
              </label>
              <input
                type="text"
                placeholder="e.g., Production Customer DB"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Database Engine
              </label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans cursor-pointer"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Host / IP Address
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Database Name
              </label>
              <input
                type="text"
                placeholder="e.g., sigil-ai-atelier-db"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--text-muted)]">
                Password
              </label>
              <input
                type="password"
                placeholder="•••••••• (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
              />
            </div>

            <div className="col-span-2 flex items-center gap-3 py-1 select-none">
              <input
                type="checkbox"
                id="sslMode"
                checked={sslMode}
                onChange={(e) => setSslMode(e.target.checked)}
                className="rounded border-[var(--border-color)] bg-[var(--bg-canvas)] text-[var(--accent-color)] focus:ring-[var(--accent-color)] h-4 w-4 cursor-pointer"
              />
              <label htmlFor="sslMode" className="text-sm font-semibold text-[var(--text-main)] cursor-pointer select-none">
                Require SSL (sslmode=require)
              </label>
            </div>
          </div>

          {/* Test Status Panel */}
          {testResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="text-sm leading-relaxed">
                <span className="font-bold">{testResult.success ? 'Success' : 'Connection Failed'}:</span>{' '}
                {testResult.message}
              </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-canvas)]/30 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
            className="px-5 py-2.5 hover:bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-main)] font-bold text-sm rounded-full transition-all focus:outline-none flex items-center gap-1.5"
          >
            {isTesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Test Connection</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 hover:bg-[var(--bg-canvas)] border border-transparent text-[var(--text-muted)] font-semibold text-sm rounded-full transition-colors focus:outline-none"
            >
              Cancel
            </button>
            
            {testResult && testResult.success && (
              <button
                type="submit"
                onClick={handleSaveConnection}
                disabled={isSaving}
                className="px-5 py-2.5 bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm rounded-full shadow-sm transition-all focus:outline-none flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Connection</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConnectionModal;
