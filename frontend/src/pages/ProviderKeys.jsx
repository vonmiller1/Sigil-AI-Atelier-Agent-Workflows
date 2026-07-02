import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Save, 
  AlertCircle, 
  Globe, 
  Lock, 
  CheckCircle2,
  Cpu,
  Search
} from 'lucide-react';

const ProviderKeys = () => {
  const [providerName, setProviderName] = useState('OpenAI');
  const [customProviderName, setCustomProviderName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Model catalog states for selected connection
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // 1. Fetch saved connections from Backend Mongoose profile on mount
  const fetchConnections = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setFetching(true);
    try {
      const response = await fetch('http://localhost:5000/api/connections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setConnections(data.connections);
      }
    } catch (err) {
      console.error('Failed to load active keys:', err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  // Fetch available models for a clicked connection
  const handleSelectConnection = async (connection) => {
    if (selectedConnection && selectedConnection.id === connection.id) {
      setSelectedConnection(null);
      setModels([]);
      setModelsError('');
      return;
    }

    setSelectedConnection(connection);
    setModels([]);
    setModelsError('');
    setLoadingModels(true);
    setModelSearch('');

    const token = localStorage.getItem('token');
    if (!token) {
      setModelsError('Session expired. Please log in again.');
      setLoadingModels(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/connections/${connection.id}/models`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to retrieve provider models.');
      }

      // Parse models data structure
      let parsedModels = [];
      if (Array.isArray(data.models)) {
        parsedModels = data.models;
      } else if (data.models && Array.isArray(data.models.data)) {
        parsedModels = data.models.data;
      } else if (data.models && typeof data.models === 'object') {
        parsedModels = Object.keys(data.models).map(key => ({ id: key, name: data.models[key] }));
      }
      
      setModels(parsedModels);
    } catch (err) {
      console.error('Failed to load models:', err.message);
      setModelsError(err.message);
    } finally {
      setLoadingModels(false);
    }
  };

  // 2. Submit new connection to backend gateway
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const displayProviderName = providerName === 'Custom OpenAI-Compatible' ? customProviderName : providerName;
      const response = await fetch('http://localhost:5000/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerName: displayProviderName,
          apiKey,
          baseUrl: providerName === 'Custom OpenAI-Compatible' ? baseUrl : null
        })
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Validation failed. Check your API credentials.');
      }

      setSuccess('Connection verified against catalog and saved successfully!');
      setApiKey('');
      setBaseUrl('');
      setCustomProviderName('');
      
      // Refresh listing
      fetchConnections();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-[var(--bg-canvas)] flex flex-col relative overflow-hidden transition-all duration-200">
      
      {/* Workspace Header */}
      <header className="bg-[var(--bg-card)] h-[64px] border-b border-[var(--border-color)] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[var(--text-main)] tracking-tight font-sans">
            Provider Keys Configuration
          </h1>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Link model catalogs using unified OpenAI-compatible endpoints</span>
        </div>
        <div className="text-[10px] font-bold text-[var(--text-muted)]/60 uppercase tracking-widest">
          Connections Manager
        </div>
      </header>

      {/* Main Form Fields Container */}
      <div className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto space-y-8 overflow-y-auto">
        
        {/* Status Alerts Banners */}
        {success && (
          <div className="p-3.5 rounded-brand bg-sigil-ai-atelier-status-live-bg border border-sigil-ai-atelier-status-live-text/10 text-xs font-semibold text-sigil-ai-atelier-status-live-text flex items-center gap-2 transition-all">
            <CheckCircle2 className="w-4 h-4 text-sigil-ai-atelier-status-live-text" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-brand bg-sigil-ai-atelier-status-alert-bg border border-sigil-ai-atelier-status-alert-text/10 text-xs font-semibold text-sigil-ai-atelier-status-alert-text flex items-center gap-2 transition-all">
            <AlertCircle className="w-4 h-4 text-sigil-ai-atelier-status-alert-text" />
            <span>{error}</span>
          </div>
        )}

        {/* Saved Connections Form card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand-lg shadow-brand-card p-6 md:p-8 relative overflow-hidden transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-color)]" />
          
          <h2 className="text-sm font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
            <Key className="w-4.5 h-4.5 text-[var(--accent-color)]" />
            <span>Link Model Provider connection</span>
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Form Fields layout grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Select Provider */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Provider Name
                </label>
                <select
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="block w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/10 focus:border-[var(--accent-color)] transition-all"
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Groq">Groq</option>
                  <option value="Cerebras">Cerebras</option>
                  <option value="Gemini">Gemini</option>
                  <option value="Mistral">Mistral</option>
                  <option value="Custom OpenAI-Compatible">Custom OpenAI-Compatible</option>
                </select>
              </div>

              {/* API Key Input */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)]">
                  API Authorization Key
                </label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-••••••••••••••••••••••••"
                  className="block w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/10 focus:border-[var(--accent-color)] transition-all"
                />
              </div>

            </div>

            {/* Conditional Custom Provider Name and Base URL fields */}
            {providerName === 'Custom OpenAI-Compatible' && (
              <div className="space-y-4 mt-4 animate-fade-in">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Custom Provider Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customProviderName}
                    onChange={(e) => setCustomProviderName(e.target.value)}
                    placeholder="e.g. My Custom Provider"
                    className="block w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/10 focus:border-[var(--accent-color)] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Custom OpenAI-Compatible Base URL</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.yourprovider.com/v1"
                    className="block w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/10 focus:border-[var(--accent-color)] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center gap-2 py-2 px-5 font-semibold text-xs rounded-brand shadow-sm transition-all duration-150 ${
                  loading 
                    ? 'bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-muted)]/50 cursor-not-allowed shadow-none' 
                    : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/95 text-white shadow-[var(--accent-color)]/10 hover:shadow-md'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? 'Verifying Catalog...' : 'Save Connection'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* 3. Grid Display of Saved Connections & Models Catalog Side-by-Side */}
        <div className={`grid grid-cols-1 ${selectedConnection ? 'md:grid-cols-12 gap-6' : 'gap-8'}`}>
          
          {/* Active Saved Connections Column */}
          <div className={`${selectedConnection ? 'md:col-span-4' : 'w-full'}`}>
            <section className="space-y-4">
              <div className="flex flex-col">
                <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Active Saved Connections
                </h3>
                <p className="text-[10px] text-[var(--text-muted)]">Active validated credentials currently mapped to your workflow builder nodes.</p>
              </div>

              {fetching ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)] animate-pulse">
                  Fetching catalog pipelines...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-10 bg-[var(--bg-card)] border border-[var(--border-color)] border-dashed rounded-brand text-xs text-[var(--text-muted)]">
                  No custom provider connection keys saved yet. Map credentials to begin.
                </div>
              ) : (
                <div className={`grid gap-4 ${selectedConnection ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {connections.map((c) => {
                    const isSelected = selectedConnection?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectConnection(c)}
                        className={`bg-[var(--bg-card)] border rounded-brand p-4 flex items-center justify-between shadow-sm hover:shadow cursor-pointer transition-all duration-150 ${
                          isSelected 
                            ? 'ring-2 ring-[var(--accent-color)] border-[var(--accent-color)] bg-[var(--accent-light)]/10' 
                            : 'border-[var(--border-color)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded bg-[var(--accent-light)] text-[var(--accent-color)] flex items-center justify-center font-bold text-xs">
                            {c.providerName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-main)]">{c.providerName}</span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-[var(--text-muted)]/75" />
                              <span>{c.apiKey}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sigil-ai-atelier-status-live-bg text-[9px] font-bold text-sigil-ai-atelier-status-live-text uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-sigil-ai-atelier-status-live-text animate-pulse"></span>
                          <span>Ready</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* 4. Display of Models inside clicked Connection (displayed on the right) */}
          {selectedConnection && (
            <div className="md:col-span-8">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand-lg shadow-brand-card p-6 relative overflow-hidden transition-all duration-200">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-color)]" />
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-[var(--accent-light)] text-[var(--accent-color)] flex items-center justify-center">
                      <Cpu className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        {selectedConnection.providerName} Models Catalog
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)]">Available models fetched from live microservice configuration</p>
                    </div>
                  </div>

                  {/* Search filter input */}
                  {!loadingModels && !modelsError && models.length > 0 && (
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      </span>
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Search model catalog..."
                        className="block w-full pl-8 pr-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-brand text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition-all"
                      />
                    </div>
                  )}
                </div>

                {loadingModels ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-[var(--accent-color)]/25 border-t-[var(--accent-color)] animate-spin"></div>
                    <span className="text-xs text-[var(--text-muted)] animate-pulse">Contacting model endpoint catalog...</span>
                  </div>
                ) : modelsError ? (
                  <div className="p-4 rounded bg-sigil-ai-atelier-status-alert-bg border border-sigil-ai-atelier-status-alert-text/10 text-xs font-semibold text-sigil-ai-atelier-status-alert-text flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-sigil-ai-atelier-status-alert-text" />
                    <span>{modelsError}</span>
                  </div>
                ) : models.length === 0 ? (
                  <div className="text-center py-10 bg-[var(--bg-canvas)] border border-[var(--border-color)] border-dashed rounded text-xs text-[var(--text-muted)]">
                    No models retrieved for this provider.
                  </div>
                ) : (
                  <div>
                    {/* Scrollable list of model IDs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                      {models
                        .filter(m => m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                        .map((model) => (
                          <div
                            key={model.id}
                            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] hover:border-[var(--accent-color)]/30 rounded p-3 flex items-center gap-2.5 transition-all hover:shadow-sm"
                          >
                            <Cpu className="w-4 h-4 text-[var(--text-muted)]/60" />
                            <div className="flex flex-col overflow-hidden w-full">
                              <span className="text-xs font-semibold text-[var(--text-main)] truncate" title={model.id}>
                                {model.id}
                              </span>
                              <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                                {model.owned_by || 'Model'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    {models.filter(m => m.id.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                      <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                        No models match your search query.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProviderKeys;
