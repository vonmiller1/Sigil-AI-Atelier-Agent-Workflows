import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Trash2, 
  Bot, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  X
} from 'lucide-react';

const AgentRegistry = ({ activePage, setActivePage, activeAgent, setActiveAgent }) => {
  // Agent state lists
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');

  // Fetch registered agents from DB API
  const fetchAgents = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAgents(data.agents);
      } else {
        throw new Error(data.message || 'Failed to retrieve agents.');
      }
    } catch (err) {
      console.error('Fetch agents error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Action: Open specific Agent in Playground
  const openPlayground = (agent) => {
    setActiveAgent(agent);
    setActivePage('Playground');
  };

  // Action: Create Agent in MongoDB & Switch Tab
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newAgentName.trim(),
          description: newAgentDescription.trim()
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsModalOpen(false);
        setNewAgentName('');
        setNewAgentDescription('');
        setSuccess(`Agent "${data.agent.name}" created successfully.`);
        setTimeout(() => setSuccess(''), 4000);
        
        // Re-sync catalog and automatically redirect user to the Playground view for this new agent
        setAgents(prev => [data.agent, ...prev]);
        openPlayground(data.agent);
      } else {
        throw new Error(data.message || 'Failed to create agent');
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Action: Delete Agent from Registry DB
  const handleDeleteAgent = async (e, agentId, agentName) => {
    e.stopPropagation(); // Avoid triggering row click openPlayground
    
    if (!window.confirm(`Are you sure you want to delete agent "${agentName}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(`Agent "${agentName}" deleted successfully.`);
        setTimeout(() => setSuccess(''), 4000);
        
        // Clean local state list
        const updatedAgents = agents.filter(a => a._id !== agentId);
        setAgents(updatedAgents);
        
        // If we deleted the active agent, clear activeAgent so playground shows the default workspace again
        if (activeAgent?._id === agentId) {
          setActiveAgent(null);
        }
      } else {
        throw new Error(data.message || 'Failed to delete agent.');
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Date Formatter matching screen layout exactly e.g. 6/2/26, 3:51:19 AM
  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Filter agents array based on search input
  const filteredAgents = agents.filter(agent => {
    const term = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(term) ||
      (agent.description || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 min-h-screen bg-[var(--bg-canvas)] p-8 overflow-y-auto font-sans text-[var(--text-main)]">
      <div className="max-w-7xl mx-auto">
        {/* Header Banners for alert notifications */}
        {success && (
          <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700 flex items-center gap-2 animate-fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Heading title section */}
        <h1 className="text-[28px] font-bold tracking-tight font-sans">
          Agents
        </h1>

        {/* Search bar & Create Agent trigger */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search agents"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-[260px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:bg-[var(--bg-card)] focus:border-[var(--accent-color)] transition-all font-sans"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-5 bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold text-xs rounded-full shadow-sm hover:shadow-md transition-all duration-150"
          >
            <span>Create agent</span>
          </button>
        </div>

        {/* Conditional layout for empty list state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[var(--accent-color)] animate-spin" />
            <span className="text-xs text-[var(--text-muted)] animate-pulse">Syncing agent list...</span>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm p-12 text-center mt-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-4 text-[var(--accent-color)]">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">No agents registered</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed mt-2 mb-6">
              Create a specialized autonomous assistant to get started testing in the Playground workspace.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 py-2 px-5 bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold text-xs rounded-full shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create agent</span>
            </button>
          </div>
        ) : (
          /* Structured Agents Table representation matching screenshot */
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden mt-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-canvas)]/50">
                  <th className="py-4 px-6 font-semibold">Name</th>
                  <th className="py-4 px-6 font-semibold">Created on</th>
                  <th className="py-4 px-6 font-semibold">Description</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent._id}
                    onClick={() => openPlayground(agent)}
                    className="hover:bg-[var(--bg-canvas)]/60 cursor-pointer transition-colors duration-150"
                  >
                    <td className="py-4 px-6 text-sm font-semibold text-[var(--accent-color)] hover:underline max-w-xs truncate">
                      {agent.name}
                    </td>
                    <td className="py-4 px-6 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td className="py-4 px-6 text-xs text-[var(--text-muted)] max-w-sm truncate">
                      {agent.description || '--'}
                    </td>
                    <td className="py-4 px-6 text-xs text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDeleteAgent(e, agent._id, agent.name)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE AGENT FORM MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl max-w-md w-full relative overflow-hidden transition-all duration-200 animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-[var(--accent-color)]" />
            
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight">Create Agent</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 hover:bg-[var(--bg-canvas)] rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="p-6 space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Name Input
                </label>
                <input 
                  type="text" 
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g., Support Bot or DevOps Assistant"
                  className="block w-full px-3.5 py-2.5 bg-[var(--bg-canvas)] border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/10 rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/55 focus:outline-none transition-all shadow-sm font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Description Input
                </label>
                <textarea 
                  rows={3}
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="Describe the primary utility or role of this agent..."
                  className="block w-full px-3.5 py-2.5 bg-[var(--bg-canvas)] border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/10 rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-muted)]/55 focus:outline-none transition-all shadow-sm resize-none font-medium"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 bg-[var(--bg-canvas)] hover:bg-[var(--bg-canvas)]/80 border border-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold text-xs rounded-full shadow-sm hover:shadow-md transition-all font-sans"
                >
                  Confirm Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentRegistry;
