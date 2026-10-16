import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Key, 
  RefreshCw, 
  Server, 
  Folder, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X,
  Lock,
  Search,
  BookOpen
} from 'lucide-react';

const DatabaseSummary = ({ database, onRefresh, onBack }) => {
  const [liveSchema, setLiveSchema] = useState([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [schemaError, setSchemaError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rotate secrets modal
  const [isRotationOpen, setIsRotationOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  const fetchSchema = useCallback(async (forceNocache = false) => {
    setIsLoadingSchema(true);
    setSchemaError(null);
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/databases/${database?._id}/schema${forceNocache ? '?nocache=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setLiveSchema(data.schema || []);
        if (data.schema && data.schema.length > 0) {
          setSelectedTable(data.schema[0].table);
        } else {
          setSelectedTable(null);
        }
      } else {
        setSchemaError(data.message || 'Unable to reflect database catalog.');
      }
    } catch (err) {
      setSchemaError(err.message || 'Network error reflecting schema.');
    } finally {
      setIsLoadingSchema(false);
    }
  }, [database?._id]);

  useEffect(() => {
    if (database?._id) {
      fetchSchema(false);
    }
  }, [database?._id, fetchSchema]);

  const handleOpenRotation = () => {
    setNewPassword('');
    setError('');
    setTestResult(null);
    setIsRotationOpen(true);
  };

  const handleRotateCredentials = async (e) => {
    e.preventDefault();
    if (newPassword === undefined || newPassword === null) {
      setError('Password parameter is missing.');
      return;
    }

    setIsTesting(true);
    setError('');
    setTestResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/databases/${database._id}/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({ success: true, message: data.message });
        setTimeout(() => {
          setIsRotationOpen(false);
          onRefresh(); // Refresh details in parent page
          fetchSchema(true); // Refresh schema with new credentials (bypass cache)
        }, 1500);
      } else {
        setTestResult({ success: false, message: data.message || 'Credential verification failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Error occurred.' });
    } finally {
      setIsTesting(false);
    }
  };

  const filteredTables = liveSchema.filter(t => 
    t.table.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTableData = liveSchema.find(t => t.table === selectedTable);

  return (
    <div className="flex flex-col gap-6">
      
      {/* DB Summary Metadata Panel */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent-color)] border border-[var(--accent-color)]/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-[var(--text-main)] leading-none">{database.name}</h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                database.status === 'Connected' 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : 'bg-rose-500/10 text-rose-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${database.status === 'Connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {database.status}
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Server className="w-4 h-4" /> {database.host}:{database.port}</span>
              <span className="flex items-center gap-1.5"><Folder className="w-4 h-4" /> {database.databaseName}</span>
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {database.username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenRotation}
            className="inline-flex items-center gap-2 py-2 px-4 border border-[var(--border-color)] hover:bg-[var(--bg-canvas)] text-[var(--text-main)] font-bold text-sm rounded-full transition-all focus:outline-none"
          >
            <Key className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Rotate Password</span>
          </button>
        </div>
      </div>

      {/* Main Workspace split panel: Schema Explorer & Details */}
      {isLoadingSchema ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-16 flex flex-col items-center justify-center min-h-[450px] shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-color)] mb-4" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Reflecting live database catalog...</p>
        </div>
      ) : schemaError ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-12 flex flex-col items-center justify-center min-h-[450px] shadow-[0_2px_8px_rgba(0,0,0,0.015)] text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-rose-500">Unable to reflect schema</h4>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed mt-2">
            Unable to reflect schema. The database may be unreachable or credentials expired.
          </p>
          <button 
            onClick={() => fetchSchema(true)}
            className="mt-6 inline-flex items-center gap-2 py-2 px-5 bg-[var(--accent-color)] text-white hover:opacity-90 font-bold text-sm rounded-full shadow-sm transition-all focus:outline-none"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Reflection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left column: Tables list */}
          <div className="lg:col-span-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent-color)]" />
                Database Tables ({filteredTables.length})
              </span>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[var(--border-color)] bg-[var(--bg-canvas)] text-[var(--text-main)] placeholder-[var(--text-muted)]/50 rounded-lg text-sm focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
              />
            </div>

            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
              {filteredTables.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">No tables found.</p>
              ) : (
                filteredTables.map((table) => (
                  <button
                    key={table.table}
                    onClick={() => setSelectedTable(table.table)}
                    className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all duration-150 flex items-center justify-between gap-2 ${
                      selectedTable === table.table
                        ? 'border-[var(--accent-color)] bg-[var(--accent-light)]/20 shadow-sm'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-canvas)]/50'
                    }`}
                  >
                    <span className="font-bold text-[var(--text-main)] font-mono text-sm truncate">{table.table}</span>
                    <span className="text-xs bg-[var(--accent-light)]/40 text-[var(--accent-color)] px-2 py-0.5 rounded-full font-semibold shrink-0">
                      [{table.columns.length}]
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right column: Schema detailed mapping / Column explorer */}
          <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] min-h-[450px] flex flex-col justify-between">
            {selectedTableData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h4 className="text-base font-extrabold text-[var(--text-main)] font-mono">
                      schema / {selectedTable}
                    </h4>
                    <p className="text-sm text-[var(--text-muted)] mt-1.5">
                      Inspected columns and data types derived from SQLAlchemy connection pooling schema manager.
                    </p>
                  </div>
                </div>

                {/* Columns Table */}
                <div className="overflow-x-auto border border-[var(--border-color)] rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-canvas)]/55">
                        <th className="py-2.5 px-4 font-bold font-sans">Column Name</th>
                        <th className="py-2.5 px-4 font-bold font-sans">Type</th>
                        <th className="py-2.5 px-4 font-bold font-sans">Nullable</th>
                        {selectedTableData.foreign_keys?.length > 0 && (
                          <th className="py-2.5 px-4 font-bold font-sans">Relationships</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] font-mono text-xs text-[var(--text-main)]">
                      {(selectedTableData.columns || []).map((col) => {
                        // Find if this column is part of a foreign key
                        const fkRelation = selectedTableData.foreign_keys?.find(fk => 
                          fk.constrained_columns?.includes(col.name)
                        );
                        
                        return (
                          <tr key={col.name} className="hover:bg-[var(--bg-canvas)]/30 text-xs">
                            <td className="py-3 px-4 font-mono text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-[var(--accent-color)]">
                                {col.primary_key && (
                                  <Key className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" title="Primary Key" />
                                )}
                                <span>{col.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-main)]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-main)] font-mono">
                                {col.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-muted)]">
                              <span className={col.nullable ? 'text-[var(--text-muted)] font-normal' : 'text-emerald-500 font-semibold'}>
                                {col.nullable ? 'YES' : 'NO'}
                              </span>
                            </td>
                            {selectedTableData.foreign_keys?.length > 0 && (
                              <td className="py-3 px-4 text-[var(--text-muted)] font-sans text-xs">
                                {fkRelation ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                                    → {fkRelation.referred_table}({fkRelation.referred_columns?.join(', ')})
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]/35">-</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-4 text-[var(--accent-color)]">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-main)]">Inspect Database Schema</h4>
                <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed mt-1.5">
                  Select a table from the sidebar to inspect column mappings, keys, and schemas verified in the SQLAlchemy pool configuration.
                </p>
              </div>
            )}

            {/* Secure connection info footer */}
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center gap-3 text-sm text-[var(--text-muted)] leading-relaxed bg-[var(--bg-canvas)]/30 rounded-xl p-4">
              <Lock className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                <strong className="font-semibold text-[var(--text-main)]">Zero credential exposure active</strong>: The backend resolves connection details dynamically during execution. The LLM agent receives only the connection ID string: <code className="bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-xs font-mono text-[var(--text-main)]">{database._id}</code>.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Secret Rotation Submodal */}
      {isRotationOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl max-w-md w-full relative overflow-hidden transition-all duration-200 animate-fade-in">
            {/* Top blue bar */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-[var(--accent-color)]" />
            
            <div className="p-4.5 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[var(--accent-color)]" />
                <h3 className="text-base font-bold text-[var(--text-main)]">Rotate Database Password</h3>
              </div>
              <button 
                onClick={() => setIsRotationOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRotateCredentials}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[var(--text-muted)]">
                    New Connection Password
                  </label>
                  <input
                    type="password"
                    placeholder="•••••••• (optional)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                    autoFocus
                  />
                </div>

                <div className="text-sm text-[var(--text-muted)] bg-[var(--bg-canvas)]/60 border border-[var(--border-color)] p-4 rounded-xl leading-relaxed">
                  Rotating credentials triggers a dynamic SQLAlchemy connection check. The new secret is encrypted in AES-256-GCM before database write.
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    testResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm leading-relaxed">
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-canvas)]/30 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRotationOpen(false)}
                  className="px-4 py-2 hover:bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-muted)] font-semibold text-sm rounded-full transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2 bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm rounded-full shadow-sm transition-all focus:outline-none flex items-center gap-1.5"
                >
                  {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Verify & Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSummary;
