import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Terminal, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  RotateCw, 
  AlertCircle, 
  Lock, 
  CheckCircle,
  Play,
  Send,
  MessageCircle,
  X
} from 'lucide-react';

const MOCK_WORKFLOWS = [
  {
    _id: 'wf_01',
    id: 'wf_01',
    name: 'Time Analyst Workflow',
    description: 'Sequentially orchestrates calendar ingestion, pattern classification, and daily report generation steps.',
    entityType: 'workflow'
  },
  {
    _id: 'wf_02',
    id: 'wf_02',
    name: 'Lead Generation Pipeline',
    description: 'Orchestrates search tool scraping, profile extraction, and email draft creation workflows.',
    entityType: 'workflow'
  },
  {
    _id: 'wf_03',
    id: 'wf_03',
    name: 'Customer Support Router',
    description: 'Evaluates incoming ticket sentiments and dispatches them to appropriate agent queues.',
    entityType: 'workflow'
  }
];

const IntegrationHub = () => {
  // Catalog states
  const [agents, setAgents] = useState([]);
  const [workflows] = useState(MOCK_WORKFLOWS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Switcher states
  const [entityType, setEntityType] = useState('agent'); // 'agent' or 'workflow'
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('keys'); // 'keys', 'code', 'chat'
  
  // Tab 1: API Keys states
  const [apiKeys, setApiKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  
  // Modal for raw key disclosure
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [disclosedKey, setDisclosedKey] = useState(null);

  // Tab 2: Server Proxy Code sub-tab
  const [codeLang, setCodeLang] = useState('curl'); // 'curl', 'node', 'python'
  const [copiedText, setCopiedText] = useState(false);

  // Tab 3: Chat Integration Preview states
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [widgetMessages, setWidgetMessages] = useState([]);
  const [widgetInput, setWidgetInput] = useState('');
  const [isWidgetTyping, setIsWidgetTyping] = useState(false);
  const [widgetUseRealKey, setWidgetUseRealKey] = useState(false);
  const [widgetRealKey, setWidgetRealKey] = useState('');

  // Fetch agents from backend catalog
  const fetchCatalog = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:5000/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAgents(data.agents || []);
        // Set initial selected entity if agents exist
        if (entityType === 'agent' && data.agents && data.agents.length > 0) {
          // If we already have a selection, keep it, otherwise select first
          const currentExists = data.agents.some(a => a._id === selectedEntityId);
          if (!currentExists) {
            const firstAgent = data.agents[0];
            setSelectedEntityId(firstAgent._id);
            setSelectedEntity(firstAgent);
          } else {
            const current = data.agents.find(a => a._id === selectedEntityId);
            setSelectedEntity(current);
          }
        }
      } else {
        throw new Error(data.message || 'Failed to retrieve agent catalog.');
      }
    } catch (err) {
      console.error('Fetch agents catalog error:', err);
      setError(err.message || 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch API keys for selected scope
  const fetchApiKeys = async () => {
    if (!selectedEntityId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setKeysLoading(true);
      const response = await fetch(`http://localhost:5000/api/api-keys?entityType=${entityType}&entityId=${selectedEntityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setApiKeys(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to load keys.');
      }
    } catch (err) {
      console.error('Fetch keys error:', err);
      setError(`Failed to load developer keys: ${err.message}`);
    } finally {
      setKeysLoading(false);
    }
  };

  // Trigger catalog load on mount
  useEffect(() => {
    fetchCatalog();
  }, []);

  // Update selectedEntity object whenever selectedId or type changes
  useEffect(() => {
    setError('');
    setSuccess('');
    if (entityType === 'agent') {
      const active = agents.find(a => a._id === selectedEntityId || a.id === selectedEntityId);
      setSelectedEntity(active || null);
    } else {
      const active = workflows.find(w => w._id === selectedEntityId);
      setSelectedEntity(active || null);
    }
  }, [selectedEntityId, entityType, agents]);

  // Load keys when the selected entity changes
  useEffect(() => {
    if (selectedEntityId) {
      fetchApiKeys();
      
      // Initialize chat widget messages
      setWidgetMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I am your ${entityType === 'agent' ? selectedEntity?.name || 'Agent' : selectedEntity?.name || 'Workflow'}. How can I assist you with your integration today?`
        }
      ]);
    } else {
      setApiKeys([]);
    }
  }, [selectedEntityId, entityType]);

  // Handle entity type switcher change
  const handleEntityTypeChange = (type) => {
    setEntityType(type);
    if (type === 'agent') {
      if (agents.length > 0) {
        setSelectedEntityId(agents[0]._id);
        setSelectedEntity(agents[0]);
      } else {
        setSelectedEntityId('');
        setSelectedEntity(null);
      }
    } else {
      if (workflows.length > 0) {
        setSelectedEntityId(workflows[0]._id);
        setSelectedEntity(workflows[0]);
      } else {
        setSelectedEntityId('');
        setSelectedEntity(null);
      }
    }
  };

  // Generate a developer key
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setError('Please provide a descriptive name for your API key.');
      return;
    }
    if (!selectedEntityId) {
      setError('Please select an active agent or workflow first.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      setError('');
      setSuccess('');
      const response = await fetch('http://localhost:5000/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newKeyName,
          entityType,
          entityId: selectedEntityId
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setDisclosedKey(data.data.rawKey);
        setShowKeyModal(true);
        setNewKeyName('');
        setSuccess(`Successfully generated key: ${data.data.name}`);
        fetchApiKeys(); // reload keys list
      } else {
        throw new Error(data.message || 'Failed to generate key.');
      }
    } catch (err) {
      console.error('Generate key error:', err);
      setError(err.message || 'Server error occurred.');
    }
  };

  // Revoke/Delete a developer key
  const handleRevokeKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this developer API key? External systems using it will be blocked immediately.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      setError('');
      setSuccess('');
      const response = await fetch(`http://localhost:5000/api/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Developer key revoked successfully.');
        fetchApiKeys(); // reload list
      } else {
        throw new Error(data.message || 'Failed to revoke key.');
      }
    } catch (err) {
      console.error('Revoke key error:', err);
      setError(err.message || 'Server error occurred.');
    }
  };

  // Copy helper
  const handleCopy = (text, type = 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } else if (type === 'widget') {
      setCopiedWidget(true);
      setTimeout(() => setCopiedWidget(false), 2000);
    }
  };

  // Widget preview send chat message handler
  const handleWidgetSendMessage = async (e) => {
    e.preventDefault();
    if (!widgetInput.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: widgetInput
    };

    setWidgetMessages(prev => [...prev, userMsg]);
    setWidgetInput('');
    setIsWidgetTyping(true);

    // If using real API key, make streaming call
    if (widgetUseRealKey && widgetRealKey.trim() && entityType === 'agent') {
      try {
        const response = await fetch(`http://localhost:5000/api/v1/public/agents/${selectedEntityId}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${widgetRealKey}`
          },
          body: JSON.stringify({
            messages: [...widgetMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to fetch stream from public route.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMsg = {
          id: 'real-stream-' + Date.now(),
          role: 'assistant',
          content: ''
        };

        setWidgetMessages(prev => [...prev, assistantMsg]);
        setIsWidgetTyping(false);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          
          // Server event formats chunks as "data: {...}\n\n"
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.replace('data: ', ''));
                if (parsed.text) {
                  assistantMsg.content += parsed.text;
                  setWidgetMessages(prev => 
                    prev.map(m => m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m)
                  );
                } else if (parsed.content) {
                  assistantMsg.content += parsed.content;
                  setWidgetMessages(prev => 
                    prev.map(m => m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m)
                  );
                }
              } catch {
                // If chunk is raw text or simple json
                const cleanChunk = line.replace('data: ', '').trim();
                if (cleanChunk) {
                  assistantMsg.content += cleanChunk;
                  setWidgetMessages(prev => 
                    prev.map(m => m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m)
                  );
                }
              }
            } else if (line.trim() && !line.startsWith('event:')) {
              // Fallback raw text stream
              assistantMsg.content += line;
              setWidgetMessages(prev => 
                prev.map(m => m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m)
              );
            }
          }
        }
      } catch (err) {
        console.error('Widget live stream error:', err);
        setWidgetMessages(prev => [...prev, {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: `⚠️ API Error: ${err.message}. Please check your API Key and make sure the backend, FastAPI engine, and MCP database are running.`
        }]);
        setIsWidgetTyping(false);
      }
    } else {
      // Mock Response Simulator
      setTimeout(() => {
        setIsWidgetTyping(false);
        const replies = [
          `This is a mock streaming answer simulated inside the Chat Widget Integration preview for the entity ${selectedEntity?.name || 'entity'}.`,
          `I received your query: "${userMsg.content}". In production, the embeddable chat script streams the real LLM output through the secure SHA-256 intercepted gateway.`,
          `Feel free to generate a developer API Key in the "Developer API Keys" tab, toggle "Use Real API Key" below, paste the key, and test real end-to-end streaming!`,
        ];
        // Select a reply or cycle
        const replyText = replies[Math.floor(Math.random() * replies.length)];
        setWidgetMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: replyText
        }]);
      }, 1500);
    }
  };

  // Code snippets generator
  const getCodeSnippet = () => {
    const keyPlaceholder = 'sk_live_YOUR_GENERATED_API_KEY';
    const baseUrl = 'http://localhost:5000/api/v1/public';
    const id = selectedEntityId || '{entityId}';
    
    if (codeLang === 'curl') {
      return `curl -X POST "${baseUrl}/agents/${id}/chat/stream" \\
  -H "Authorization: Bearer ${keyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Analyze my calendar data for this week."
      }
    ]
  }'`;
    } else if (codeLang === 'node') {
      return `const axios = require('axios');

async function runAgentStream() {
  try {
    const response = await axios.post(
      '${baseUrl}/agents/${id}/chat/stream',
      {
        messages: [{ role: 'user', content: 'Analyze my calendar data for this week.' }]
      },
      {
        headers: {
          'Authorization': 'Bearer ${keyPlaceholder}',
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    console.log('Streaming response started:');
    response.data.on('data', chunk => {
      // Process SSE formatted chunks (data: {...})
      const lines = chunk.toString().split('\\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            process.stdout.write(parsed.text || parsed.content || '');
          } catch {
            process.stdout.write(line.replace('data: ', ''));
          }
        }
      }
    });

    response.data.on('end', () => {
      console.log('\\nStreaming completed.');
    });

  } catch (error) {
    console.error('Error contacting proxy stream:', error.message);
  }
}

runAgentStream();`;
    } else if (codeLang === 'python') {
      return `import requests
import json

url = "${baseUrl}/agents/${id}/chat/stream"
headers = {
    "Authorization": "Bearer ${keyPlaceholder}",
    "Content-Type": "application/json"
}
payload = {
    "messages": [
        {
            "role": "user",
            "content": "Analyze my calendar data for this week."
        }
    ]
}

print("Streaming response:")
try:
    response = requests.post(url, headers=headers, json=payload, stream=True)
    if response.status_code == 200:
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith('data: '):
                    try:
                        parsed = json.loads(decoded_line[6:])
                        print(parsed.get('text', parsed.get('content', '')), end='', flush=True)
                    except json.JSONDecodeError:
                        print(decoded_line[6:], end='', flush=True)
        print()
    else:
        print(f"Request failed with status code {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error connecting: {e}")`;
    }
    return '';
  };

  const getWidgetSnippet = () => {
    const keyPlaceholder = 'sk_live_YOUR_GENERATED_API_KEY';
    const id = selectedEntityId || '{entityId}';
    return `<!-- Sigil AI Atelier Chat Widget Integration -->
<div id="sigil-ai-atelier-chat-root"></div>
<script
  src="http://localhost:5000/api/v1/public/widget.js"
  data-agent-id="${id}"
  data-api-key="${keyPlaceholder}"
  async
></script>`;
  };

  return (
    <div className="flex-1 h-screen bg-[var(--bg-canvas)] flex flex-col relative overflow-hidden transition-all duration-200">
      
      {/* Top Header Panel */}
      <header className="bg-[var(--bg-card)] h-[64px] border-b border-[var(--border-color)] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-[#ff4d6d]">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[var(--text-main)] tracking-tight font-sans flex items-center gap-1.5">
              Integration Hub
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">
              Centralized API credentials, code proxy snippets, and widget integration guides for published entities.
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchCatalog}
          disabled={loading}
          className="flex items-center gap-2 py-1.5 px-3.5 bg-[var(--bg-card)] hover:bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold text-xs rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-150"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Catalog</span>
        </button>
      </header>

      {/* Main Container Stage */}
      <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
        
        {/* Error Alert Display */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500 flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(244,63,94,0.04)] animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-[#ff4d6d]" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success alert Display */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(16,185,129,0.04)] animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Catalog Selector Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 flex flex-col md:flex-row gap-6 items-center">
          
          {/* Entity Toggle switch */}
          <div className="w-full md:w-auto flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Entity Type
            </span>
            <div className="flex border border-[var(--border-color)] rounded-xl overflow-hidden p-1 bg-[var(--bg-canvas)] max-w-sm">
              <button
                type="button"
                onClick={() => handleEntityTypeChange('agent')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-5 font-semibold text-xs rounded-lg transition-all ${
                  entityType === 'agent'
                    ? 'bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-[#ff4d6d] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
                }`}
              >
                <CpuIcon className="w-3.5 h-3.5" />
                <span>Agent</span>
              </button>
              <button
                type="button"
                onClick={() => handleEntityTypeChange('workflow')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-5 font-semibold text-xs rounded-lg transition-all ${
                  entityType === 'workflow'
                    ? 'bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-[#ff4d6d] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
                }`}
              >
                <GitForkIcon className="w-3.5 h-3.5" />
                <span>Workflow</span>
              </button>
            </div>
          </div>

          {/* Scoped Entity Selector dropdown */}
          <div className="flex-1 w-full flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Select {entityType === 'agent' ? 'Agent' : 'Workflow'}
            </span>
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="w-full py-2.5 px-4 bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#ff4d6d]/20 focus:border-[#ff4d6d] transition-all cursor-pointer"
            >
              {entityType === 'agent' ? (
                agents.length > 0 ? (
                  agents.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} (live)
                    </option>
                  ))
                ) : (
                  <option value="">No published agents found</option>
                )
              ) : (
                workflows.map(w => (
                  <option key={w._id} value={w._id}>
                    {w.name} (live)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected Entity Details Card */}
        {selectedEntity ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#ff4d6d]" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-extrabold text-[var(--text-main)] tracking-tight">
                  {selectedEntity.name}
                </h2>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">
                {selectedEntity.description || `No description provided for this ${entityType}.`}
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-[var(--text-muted)]/75 select-text">
                <span className="bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded px-2 py-0.5 font-mono">
                  ID: {selectedEntity._id || selectedEntity.id}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-10 text-center text-xs font-semibold text-[var(--text-muted)]">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]/60" />
            Please configure and select a live entity to begin integration.
          </div>
        )}

        {/* Main Tabs Panel */}
        {selectedEntity && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
            
            {/* Tabs Header bar */}
            <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]/30">
              <button
                type="button"
                onClick={() => setActiveTab('keys')}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'keys'
                    ? 'border-[#ff4d6d] text-[#ff4d6d] bg-[var(--bg-card)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)]/50'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>DEVELOPER API KEYS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'code'
                    ? 'border-[#ff4d6d] text-[#ff4d6d] bg-[var(--bg-card)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)]/50'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SERVER PROXY CODE</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'chat'
                    ? 'border-[#ff4d6d] text-[#ff4d6d] bg-[var(--bg-card)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)]/50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>CHAT INTEGRATION</span>
              </button>
            </div>

            {/* Tab Contents staging */}
            <div className="p-6">
              
              {/* TAB 1: API Keys */}
              {activeTab === 'keys' && (
                <div className="space-y-6">
                  
                  {/* Generate Form */}
                  <form onSubmit={handleGenerateKey} className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      API Key Name (Scoped to {selectedEntity.name})
                    </label>
                    <div className="flex gap-3 max-w-2xl">
                      <input
                        type="text"
                        required
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder={`e.g. Key for ${selectedEntity.name}`}
                        className="flex-1 py-2.5 px-4 bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#ff4d6d]/20 focus:border-[#ff4d6d] placeholder-[var(--text-muted)]/50 font-medium transition-all"
                      />
                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 py-2.5 px-5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-md shadow-slate-900/10 hover:shadow-lg transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Generate</span>
                      </button>
                    </div>
                  </form>

                  {/* Active keys List */}
                  <div className="space-y-3 pt-2">
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Active API Keys for this {entityType === 'agent' ? 'Agent' : 'Workflow'}
                    </span>
                    
                    {keysLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2Icon className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                      </div>
                    ) : apiKeys.length > 0 ? (
                      <div className="border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                              <th className="py-3.5 px-5">Name</th>
                              <th className="py-3.5 px-5">Prefix</th>
                              <th className="py-3.5 px-5">Status</th>
                              <th className="py-3.5 px-5">Created At</th>
                              <th className="py-3.5 px-5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {apiKeys.map((key) => (
                              <tr key={key._id} className="text-xs text-[var(--text-main)] hover:bg-[var(--bg-sidebar)]/30 font-medium transition-all">
                                <td className="py-3.5 px-5 select-all">{key.name}</td>
                                <td className="py-3.5 px-5 font-mono select-all text-[11px] text-[var(--text-muted)]">{key.prefix}</td>
                                <td className="py-3.5 px-5">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                    {key.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-[var(--text-muted)]">
                                  {new Date(key.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    onClick={() => handleRevokeKey(key._id)}
                                    className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-rose-500/20 hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-all"
                                    title="Revoke Key"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border border-[var(--border-color)] border-dashed rounded-xl py-12 px-6 text-center text-xs font-semibold text-[var(--text-muted)] max-w-3xl">
                        <Lock className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]/40" />
                        No developer API keys created yet for this {entityType}. Generate one above to access the public stream APIs.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: Server Proxy Code */}
              {activeTab === 'code' && (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* Language switch */}
                  <div className="flex border border-[var(--border-color)] rounded-xl overflow-hidden p-1 bg-[var(--bg-canvas)] max-w-sm">
                    <button
                      onClick={() => setCodeLang('curl')}
                      className={`flex-1 py-1.5 px-4 font-semibold text-xs rounded-lg transition-all ${
                        codeLang === 'curl'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
                      }`}
                    >
                      cURL
                    </button>
                    <button
                      onClick={() => setCodeLang('node')}
                      className={`flex-1 py-1.5 px-4 font-semibold text-xs rounded-lg transition-all ${
                        codeLang === 'node'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
                      }`}
                    >
                      Node.js
                    </button>
                    <button
                      onClick={() => setCodeLang('python')}
                      className={`flex-1 py-1.5 px-4 font-semibold text-xs rounded-lg transition-all ${
                        codeLang === 'python'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
                      }`}
                    >
                      Python
                    </button>
                  </div>

                  {/* Code Block */}
                  <div className="relative border border-[var(--border-color)] bg-slate-950 rounded-2xl overflow-hidden shadow-md max-w-4xl">
                    
                    {/* Block Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 font-mono">
                      <span>{codeLang === 'curl' ? 'BASH' : codeLang === 'node' ? 'JAVASCRIPT (AXIOS)' : 'PYTHON'}</span>
                      
                      <button
                        onClick={() => handleCopy(getCodeSnippet(), 'code')}
                        className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded border border-slate-700 transition-all font-sans font-semibold text-[10px]"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Snippet</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Syntax Code Frame */}
                    <pre className="p-5 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre select-text">
                      {getCodeSnippet()}
                    </pre>

                  </div>
                  
                  {/* Scope Explainer */}
                  <div className="flex gap-2.5 p-4 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] leading-relaxed max-w-4xl font-medium">
                    <span className="text-rose-500 font-bold">Scope Notice:</span>
                    <span>
                      Developer tokens carry strict scopes. Calls made with a token scoped to a different agent or containing an invalid key format will fail with `403 Forbidden` or `401 Unauthorized` responses.
                    </span>
                  </div>

                </div>
              )}

              {/* TAB 3: Chat Integration */}
              {activeTab === 'chat' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Widget Script block */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-wider">
                        Embeddable Web Widget
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-0.5">
                        Add the following script block to your client-side website's HTML template before the closing `&lt;/body&gt;` tag.
                      </p>
                    </div>

                    <div className="relative border border-[var(--border-color)] bg-slate-950 rounded-2xl overflow-hidden shadow-md max-w-4xl">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 font-mono">
                        <span>HTML SCRIPT TAG</span>
                        <button
                          onClick={() => handleCopy(getWidgetSnippet(), 'widget')}
                          className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded border border-slate-700 transition-all font-sans font-semibold text-[10px]"
                        >
                          {copiedWidget ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Script</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-5 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre select-text">
                        {getWidgetSnippet()}
                      </pre>
                    </div>
                  </div>

                  {/* Widget Sandbox Guide */}
                  <div className="pt-2 border-t border-[var(--border-color)] max-w-4xl space-y-4">
                    <div>
                      <h3 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-wider">
                        Widget Sandbox Preview
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-0.5">
                        Click the floating message bubble on the bottom-right of this page to open and interact with the widget preview sandbox. You can stream simulated agent responses, or toggle real key execution to test endpoint routing directly.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsWidgetOpen(prev => !prev)}
                        className="flex items-center gap-2 py-2 px-4.5 bg-[#ff4d6d] hover:bg-[#ff4d6d]/90 active:bg-[#ff4d6d]/95 text-white font-semibold text-xs rounded-xl shadow-md shadow-[#ff4d6d]/10 hover:shadow-lg transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{isWidgetOpen ? 'Close Preview Sandbox' : 'Open Preview Sandbox'}</span>
                      </button>
                      
                      <div className="flex items-center gap-2 border border-[var(--border-color)] rounded-xl px-4 py-1.5 bg-[var(--bg-sidebar)]">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-[var(--text-muted)]">
                          <input
                            type="checkbox"
                            checked={widgetUseRealKey}
                            onChange={(e) => setWidgetUseRealKey(e.target.checked)}
                            className="rounded border-[var(--border-color)] text-[#ff4d6d] focus:ring-[#ff4d6d]"
                          />
                          <span>Use Real API Key stream</span>
                        </label>
                      </div>
                    </div>

                    {widgetUseRealKey && (
                      <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-2xl max-w-xl space-y-2.5 animate-slideDown">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            Paste Developer API Key
                          </label>
                          {apiKeys.length > 0 && (
                            <span className="text-[10px] text-[#ff4d6d] font-bold">
                              Prefix available in Keys tab
                            </span>
                          )}
                        </div>
                        <input
                          type="password"
                          value={widgetRealKey}
                          onChange={(e) => setWidgetRealKey(e.target.value)}
                          placeholder="sk_live_..."
                          className="w-full py-2 px-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-mono text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#ff4d6d]/20 focus:border-[#ff4d6d] transition-all"
                        />
                        <p className="text-[9px] text-[var(--text-muted)]/80 leading-normal font-medium">
                          Note: Real requests bypass local mocks and target the public gateway router `/api/v1/public/agents/{selectedEntityId}/chat/stream` injecting the token in authorization headers.
                        </p>
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* DISCLOSED KEY MODAL (ONLY VISIBLE ONCE) */}
      {showKeyModal && disclosedKey && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-xl rounded-2xl shadow-xl p-6 relative overflow-hidden animate-zoomIn">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-rose-500" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-[#ff4d6d] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-main)]">
                  Developer API Key Generated
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">
                  Scoped to {selectedEntity?.name || 'entity'}
                </p>
              </div>
            </div>

            {/* Warning Message block */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-700 flex items-start gap-2.5 mb-5 leading-normal">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Important security warning:</span> Copy your key now. You will not be able to retrieve it again.
              </div>
            </div>

            {/* Token Copy Container */}
            <div className="flex border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-sidebar)] shadow-inner mb-6">
              <input
                type="text"
                readOnly
                value={disclosedKey}
                className="flex-1 bg-transparent py-3 px-4 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none"
              />
              <button
                onClick={() => handleCopy(disclosedKey, 'code')}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-2 border-l border-[var(--border-color)] transition-all"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Close modal action */}
            <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setDisclosedKey(null);
                }}
                className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-all"
              >
                Close Key Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DYNAMIC CLIENT CHAT WIDGET SANDBOX PREVIEW */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        
        {/* Floating Bubble icon trigger */}
        {!isWidgetOpen && (
          <button
            onClick={() => setIsWidgetOpen(true)}
            className="w-14 h-14 bg-[#ff4d6d] hover:bg-[#ff4d6d]/90 active:bg-[#ff4d6d]/95 text-white rounded-full shadow-lg shadow-[#ff4d6d]/20 hover:shadow-xl flex items-center justify-center border border-[#ff4d6d]/10 transition-all duration-300 hover:scale-105"
            title="Open Chat Widget Preview"
          >
            <MessageCircle className="w-6 h-6 animate-pulse" />
          </button>
        )}

        {/* Sliding Widget Window */}
        {isWidgetOpen && (
          <div className="w-[360px] h-[500px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp transition-all select-none">
            
            {/* Widget Title Bar */}
            <header className="bg-rose-500 p-4 flex items-center justify-between border-b border-rose-600 text-white shadow-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-extrabold border border-white/25 text-sm">
                  {selectedEntity?.name ? selectedEntity.name.charAt(0) : 'Y'}
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs tracking-tight">
                    {selectedEntity?.name || 'Live Support Agent'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[9px] font-bold text-white/80 uppercase tracking-wide">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsWidgetOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Message Thread Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-canvas)] space-y-4 select-text">
              {widgetMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed font-medium shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                    msg.role === 'user'
                      ? 'bg-rose-500 text-white rounded-tr-none'
                      : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isWidgetTyping && (
                <div className="flex justify-start items-center gap-2.5 animate-fadeIn">
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl rounded-tl-none px-4 py-2 text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50 animate-bounce duration-300"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50 animate-bounce [animation-delay:0.2s] duration-300"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50 animate-bounce [animation-delay:0.4s] duration-300"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Widget Input Form */}
            <form onSubmit={handleWidgetSendMessage} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex gap-2 shrink-0">
              <input
                type="text"
                value={widgetInput}
                onChange={(e) => setWidgetInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 py-2 px-3.5 bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!widgetInput.trim() || isWidgetTyping}
                className="p-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
};

// Mini custom icons helpers to avoid missing import problems
const CpuIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M9 1v3" />
    <path d="M15 1v3" />
    <path d="M9 20v3" />
    <path d="M15 20v3" />
    <path d="M20 9h3" />
    <path d="M20 15h3" />
    <path d="M1 9h3" />
    <path d="M1 15h3" />
  </svg>
);

const GitForkIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
    <path d="M12 12v3" />
  </svg>
);

const Loader2Icon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`animate-spin ${props.className || ''}`}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default IntegrationHub;
