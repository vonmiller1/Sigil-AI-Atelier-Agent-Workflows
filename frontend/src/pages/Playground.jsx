import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft,
  ChevronDown,
  Sliders,
  Paperclip,
  Send,
  Check,
  Loader2,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Globe,
  Link,
  Link2Off,
  Brain,
  Wrench,
  Inbox,
  Activity,
  Database,
  X,
  Plus
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import DatabaseConnectionModal from '../components/knowledge/DatabaseConnectionModal';

const MicrosoftIcon = (props) => (
  <svg viewBox="0 0 23 23" className={props.className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="11" height="11" fill="#F25022"/>
    <rect x="12" width="11" height="11" fill="#7FBA00"/>
    <rect y="12" width="11" height="11" fill="#00A4EF"/>
    <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
  </svg>
);

const GmailIcon = (props) => (
  <svg viewBox="0 0 24 24" className={props.className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="#EAEAEA"/>
    <path d="M22 6v12c0 1.1-.9 2-2 2h-2V9.5L12 14.5 6 9.5V20H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h1l7 5 7-5h1c1.1 0 2 .9 2 2z" fill="#EA4335"/>
    <path d="M2 6v1c0 .54.21 1.03.56 1.41L7 12V4H4c-1.1 0-2 .9-2 2z" fill="#4285F4"/>
    <path d="M22 6c0-1.1-.9-2-2-2h-3v8l4.44-3.59C21.79 8.03 22 7.54 22 7V6z" fill="#34A853"/>
    <path d="M12 14.5L2.56 6.91A2 2 0 014 5.5h16c.55 0 1.05.22 1.41.59L12 14.5z" fill="#FBBC05"/>
  </svg>
);

const OutlookIcon = (props) => (
  <svg viewBox="0 0 24 24" className={props.className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5.5" y="4.5" width="15" height="13.5" rx="1.5" fill="#0078D4" />
    <path d="M5.5 6L13 11L20.5 6" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3.5" y="7.5" width="7.5" height="7.5" rx="1" fill="#106EBE" stroke="#FFFFFF" strokeWidth="0.8" />
    <text x="5.5" y="13.5" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="Segoe UI, sans-serif">O</text>
  </svg>
);

const formatMessageText = (text) => {
  if (text === null || text === undefined) return '';
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) {
    return text.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.text || JSON.stringify(item);
      }
      return '';
    }).join('');
  }
  if (typeof text === 'object') {
    return text.text || JSON.stringify(text);
  }
  return String(text);
};

const FormattedMessage = ({ text }) => {
  if (text === null || text === undefined) return null;
  const str = formatMessageText(text);
  const lines = str.split('\n');
  const elements = [];
  let currentList = [];
  
  const parseInlineStyles = (lineStr) => {
    if (!lineStr) return '';
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const splitParts = lineStr.split(regex);
    
    return splitParts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-[var(--text-main)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded font-mono text-[10.5px] text-[var(--accent-color)]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if it's a bullet list item
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    
    if (bulletMatch) {
      currentList.push(
        <li key={`li-${i}`} className="list-disc ml-4 mb-0.5 pl-0.5 text-xs text-[var(--text-main)]/90">
          {parseInlineStyles(bulletMatch[1])}
        </li>
      );
    } else if (numberedMatch) {
      currentList.push(
        <li key={`li-${i}`} className="list-decimal ml-4 mb-0.5 pl-0.5 text-xs text-[var(--text-main)]/90">
          {parseInlineStyles(numberedMatch[2])}
        </li>
      );
    } else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${i}`} className="my-1.5 list-inside space-y-0.5">
            {currentList}
          </ul>
        );
        currentList = [];
      }
      
      if (trimmed) {
        elements.push(
          <p key={`p-${i}`} className="mb-1 last:mb-0 leading-relaxed text-xs text-[var(--text-main)]/90">
            {parseInlineStyles(line)}
          </p>
        );
      } else if (i < lines.length - 1) {
        elements.push(<div key={`space-${i}`} className="h-1.5" />);
      }
    }
  }

  if (currentList.length > 0) {
    elements.push(
      <ul key="ul-final" className="my-1.5 list-inside space-y-0.5">
        {currentList}
      </ul>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

const TOOL_HIERARCHY = {
  google: {
    name: 'Google Workspace',
    subProviders: {
      gmail: {
        name: 'Gmail',
        tools: [
          { id: 'gmail_send_email', name: 'Send Email', description: 'Send an email via Gmail API' },
          { id: 'gmail_find_emails', name: 'Find Emails', description: 'Find emails in Gmail matching a query' },
          { id: 'gmail_read_emails', name: 'Read Email', description: 'Read details of a specific email by ID' },
          { id: 'gmail_list_labels', name: 'List Labels', description: 'List all labels in Gmail account' },
          { id: 'gmail_create_label', name: 'Create Label', description: 'Create a new custom label in Gmail' },
          { id: 'gmail_modify_email_labels', name: 'Modify Email Labels', description: 'Move/categorize emails by adding/removing label IDs' },
          { id: 'gmail_create_draft', name: 'Create Draft', description: 'Create a new draft email via Gmail API' }
        ]
      }
    }
  },
  microsoft: {
    name: 'Microsoft 365',
    subProviders: {
      outlook: {
        name: 'Outlook',
        tools: [
          { id: 'outlook_send_email', name: 'Send Email', description: 'Send an email via Microsoft Graph API' },
          { id: 'outlook_find_emails', name: 'Find Emails', description: 'Find emails in Outlook matching a query' },
          { id: 'outlook_read_emails', name: 'Read Email', description: 'Read details of a specific Outlook email' }
        ]
      }
    }
  },
  general: {
    name: 'Web & Search',
    subProviders: {
      search: {
        name: 'General Tools',
        tools: [
          { id: 'web_search', name: 'Web Search', description: 'Perform a general web search using search engines' },
          { id: 'get_current_weather', name: 'Get Current Weather', description: 'Retrieve the current weather conditions' }
        ]
      }
    }
  },
  database: {
    name: 'Database Tools',
    subProviders: {
      database_tools: {
        name: 'Database Queries',
        tools: [
          { id: 'read_db', name: 'Read Database', description: 'Run read-only SELECT queries on connected databases (e.g. metadata queries or table data SELECTs)' }
        ]
      }
    }
  }
};

// Custom Accordion Panel Component with smooth height and opacity transitions
const AccordionSection = ({ title, isOpen, onToggle, children, badge = null }) => {
  const contentRef = useRef(null);
  
  return (
    <div className="border-b border-[var(--border-color)] py-3.5 shrink-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left focus:outline-none py-1 group"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-main)] group-hover:text-[var(--accent-color)] transition-colors">{title}</span>
          {badge}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        ref={contentRef}
        style={{
          maxHeight: isOpen ? '2000px' : '0px',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s ease-in-out, opacity 0.4s ease-in-out'
        }}
        className="overflow-hidden"
      >
        <div className="pt-3 pb-1">
          {children}
        </div>
      </div>
    </div>
  );
};

const DEFAULT_INSTRUCTIONS = `**ROLE**\nYou are a dedicated translation engine for a backend workflow. Your ONLY purpose is to translate the user's input text into English.\n\n**STRICT RULES**\n1. Translate exactly as specified.\n2. Keep original format.`;

const Playground = ({ activePage, setActivePage, activeAgent, setActiveAgent }) => {
  // Playground model state selection
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKbIds, setSelectedKbIds] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [selectedDbIds, setSelectedDbIds] = useState([]);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isVectorStoresExpanded, setIsVectorStoresExpanded] = useState(false);
  const [isDatabasesExpanded, setIsDatabasesExpanded] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [agentTools, setAgentTools] = useState([]);
  const [showTraceLog, setShowTraceLog] = useState(true);
  const [traceLogs, setTraceLogs] = useState([]);
  const [expandedParams, setExpandedParams] = useState({});

  const [expandedProviders, setExpandedProviders] = useState({
    google: false,
    microsoft: false,
    general: false,
    database: false
  });
  const [expandedServices, setExpandedServices] = useState({
    gmail: false,
    outlook: false,
    search: false,
    database_tools: false
  });

  const toggleProvider = (provider) => {
    setExpandedProviders(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const toggleService = (service) => {
    setExpandedServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserProfile(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Fetch available knowledge bases and databases on mount
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/api/knowledge', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Filter to only show ready items
          const readyKbs = (data.data || []).filter(kb => kb.status === 'ready');
          setKnowledgeBases(readyKbs);
        }
      } catch (err) {
        console.error('Failed to fetch knowledge bases:', err);
      }
    };

    const fetchDatabases = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/api/databases', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDatabases(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch databases:', err);
      }
    };

    fetchKnowledgeBases();
    fetchDatabases();
  }, []);

  const handleConnect = (provider) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Center the popup window on the screen
    const width = 600;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popupUrl = `http://localhost:5000/api/auth/${provider}?token=${token}`;
    const popup = window.open(
      popupUrl,
      `Connect to ${provider}`,
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert("Popup blocked! Please allow popups for this site to log in.");
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        fetchUserProfile();
      }
    }, 1000);
  };

  const handleDisconnect = async (provider) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserProfile(prev => ({
          ...prev,
          oauth_vault: data.oauth_vault
        }));
        // Uncheck all tools for this provider since it is disconnected
        const toolsToRemove = [];
        if (provider === 'google') {
          toolsToRemove.push(...TOOL_HIERARCHY.google.subProviders.gmail.tools.map(t => t.id));
        } else if (provider === 'microsoft') {
          toolsToRemove.push(...TOOL_HIERARCHY.microsoft.subProviders.outlook.tools.map(t => t.id));
        }
        setAgentTools(prev => prev.filter(t => !toolsToRemove.includes(t)));
      } else {
        alert(data.message || `Failed to disconnect ${provider}`);
      }
    } catch (err) {
      console.error(`Disconnect error:`, err);
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  const renderProviderBundle = (key, bundle) => {
    const isGeneral = key === 'general';
    const vault = userProfile?.oauth_vault?.[key];
    const isServiceConnected = isGeneral || key === 'database' || (vault && vault.access_token && vault.email);
    const email = vault?.email;
    const isProviderExpanded = expandedProviders[key];

    // Select provider icon
    let ProviderIcon = Globe;
    if (key === 'google') ProviderIcon = FcGoogle;
    if (key === 'microsoft') ProviderIcon = MicrosoftIcon;
    if (key === 'database') ProviderIcon = Database;

    return (
      <div key={key} className="border border-[var(--border-color)] rounded-xl p-3 bg-[var(--bg-canvas)]/40 flex flex-col gap-2.5 transition-all">
        {/* Provider Header (Toggle for Sub-providers) */}
        <button
          type="button"
          onClick={() => toggleProvider(key)}
          className="w-full flex items-center justify-between text-left focus:outline-none group/prov"
        >
          <div className="flex items-center gap-2 truncate">
            <ProviderIcon className="w-4 h-4 shrink-0" />
            <span className="font-bold text-[var(--text-main)] group-hover/prov:text-[var(--accent-color)] transition-colors truncate">
              {bundle.name}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover/prov:text-[var(--text-main)] transition-transform duration-300 ease-in-out ${isProviderExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Sub-providers Container */}
        {isProviderExpanded && (
          <div className="flex flex-col gap-3.5 mt-1">
            {Object.entries(bundle.subProviders).map(([subKey, subService]) => {
              let ServiceIcon = Globe;
              if (subKey === 'gmail') ServiceIcon = GmailIcon;
              if (subKey === 'outlook') ServiceIcon = OutlookIcon;
              if (subKey === 'database_tools') ServiceIcon = Database;

              const isServiceExpanded = expandedServices[subKey];

              return (
                <div key={subKey} className="flex flex-col">
                  {/* Service Header Row */}
                  <div
                    onClick={() => isServiceConnected && toggleService(subKey)}
                    className={`flex items-center justify-between w-full pr-1.5 py-1 rounded hover:bg-[var(--bg-canvas)]/40 transition-colors ${
                      isServiceConnected ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-main)] pl-0.5">
                        <ServiceIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{subService.name}</span>
                        {isServiceConnected && (
                          <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${isServiceExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      {isServiceConnected && !isGeneral && key !== 'database' && (
                        <span className="text-[9px] text-emerald-600 font-medium pl-5 truncate" title={email}>
                          connected: {email}
                        </span>
                      )}
                    </div>

                    {!isGeneral && key !== 'database' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isServiceConnected) {
                            handleDisconnect(key);
                          } else {
                            handleConnect(key);
                          }
                        }}
                        className="p-1.5 hover:bg-[var(--bg-canvas)] rounded-full transition-colors cursor-pointer shrink-0"
                        title={isServiceConnected ? "Disconnect Account" : "Connect Account"}
                      >
                        {isServiceConnected ? (
                          <Link2Off className="w-3.5 h-3.5 text-red-500 hover:scale-110 transition-transform" />
                        ) : (
                          <Link className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--accent-color)] hover:scale-110 transition-transform" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Tools List (Only visible when connected & expanded) */}
                  {isServiceConnected && isServiceExpanded && (
                    <div className="flex flex-col gap-2 pl-5 mt-2 transition-all">
                      {subService.tools.map((tool) => {
                        const isChecked = agentTools.includes(tool.id);
                        const isDbDisabled = key === 'database' && selectedDbIds.length === 0;
                        return (
                          <div 
                            key={tool.id} 
                            onClick={() => {
                              if (isDbDisabled) return;
                              if (isChecked) {
                                setAgentTools(prev => prev.filter(id => id !== tool.id));
                              } else {
                                setAgentTools(prev => [...prev, tool.id]);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all duration-150 flex items-center gap-3 relative overflow-hidden ${
                              isDbDisabled 
                                ? 'opacity-40 cursor-not-allowed select-none bg-[var(--bg-canvas)]/30' 
                                : 'cursor-pointer'
                            } ${
                              isChecked && !isDbDisabled
                                ? 'border-[var(--accent-color)] bg-[var(--accent-light)]/10 border-l-4 border-l-[var(--accent-color)] pl-1.5'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-canvas)]/50'
                            }`}
                            title={isDbDisabled ? "Please select at least one database in the Knowledge panel first" : undefined}
                          >
                            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                              <ServiceIcon className="w-4 h-4 shrink-0" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[11px] text-[var(--text-main)] truncate">
                                {tool.name}
                              </span>
                              <span className="text-[9.5px] text-[var(--text-muted)] line-clamp-1 leading-normal">
                                {tool.description}
                              </span>
                              {isDbDisabled && (
                                <span className="text-[9px] text-amber-500 font-semibold mt-0.5">
                                  Disabled: Select database under Knowledge first.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const [connections, setConnections] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // validationStatus: 'idle' | 'verifying' | 'success' | 'error'
  const [validationStatus, setValidationStatus] = useState({ status: 'idle', message: '', code: null });

  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Validate a chosen model using backend + Python endpoint
  const validateModel = async (modelId, connectionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setValidationStatus({
        status: 'error',
        message: 'Your session has expired. Please log in again.',
        code: 401
      });
      return;
    }

    setValidationStatus({
      status: 'verifying',
      message: 'Checking model availability via Python...',
      code: null
    });

    try {
      const response = await fetch(`http://localhost:5000/api/connections/${connectionId}/test-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modelId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setValidationStatus({
          status: 'success',
          message: 'Model is active and responding successfully!',
          code: null
        });
      } else {
        setValidationStatus({
          status: 'error',
          message: data.message || 'Model call failed. Check your API configurations.',
          code: response.status || data.code || 400
        });
      }
    } catch (err) {
      console.error('Failed to validate model availability:', err.message);
      setValidationStatus({
        status: 'error',
        message: `Network error verifying model: ${err.message}`,
        code: 503
      });
    }
  };

  // Fetch connections and catalogs on mount
  useEffect(() => {
    const fetchPlaygroundModels = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingModels(true);
      setModelError('');

      try {
        // 1. Fetch saved connections
        const connResponse = await fetch('http://localhost:5000/api/connections', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const connData = await connResponse.json();
        if (!connResponse.ok || !connData.success) {
          throw new Error(connData.message || 'Failed to load connections.');
        }

        const activeConns = connData.connections || [];
        setConnections(activeConns);

        // 2. Fetch models for each connection in parallel
        const fetchedModels = [];
        await Promise.all(
          activeConns.map(async (conn) => {
            try {
              const modelRes = await fetch(`http://localhost:5000/api/connections/${conn.id}/models`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const modelData = await modelRes.json();
              if (modelRes.ok && modelData.success && Array.isArray(modelData.models)) {
                modelData.models.forEach((m) => {
                  fetchedModels.push({
                    id: m.id,
                    connectionId: conn.id,
                    providerName: conn.providerName
                  });
                });
              }
            } catch (err) {
              console.error(`Failed to load models for ${conn.providerName}:`, err.message);
            }
          })
        );

        setAllModels(fetchedModels);

        // 3. Handle default model selection and verification
        if (fetchedModels.length > 0) {
          let targetModel = selectedModel;
          let targetConnId = null;

          // If activeAgent model is set, try to use it
          if (activeAgent?.modelId) {
            const match = fetchedModels.find(m => m.id === activeAgent.modelId);
            if (match) {
              targetModel = match.id;
              targetConnId = match.connectionId;
            }
          }

          // If current model not matched, pick first available
          if (!targetConnId) {
            const currentMatch = fetchedModels.find(m => m.id === selectedModel);
            if (currentMatch) {
              targetConnId = currentMatch.connectionId;
            } else {
              targetModel = fetchedModels[0].id;
              targetConnId = fetchedModels[0].connectionId;
            }
          }

          setSelectedModel(targetModel);
          setSelectedConnectionId(targetConnId);
          
          // Trigger immediate validation for initially selected model
          if (targetConnId) {
            validateModel(targetModel, targetConnId);
          }
        }
      } catch (err) {
        console.error('Failed to initialize playground models:', err.message);
        setModelError(err.message);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchPlaygroundModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [playgroundConfig, setPlaygroundConfig] = useState({
    instructions: DEFAULT_INSTRUCTIONS,
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Accordion open/close state for Sidebar Config Panel
  const [expandedSections, setExpandedSections] = useState({
    instructions: true,
    tools: false,
    knowledge: false,
    memory: false,
    guardrail: false
  });

  const chatEndRef = useRef(null);

  // Auto-scroll chat window to bottom on new messages or typing indicator status
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Sync activeAgent if agent prop changes
  useEffect(() => {
    if (activeAgent) {
      setPlaygroundConfig({
        instructions: activeAgent.instructions || DEFAULT_INSTRUCTIONS
      });
      setChatMessages([]);
      setAgentTools(activeAgent.tools || []);
      
      const savedKnowledge = activeAgent.knowledge || [];
      const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(str);
      setSelectedKbIds(savedKnowledge.filter(id => !isObjectId(id)));
      setSelectedDbIds(savedKnowledge.filter(id => isObjectId(id)));

      if (activeAgent.connectionId) {
        setSelectedConnectionId(activeAgent.connectionId);
      }

      // Auto-validate activeAgent's model if we already loaded models
      if (activeAgent.modelId && allModels.length > 0) {
        const match = allModels.find(m => m.id === activeAgent.modelId);
        if (match) {
          setSelectedModel(match.id);
          setSelectedConnectionId(match.connectionId);
          validateModel(match.id, match.connectionId);
        } else {
          setSelectedModel(activeAgent.modelId);
          setValidationStatus({
            status: 'error',
            message: `Model '${activeAgent.modelId}' was not found in your saved connections catalog.`,
            code: 404
          });
        }
      } else if (activeAgent.modelId) {
        setSelectedModel(activeAgent.modelId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent, allModels]);

  // Compute dirty state
  const toolsChanged = JSON.stringify([...agentTools].sort()) !== JSON.stringify([...(activeAgent?.tools || [])].sort());
  
  const currentKnowledge = [...selectedKbIds, ...selectedDbIds].sort();
  const savedKnowledge = [...(activeAgent?.knowledge || [])].sort();
  const knowledgeChanged = JSON.stringify(currentKnowledge) !== JSON.stringify(savedKnowledge);

  const isDirty = activeAgent && (
    selectedModel !== (activeAgent.modelId || '') ||
    (selectedConnectionId ? selectedConnectionId.toString() : '') !== (activeAgent.connectionId ? activeAgent.connectionId.toString() : '') ||
    playgroundConfig.instructions !== (activeAgent.instructions || DEFAULT_INSTRUCTIONS) ||
    toolsChanged ||
    knowledgeChanged
  );

  // Action: Save configuration changes to the database
  const handleSave = async () => {
    if (!activeAgent || !isDirty || isSaving) return;
    
    setIsSaving(true);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Your session has expired. Please log in again.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/agents/${activeAgent._id || activeAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          modelId: selectedModel,
          instructions: playgroundConfig.instructions,
          tools: agentTools,
          knowledge: [...selectedKbIds, ...selectedDbIds]
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sync parent/local state
        setActiveAgent(data.agent);
        setValidationStatus({
          status: 'success',
          message: 'Agent configuration saved successfully!',
          code: null
        });
      } else {
        alert(data.message || 'Failed to save agent configuration.');
      }
    } catch (err) {
      console.error('Failed to save agent configuration:', err);
      alert(`Network error saving agent configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Call live model API
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsgText = chatInput.trim();
    const userMessage = { sender: 'user', text: userMsgText };
    
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: 'Error: Session expired. Please log in again.' }
      ]);
      setIsChatLoading(false);
      return;
    }

    if (!selectedConnectionId) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: 'Error: No active connection selected. Please select a model with an active connection.' }
      ]);
      setIsChatLoading(false);
      return;
    }

    setTraceLogs([]);
    setExpandedParams({});

    try {
      // Map message log to standard OpenAI format
      const formattedMessages = [
        ...chatMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: 'user', content: userMsgText }
      ];

      const response = await fetch(`http://localhost:5000/api/connections/${selectedConnectionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          modelId: selectedModel,
          messages: formattedMessages,
          tools: agentTools,
          instructions: playgroundConfig.instructions,
          active_kb_ids: knowledgeBases
            .filter(kb => selectedKbIds.includes(kb.kb_id))
            .map(kb => ({ kb_id: kb.kb_id, name: kb.name })),
          active_db_ids: databases
            .filter(db => selectedDbIds.includes(db._id))
            .map(db => ({ db_id: db._id, name: db.name, engine: db.engine }))
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save last partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (!dataStr) continue;
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'final_output') {
                setChatMessages((prev) => [
                  ...prev,
                  { sender: 'agent', text: formatMessageText(event.output) || 'Empty response' }
                ]);
              } else if (event.type === 'error') {
                setChatMessages((prev) => [
                  ...prev,
                  { sender: 'agent', text: `Error: ${event.message}` }
                ]);
              } else {
                // Trace events (on_llm_start, on_tool_start, on_tool_end)
                setTraceLogs((prev) => [...prev, event]);
              }
            } catch (jsonErr) {
              console.error('Failed to parse SSE event:', jsonErr, dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat execution failed:', err);
      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: `Network error connecting to model: ${err.message}` }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // RENDER ELEMENT A: DEFAULT WORKSPACE IF ON PLAYGROUND PAGE BUT NO AGENT NAVIGATION HAS BEEN MADE YET
  if (!activeAgent) {
    return (
      <div className="flex-1 h-screen bg-[var(--bg-canvas)] flex flex-col relative overflow-hidden transition-all duration-200 font-sans select-none text-[var(--text-main)]">
        
        {/* Top Header Row for Workspace Title */}
        <header className="bg-[var(--bg-card)] h-[64px] border-b border-[var(--border-color)] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all shrink-0">
          <h1 className="text-sm font-bold tracking-tight">
            Playground
          </h1>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Sigil AI Atelier Platform Canvas
          </div>
        </header>

        {/* Dynamic Content Center Stage */}
        <div className="flex-1 flex items-center justify-center p-8">
          
          {/* Centered Dynamic Page Card with elegant clean borders */}
          <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm p-10 text-center relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent-color)]" />
            
            <div className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-widest mb-2">
              Active Workspace State
            </div>
            
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
              Playground page
            </h2>
            
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              This module dynamically renders within the right workspace grid. Reusable hooks are tracking active menu state transitions in real time.
            </p>

            {/* Micro structural highlight block to ground the view */}
            <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex items-center justify-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                Verified & Connected
              </span>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // RENDER ELEMENT B: RICH PLAYGROUND PANEL WORKSPACE LAYOUT (ONLY ONCE NAVIGATED / ACTIVED)
  return (
    <div className="flex-1 h-screen bg-[var(--bg-canvas)] flex flex-col overflow-hidden select-none font-sans text-[var(--text-main)]">
      
      {/* 1. PLAYGROUND TOP NAVIGATION HEADER BAR */}
      <div className="h-[78px] shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 flex items-center justify-between z-10">
        <div className="flex flex-col justify-center h-full">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => {
                setActivePage('Agent Registry');
              }}
              className="p-1 hover:bg-[var(--bg-canvas)] rounded-full transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
            </button>
            <span className="text-[19px] font-bold tracking-tight">{activeAgent?.name}</span>
            <span className="w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center text-white shrink-0 shadow-sm shadow-[#10b981]/15">
              <svg className="w-2.5 h-2.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <div className="flex items-center mt-2.5">
            <span className="text-[13px] font-bold text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] px-1 pb-1.5 transition-all">Playground</span>
          </div>
        </div>
        
        {/* Top bar right utilities */}
        <div className="flex items-center gap-3">
          <button 
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
              isDirty && !isSaving
                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white hover:bg-[var(--accent-color)]/95 shadow-sm shadow-[var(--accent-color)]/10 cursor-pointer active:scale-95'
                : 'bg-[var(--bg-canvas)] text-[var(--text-muted)]/50 border-[var(--border-color)] cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                Saving...
              </span>
            ) : 'Save'}
          </button>
          <div className="relative">
            <button 
              onClick={() => alert('Publishing configuration states...')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-canvas)] text-[var(--text-main)] text-xs font-bold rounded-full shadow-sm transition-all duration-150"
            >
              <span>Publish</span>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID PANELS */}
      <div className="flex-1 w-full flex overflow-hidden">
        
        {/* LEFT COLUMN: ACCORDION CONFIGURATION PANEL */}
        <div className="w-[360px] shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-card)] p-5 overflow-y-auto flex flex-col gap-4">
          
          {/* Active Model Dropdown Selection (Dynamic Connections Mapped) */}
          <div className="flex flex-col mb-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 flex items-center justify-between text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-canvas)]/80 transition-colors focus:outline-none focus:border-[var(--accent-color)]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Cpu className="w-3.5 h-3.5 text-[var(--accent-color)] shrink-0" />
                    <span className="truncate">Model: {selectedModel}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${showModelDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showModelDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto p-2 flex flex-col gap-1.5 animate-fade-in font-sans">
                    {loadingModels ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-[var(--text-muted)]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
                        <span>Loading catalogs...</span>
                      </div>
                    ) : modelError ? (
                      <div className="p-3 text-xs text-[var(--text-muted)] italic text-center">
                        {modelError}
                      </div>
                    ) : allModels.length === 0 ? (
                      <div className="p-3 text-xs text-[var(--text-muted)] italic text-center">
                        No saved connections found. Go to Provider Keys to add one.
                      </div>
                    ) : (
                      connections.map((conn) => {
                        const connModels = allModels.filter((m) => m.connectionId === conn.id);
                        if (connModels.length === 0) return null;
                        return (
                          <div key={conn.id} className="flex flex-col gap-1">
                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 pt-1.5 pb-0.5 bg-[var(--bg-canvas)]/40 rounded-md">
                              {conn.providerName}
                            </div>
                            {connModels.map((m) => {
                              const isSelected = selectedModel === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(m.id);
                                    setSelectedConnectionId(m.connectionId);
                                    setShowModelDropdown(false);
                                    validateModel(m.id, m.connectionId);
                                  }}
                                  className={`w-full text-left py-2 px-2.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-all ${
                                    isSelected
                                      ? 'bg-[var(--accent-color)] text-white'
                                      : 'text-[var(--text-main)] hover:bg-[var(--bg-canvas)]'
                                  }`}
                                >
                                  <span className="truncate">{m.id}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => selectedConnectionId && validateModel(selectedModel, selectedConnectionId)}
                className="p-2.5 bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-canvas)]/80 transition-colors flex items-center justify-center shrink-0"
                title="Retest model availability"
              >
                <Sliders className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Model Verification Status Bar / Error Banner */}
            {validationStatus.status !== 'idle' && (
              <div className="mt-2 transition-all duration-300">
                {validationStatus.status === 'verifying' && (
                  <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-color)] flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
                    <span className="font-semibold animate-pulse">{validationStatus.message}</span>
                  </div>
                )}
                {validationStatus.status === 'success' && (
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2 text-[10px] text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-fade-in" />
                    <span className="font-bold">{validationStatus.message}</span>
                  </div>
                )}
                {validationStatus.status === 'error' && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex flex-col gap-1 text-[10px] text-red-600 leading-relaxed shadow-sm animate-fade-in">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>Error {validationStatus.code ? `[${validationStatus.code}]` : ''}</span>
                    </div>
                    <p className="font-medium text-[9.5px] pl-5">{validationStatus.message}</p>
                    <p className="font-semibold mt-1 text-[9.5px] border-t border-red-500/10 pt-1.5 text-red-500/85 pl-5 italic">
                      Please choose a different model.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expandable/Collapsible Accordion configuration layers (Instructions is detailed, others cleared with "About to write") */}
          
          {/* ACCORDION 1: INSTRUCTIONS */}
          <AccordionSection
            title="Instructions"
            isOpen={expandedSections.instructions}
            onToggle={() => toggleSection('instructions')}
          >
            <textarea
              value={playgroundConfig.instructions}
              onChange={(e) => setPlaygroundConfig({...playgroundConfig, instructions: e.target.value})}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-lg p-3 text-xs font-sans text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-color)] resize-none h-[180px] leading-relaxed shadow-sm font-medium"
              placeholder="Describe the instructions..."
            />
          </AccordionSection>

          {/* ACCORDION 2: TOOLS */}
          <AccordionSection
            title="Tools"
            isOpen={expandedSections.tools}
            onToggle={() => toggleSection('tools')}
          >
            <div className="flex flex-col gap-4 font-sans text-xs">
              {renderProviderBundle('google', TOOL_HIERARCHY.google)}
              {renderProviderBundle('microsoft', TOOL_HIERARCHY.microsoft)}
              {renderProviderBundle('general', TOOL_HIERARCHY.general)}
              {renderProviderBundle('database', TOOL_HIERARCHY.database)}
            </div>
          </AccordionSection>

          {/* ACCORDION 3: KNOWLEDGE */}
          <AccordionSection
            title="Knowledge"
            isOpen={expandedSections.knowledge}
            onToggle={() => toggleSection('knowledge')}
          >
            <div className="flex flex-col gap-4 font-sans text-xs">
              {/* Collapsible Section 1: Vector Stores */}
              <div className="flex flex-col">
                <div
                  onClick={() => setIsVectorStoresExpanded(prev => !prev)}
                  className="flex items-center justify-between w-full pr-1.5 py-1 rounded hover:bg-[var(--bg-canvas)]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-main)] pl-0.5">
                    <Brain className="w-3.5 h-3.5 shrink-0 text-[var(--accent-color)]" />
                    <span>Vector Stores</span>
                    <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${isVectorStoresExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isVectorStoresExpanded && (
                  <div className="flex flex-col gap-2 pl-5 mt-2 transition-all">
                    {knowledgeBases.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)] italic py-1 font-medium font-sans">
                        No active vector stores found.
                      </div>
                    ) : (
                      knowledgeBases.map((kb) => {
                        const isChecked = selectedKbIds.includes(kb.kb_id);
                        return (
                          <div 
                            key={kb.kb_id} 
                            onClick={() => {
                              if (isChecked) {
                                setSelectedKbIds(prev => prev.filter(id => id !== kb.kb_id));
                              } else {
                                setSelectedKbIds(prev => [...prev, kb.kb_id]);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all duration-150 flex items-center gap-3 relative overflow-hidden cursor-pointer ${
                              isChecked
                                ? 'border-[var(--accent-color)] bg-[var(--accent-light)]/10 border-l-4 border-l-[var(--accent-color)] pl-1.5'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-canvas)]/50'
                            }`}
                          >
                            <div className="w-5 h-5 shrink-0 flex items-center justify-center text-[var(--accent-color)]">
                              <Brain className="w-4 h-4 shrink-0" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[11px] text-[var(--text-main)] truncate font-sans">
                                {kb.name}
                              </span>
                              <span className="text-[9.5px] text-[var(--text-muted)] font-medium font-sans leading-none mt-0.5">
                                Vector Index RAG Context
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Divider line */}
              <div className="h-[1px] bg-[var(--border-color)]" />

              {/* Collapsible Section 2: Databases */}
              <div className="flex flex-col">
                <div
                  onClick={() => setIsDatabasesExpanded(prev => !prev)}
                  className="flex items-center justify-between w-full pr-1.5 py-1 rounded hover:bg-[var(--bg-canvas)]/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-main)] pl-0.5">
                    <Database className="w-3.5 h-3.5 shrink-0 text-[var(--accent-color)]" />
                    <span>Databases</span>
                    <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${isDatabasesExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isDatabasesExpanded && (
                  <div className="flex flex-col gap-2 pl-5 mt-2 transition-all">
                    {databases.length === 0 ? (
                      <div className="flex flex-col gap-2 items-start py-1">
                        <div className="text-xs text-[var(--text-muted)] italic font-medium font-sans">
                          No databases connected.
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDbModalOpen(true)}
                          className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-md bg-[var(--accent-light)] border border-[var(--accent-color)]/20 text-[var(--accent-color)] hover:bg-[var(--accent-light)]/80 transition-all cursor-pointer"
                        >
                          Connect Database
                        </button>
                      </div>
                    ) : (
                      databases.map((db) => {
                        const isChecked = selectedDbIds.includes(db._id);
                        return (
                          <div 
                            key={db._id} 
                            onClick={() => {
                              if (isChecked) {
                                setSelectedDbIds(prev => prev.filter(id => id !== db._id));
                              } else {
                                setSelectedDbIds(prev => [...prev, db._id]);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all duration-150 flex items-center gap-3 relative overflow-hidden cursor-pointer ${
                              isChecked
                                ? 'border-[var(--accent-color)] bg-[var(--accent-light)]/10 border-l-4 border-l-[var(--accent-color)] pl-1.5'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-canvas)]/50'
                            }`}
                          >
                            <div className="w-5 h-5 shrink-0 flex items-center justify-center text-[var(--accent-color)]">
                              <Database className="w-4 h-4 shrink-0" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[11px] text-[var(--text-main)] truncate font-sans">
                                {db.name}
                              </span>
                              <span className="text-[9px] uppercase font-bold bg-[var(--border-color)] px-1 rounded text-[var(--text-muted)] self-start mt-0.5 tracking-wide font-sans">
                                {db.engine}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* ACCORDION 4: MEMORY with Preview Badge (Cleared to show "About to write") */}
          <AccordionSection
            title="Memory"
            isOpen={expandedSections.memory}
            onToggle={() => toggleSection('memory')}
            badge={<span className="px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wide border border-[var(--border-color)]">Preview</span>}
          >
            <div className="text-xs text-[var(--text-muted)] italic py-1 font-medium font-sans">
              About to write
            </div>
          </AccordionSection>

          {/* ACCORDION 5: GUARDRAIL with Preview Badge (Cleared to show "About to write") */}
          <AccordionSection
            title="Guardrail"
            isOpen={expandedSections.guardrail}
            onToggle={() => toggleSection('guardrail')}
            badge={<span className="px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wide border border-[var(--border-color)]">Preview</span>}
          >
            <div className="text-xs text-[var(--text-muted)] italic py-1 font-medium font-sans">
              About to write
            </div>
          </AccordionSection>

        </div>

        {/* MIDDLE COLUMN: MAIN CHAT ARENA VIEW */}
        <div className="flex-1 flex flex-col bg-[var(--bg-canvas)] p-5 overflow-hidden">
          
          {/* Inner card panel structure */}
          <div className="flex-1 flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden relative">
            
            {/* Inner top Chat tab indicator */}
            <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] px-1 pb-3 pt-3.5 transition-all">Chat</span>
              <button
                type="button"
                onClick={() => setShowTraceLog(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  showTraceLog
                    ? 'bg-[var(--accent-light)] border-[var(--accent-color)] text-[var(--accent-color)]'
                    : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="Toggle Agent Thought Process Panel"
              >
                <Activity className="w-3 h-3" />
                <span>Thought Process</span>
              </button>
            </div>

            {/* Conversational logs display scrolling area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 ? (
                /* Empty Chat canvas state showing name and test instruction */
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <h2 className="text-2xl font-bold tracking-tight">{activeAgent?.name}</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">Send a message to start testing your agent</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className="flex items-start gap-2.5 max-w-[70%]">
                      {msg.sender === 'agent' && (
                        <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] border border-[var(--border-color)] text-[var(--accent-color)] flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {activeAgent?.name ? activeAgent.name.slice(0, 2).toUpperCase() : 'AG'}
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[var(--accent-color)] text-white rounded-tr-none shadow-sm shadow-[var(--accent-color)]/10'
                          : 'bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-none shadow-sm'
                      }`}>
                        <FormattedMessage text={msg.text} />
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start gap-2.5 max-w-[70%]">
                    <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] border border-[var(--border-color)] text-[var(--accent-color)] flex items-center justify-center shrink-0 text-[10px] font-bold">
                      {activeAgent?.name ? activeAgent.name.slice(0, 2).toUpperCase() : 'AG'}
                    </div>
                    <div className="rounded-2xl px-4 py-2.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-tl-none shadow-sm flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom active chat message bar input field */}
            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] shrink-0">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                <div className="relative flex items-center border border-[var(--border-color)] focus-within:border-[var(--accent-color)] focus-within:ring-2 focus-within:ring-[var(--accent-color)]/5 rounded-lg bg-[var(--bg-canvas)] transition-all overflow-hidden">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message the agent..."
                    className="flex-1 bg-transparent px-4 py-3 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none font-sans font-medium"
                  />
                  <div className="flex items-center gap-1.5 px-3 shrink-0">
                    <button type="button" className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-color)] disabled:opacity-40 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Purple active bottom focus line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent-color)] opacity-0 focus-within:opacity-100 transition-opacity" />
                </div>
              </form>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: AGENT THOUGHT PROCESS/TRACE LOG PANEL */}
        {showTraceLog && (
          <div className="w-[340px] shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col overflow-hidden animate-fade-in font-sans p-5">
            <div className="h-10 border-b border-[var(--border-color)] bg-[var(--bg-card)] pb-3 flex items-center justify-between shrink-0 mb-4">
              <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Thought Process</span>
              {traceLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTraceLogs([])}
                  className="text-[9px] font-bold text-red-500 hover:underline uppercase cursor-pointer"
                >
                  Clear Logs
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {traceLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Brain className="w-8 h-8 text-[var(--text-muted)]/40 mb-2.5 animate-pulse" />
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">No execution logs found. Send a message to watch the ReAct agent steps run in real time.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative pl-3 border-l border-[var(--border-color)] ml-2">
                  {traceLogs.map((item, idx) => {
                    const isExpanded = !!expandedParams[idx];
                    
                    if (item.type === 'on_llm_start') {
                      return (
                        <div key={idx} className="relative flex gap-3.5 items-start animate-fade-in">
                          <div className="absolute -left-[20.5px] top-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-[var(--bg-card)] shrink-0" />
                          <div className="flex-1 bg-[var(--bg-canvas)]/50 border border-[var(--border-color)] rounded-xl p-3 text-xs shadow-sm">
                            <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)] mb-1">
                              <Brain className="w-3.5 h-3.5 text-purple-500" />
                              <span>Model Thinking</span>
                            </div>
                            <p className="text-[var(--text-muted)] font-medium leading-relaxed">{item.message}</p>
                          </div>
                        </div>
                      );
                    }
                    
                    if (item.type === 'on_tool_start') {
                      return (
                        <div key={idx} className="relative flex gap-3.5 items-start animate-fade-in">
                          <div className="absolute -left-[20.5px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-[var(--bg-card)] shrink-0" />
                          <div className="flex-1 bg-[var(--bg-canvas)]/50 border border-[var(--border-color)] rounded-xl p-3 text-xs shadow-sm">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                                <Wrench className="w-3.5 h-3.5 text-amber-500" />
                                <span className="truncate">Executing: {item.tool}</span>
                              </div>
                              {item.input && Object.keys(item.input).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedParams(p => ({ ...p, [idx]: !p[idx] }))}
                                  className="text-[9px] font-bold uppercase text-[var(--accent-color)] hover:underline cursor-pointer"
                                >
                                  {isExpanded ? 'Hide' : 'Params'}
                                </button>
                              )}
                            </div>
                            {isExpanded && item.input && (
                              <pre className="mt-2 text-[9.5px] p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-x-auto text-[var(--text-main)] max-h-40 font-mono">
                                {JSON.stringify(item.input, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    if (item.type === 'on_tool_end') {
                      return (
                        <div key={idx} className="relative flex gap-3.5 items-start animate-fade-in">
                          <div className="absolute -left-[20.5px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] shrink-0" />
                          <div className="flex-1 bg-[var(--bg-canvas)]/50 border border-[var(--border-color)] rounded-xl p-3 text-xs shadow-sm">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                                <Inbox className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Return Received</span>
                              </div>
                              {item.output && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedParams(p => ({ ...p, [idx]: !p[idx] }))}
                                  className="text-[9px] font-bold uppercase text-[var(--accent-color)] hover:underline cursor-pointer"
                                >
                                  {isExpanded ? 'Hide' : 'Payload'}
                                </button>
                              )}
                            </div>
                            {isExpanded && item.output && (
                              <pre className="mt-2 text-[9.5px] p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-x-auto text-[var(--text-main)] max-h-48 font-mono whitespace-pre-wrap break-all leading-normal">
                                {typeof item.output === 'string' ? item.output : JSON.stringify(item.output, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Centered Create Database Connection Overlay Modal */}
      <DatabaseConnectionModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onSuccess={(newDb) => {
          // Refetch databases list
          const token = localStorage.getItem('token');
          if (token) {
            fetch('http://localhost:5000/api/databases', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setDatabases(data.data || []);
              }
            })
            .catch(err => console.error('Failed to refetch databases:', err));
          }
        }}
      />



    </div>
  );
};

export default Playground;
