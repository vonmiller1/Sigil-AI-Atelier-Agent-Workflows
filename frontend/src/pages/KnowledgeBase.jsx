import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  BookOpen, 
  UploadCloud, 
  FolderPlus, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  File, 
  HardDrive,
  AlertCircle,
  Link2,
  Lock
} from 'lucide-react';
import DatabaseConnectionModal from '../components/knowledge/DatabaseConnectionModal';
import DatabaseSummary from '../components/knowledge/DatabaseSummary';

const KnowledgeBase = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('vector'); // 'vector' | 'db'

  // Real database connections lists (State A)
  const [indexes, setIndexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active view states
  const [currentIndex, setCurrentIndex] = useState(null); // When set, views State C (Upload Zone)
  const [isModalOpen, setIsModalOpen] = useState(false);   // Modal state (State B)
  const [newIndexName, setNewIndexName] = useState('');
  const [modalError, setModalError] = useState('');

  // Database Connection States
  const [databases, setDatabases] = useState([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbError, setDbError] = useState('');
  const [selectedDb, setSelectedDb] = useState(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Drag & Drop staged files state (State C)
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch database connections
  const fetchDatabases = async () => {
    try {
      setLoadingDb(true);
      setDbError('');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthenticated user.');
      
      const response = await fetch('http://localhost:5000/api/databases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDatabases(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch databases');
      }
    } catch (err) {
      setDbError(err.message);
    } finally {
      setLoadingDb(false);
    }
  };

  // Fetch KBs on mount
  const fetchKBs = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User is unauthenticated. Please log in.');
      }

      const response = await fetch('http://localhost:5000/api/knowledge', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIndexes(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch knowledge bases');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKBs();
    fetchDatabases();
  }, []);

  // Synchronize detailed selection state with the master list
  useEffect(() => {
    if (selectedDb) {
      const updated = databases.find(db => db._id === selectedDb._id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDb)) {
        setSelectedDb(updated);
      }
    }
  }, [databases, selectedDb]);

  // Poll for status updates quietly if any index is currently ingesting
  useEffect(() => {
    const hasIngesting = indexes.some(idx => idx.status === 'ingesting');
    if (!hasIngesting) return;

    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token) return;

      fetch('http://localhost:5000/api/knowledge', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIndexes(data.data);
        }
      })
      .catch(err => console.error('Error polling knowledge base status:', err));
    }, 4000);

    return () => clearInterval(interval);
  }, [indexes]);

  // Tab Switch Handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // State B Handlers (Modal creation)
  const handleOpenModal = () => {
    setNewIndexName('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCreateNewIndex = (e) => {
    e.preventDefault();
    if (!newIndexName.trim()) {
      setModalError('Index name is required.');
      return;
    }
    
    // Check if name already exists locally
    if (indexes.some(idx => idx.name.toLowerCase() === newIndexName.trim().toLowerCase())) {
      setModalError('An index with this name already exists.');
      return;
    }

    // Set index name locally and transition to State C to upload the document
    const mockIndex = {
      id: 'pending-' + Date.now(),
      name: newIndexName.trim(),
      fileCount: 0,
      createdAt: new Date().toISOString()
    };

    setIsModalOpen(false);
    handleSelectIndex(mockIndex);
  };

  // Transition to State C (Upload workspace)
  const handleSelectIndex = (index) => {
    setCurrentIndex(index);
    setStagedFiles([]);
    setUploadSuccess(false);
    setIsUploading(false);
    setError('');
  };

  const handleBackToIndexes = () => {
    setCurrentIndex(null);
    setStagedFiles([]);
    setUploadSuccess(false);
    setIsUploading(false);
    setError('');
  };

  // State A Handlers (Delete index from db)
  const handleDeleteIndex = async (e, indexDbId, indexName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the index "${indexName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/knowledge/${indexDbId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIndexes(prev => prev.filter(idx => idx._id !== indexDbId));
      } else {
        throw new Error(data.message || 'Failed to delete index');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // State C Handlers (Drag & Drop + staging)
  const handleDeleteDatabase = async (e, dbId, dbName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the database connection "${dbName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/databases/${dbId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDatabases(prev => prev.filter(db => db._id !== dbId));
        if (selectedDb && selectedDb._id === dbId) {
          setSelectedDb(null);
        }
      } else {
        throw new Error(data.message || 'Failed to delete database connection.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // State C Handlers (Drag & Drop + staging)
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (filesList) => {
    const pdfs = Array.from(filesList).filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    if (pdfs.length === 0) {
      alert('Only PDF documents are supported for vector indexing.');
      return;
    }

    // Since Express endpoint upload.single() handles a single PDF, we stage only the first PDF file
    if (pdfs.length > 1) {
      alert('Knowledge base indexing currently processes one document at a time. The first document will be staged.');
    }
    
    const file = pdfs[0];
    const newStaged = [{
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2), // MB
      status: 'pending',
      rawFile: file // Store raw file object for upload
    }];

    setStagedFiles(newStaged);
    setUploadSuccess(false);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileBrowse = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeStagedFile = () => {
    setStagedFiles([]);
  };

  // Real Upload & Ingestion implementation (Multipart Form Data to Express)
  const handleStartUpload = async () => {
    if (stagedFiles.length === 0) return;

    const stagedFile = stagedFiles[0];
    setIsUploading(true);
    setUploadSuccess(false);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Unauthenticated user. Please log in.');
      }

      // Create multipart payload
      const formData = new FormData();
      formData.append('name', currentIndex.name);
      formData.append('file', stagedFile.rawFile);

      const response = await fetch('http://localhost:5000/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setStagedFiles(prev => prev.map(f => ({ ...f, status: 'success' })));
        setUploadSuccess(true);
        
        // Return back to indexes and refresh database list
        setTimeout(() => {
          handleBackToIndexes();
          fetchKBs();
        }, 1500);
      } else {
        throw new Error(data.message || 'RAG pipeline ingestion failed.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 h-screen bg-[var(--bg-canvas)] flex flex-col relative overflow-hidden transition-all duration-200">
      
      {/* Top Header Row */}
      <header className="bg-[var(--bg-card)] h-[64px] border-b border-[var(--border-color)] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all shrink-0">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-[var(--accent-color)]" />
          <h1 className="text-sm font-bold text-[var(--text-main)] tracking-tight font-sans">
            Knowledge Base
          </h1>
        </div>
        <div className="text-[10px] font-bold text-[var(--text-muted)]/60 uppercase tracking-widest">
          Azure AI Foundry Clone
        </div>
      </header>

      {/* Main stage content area */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {/* Navigation Breadcrumb inside State C Workspace */}
        {currentIndex && (
          <div className="flex items-center gap-2 mb-6 text-xs text-[var(--text-muted)] select-none">
            <button 
              onClick={handleBackToIndexes}
              className="hover:text-[var(--accent-color)] transition-colors flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Vector Indexes</span>
            </button>
            <ChevronRight className="w-3 h-3 opacity-60" />
            <span className="font-semibold text-[var(--text-main)] truncate max-w-[200px]">
              {currentIndex.name}
            </span>
          </div>
        )}

        {selectedDb && (
          <div className="flex items-center gap-2 mb-6 text-xs text-[var(--text-muted)] select-none">
            <button 
              onClick={() => setSelectedDb(null)}
              className="hover:text-[var(--accent-color)] transition-colors flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Database Connections</span>
            </button>
            <ChevronRight className="w-3 h-3 opacity-60" />
            <span className="font-semibold text-[var(--text-main)] truncate max-w-[200px]">
              {selectedDb.name}
            </span>
          </div>
        )}

        {/* Header Block */}
        {!currentIndex && !selectedDb && (
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">
              Knowledge Base
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
              Connect external documents, website content, or structured databases to vectorize knowledge assets. Enable semantic grounding and contextual reasoning in your LLM models.
            </p>
          </div>
        )}

        {/* Page level horizontal Tabs - Shown only when not inside a specific Index */}
        {!currentIndex && !selectedDb && (
          <div className="flex border-b border-[var(--border-color)] mb-6 select-none shrink-0">
            <button
              onClick={() => handleTabChange('vector')}
              className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'vector'
                  ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Vector Indexes</span>
            </button>
            <button
              onClick={() => handleTabChange('db')}
              className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'db'
                  ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Databases</span>
            </button>
          </div>
        )}

        {/* Tab 1: Vector Indexes View */}
        {activeTab === 'vector' && (
          <>
            {/* STATE A: Index List */}
            {!currentIndex && (
              <div>
                {/* Search & Actions Control Row */}
                <div className="flex items-center justify-between mb-5 gap-4">
                  <div className="text-sm font-bold text-[var(--text-main)]">
                    All Indexes ({indexes.length})
                  </div>
                  
                  <button
                    onClick={handleOpenModal}
                    className="inline-flex items-center gap-2 py-2 px-5 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-sm rounded-full shadow-sm shadow-[var(--accent-color)]/10 hover:shadow transition-all duration-150 focus:outline-none"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Index</span>
                  </button>
                </div>

                {/* Error Alert Box */}
                {error && (
                  <div className="flex items-start gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Grid list or Empty State */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-[var(--accent-color)] animate-spin" />
                    <span className="text-sm text-[var(--text-muted)] animate-pulse">Syncing Knowledge Bases...</span>
                  </div>
                ) : indexes.length === 0 ? (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] p-16 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-4 text-[var(--accent-color)]">
                      <FolderPlus className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">No indexes to display</h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed mt-2.5 mb-6">
                      Create an index to structure documents into vector embeddings. Embeddings allow agents to fetch relevant documents.
                    </p>
                    <button
                      onClick={handleOpenModal}
                      className="inline-flex items-center gap-2 py-2.5 px-6 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-sm rounded-full shadow-sm transition-all focus:outline-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create your first Index</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-canvas)]/40">
                          <th className="py-4 px-6 font-bold">Index Name</th>
                          <th className="py-4 px-6 font-bold">Status</th>
                          <th className="py-4 px-6 font-bold">Created On</th>
                          <th className="py-4 px-6 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {indexes.map((idx) => (
                          <tr
                            key={idx._id}
                            onClick={() => idx.status === 'ready' && handleSelectIndex(idx)}
                            className={`transition-colors duration-150 group ${idx.status === 'ready' ? 'hover:bg-[var(--bg-canvas)]/50 cursor-pointer' : 'opacity-80'}`}
                          >
                            <td className="py-4 px-6 text-sm font-semibold text-[var(--accent-color)] group-hover:underline max-w-xs truncate">
                              {idx.name}
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-main)] whitespace-nowrap">
                              {idx.status === 'ready' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px] uppercase tracking-wide">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Ready
                                </span>
                              ) : idx.status === 'ingesting' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-color)] font-bold text-[11px] animate-pulse uppercase tracking-wide">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Ingesting...
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold text-[11px] uppercase tracking-wide">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-muted)] whitespace-nowrap">
                              {new Date(idx.createdAt).toISOString().split('T')[0]}
                            </td>
                            <td className="py-4 px-6 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleDeleteIndex(e, idx._id, idx.name)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none"
                                title="Delete Index"
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
            )}

            {/* STATE C: Drag & Drop Upload Zone (Rendered when currentIndex is selected) */}
            {currentIndex && (
              <div className="flex flex-col gap-6">
                
                {/* Index Info Bar */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">{currentIndex.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Upload a PDF document to parse, structure and index it into the vector store.
                    </p>
                  </div>
                </div>

                {/* Error Alert Box inside Upload Zone */}
                {error && (
                  <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Upload & Staging Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Drag Area (Spans 2 cols if files are present, else full-width) */}
                  <div className={`${stagedFiles.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !isUploading && fileInputRef.current.click()}
                      className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 select-none ${
                        isUploading 
                          ? 'border-[var(--border-color)] opacity-60 cursor-not-allowed bg-[var(--bg-card)]'
                          : isDragging 
                            ? 'border-[var(--accent-color)] bg-[var(--accent-light)]/40 shadow-inner cursor-pointer'
                            : 'border-[var(--border-color)] hover:border-[var(--accent-color)]/60 bg-[var(--bg-card)] shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileBrowse}
                        accept=".pdf" 
                        disabled={isUploading}
                        className="hidden" 
                      />
                      <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-transform duration-200 ${
                        isDragging ? 'bg-[var(--accent-color)] text-white scale-110' : 'bg-[var(--accent-light)] text-[var(--accent-color)]'
                      }`}>
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text-main)] mb-1.5">
                        Drag and drop a PDF file here
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                        or click to browse local files. Only PDF files are accepted for tokenization and vector embeddings.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Staged list for ingestion (Rendered only when files are staged) */}
                  {stagedFiles.length > 0 && (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col max-h-[450px]">
                      <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-color)] shrink-0">
                        <span className="text-xs font-bold text-[var(--text-main)]">
                          Staged Document
                        </span>
                        <button 
                          onClick={removeStagedFile}
                          disabled={isUploading}
                          className="text-[10px] font-bold text-red-500 hover:underline disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>

                      {/* Scrollable list */}
                      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 my-1.5 pr-1">
                        {stagedFiles.map((file) => (
                          <div 
                            key={file.id} 
                            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-canvas)]/40 relative overflow-hidden group"
                          >
                            <File className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="text-[11px] font-semibold text-[var(--text-main)] truncate" title={file.name}>
                                {file.name}
                              </div>
                              <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                {file.size} MB
                              </div>
                            </div>
                            
                            {/* File Status / Close Button */}
                            <div className="shrink-0">
                              {file.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : isUploading ? (
                                <Loader2 className="w-3.5 h-3.5 text-[var(--accent-color)] animate-spin" />
                              ) : (
                                <button
                                  onClick={removeStagedFile}
                                  className="text-[var(--text-muted)] hover:text-red-500 p-0.5 rounded focus:outline-none"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Ingest Action Block */}
                      <div className="pt-3 border-t border-[var(--border-color)] shrink-0 flex flex-col gap-2.5">
                        {uploadSuccess && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 rounded-lg text-[10px] font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Successfully vectorized and indexed document.</span>
                          </div>
                        )}

                        <button
                          onClick={handleStartUpload}
                          disabled={isUploading || uploadSuccess}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-sm transition-all focus:outline-none"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Vectorizing Document...</span>
                            </>
                          ) : uploadSuccess ? (
                            <span>Document Indexed Successfully</span>
                          ) : (
                            <span>Upload & Ingest to Vector DB</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}
          </>
        )}

        {/* Tab 2: Databases View */}
        {activeTab === 'db' && (
          <>
            {/* STATE A: Database list & creation button */}
            {!selectedDb ? (
              <div>
                <div className="flex items-center justify-between mb-5 gap-4">
                  <div className="text-sm font-bold text-[var(--text-main)]">
                    All Connections ({databases.length})
                  </div>
                  
                  <button
                    onClick={() => setIsDbModalOpen(true)}
                    className="inline-flex items-center gap-2 py-2 px-5 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-sm rounded-full shadow-sm shadow-[var(--accent-color)]/10 hover:shadow transition-all duration-150 focus:outline-none"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Connect Database</span>
                  </button>
                </div>

                {dbError && (
                  <div className="flex items-start gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm font-semibold mb-5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    <span>{dbError}</span>
                  </div>
                )}

                {loadingDb ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-[var(--accent-color)] animate-spin" />
                    <span className="text-sm text-[var(--text-muted)] animate-pulse">Syncing Database Connections...</span>
                  </div>
                ) : databases.length === 0 ? (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] p-16 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-4 text-[var(--accent-color)]">
                      <Database className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">No SQL databases connected</h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed mt-2.5 mb-6">
                      Expose SQL schemas and run agentic read-only queries with connection pooling, AST-based query validation, and zero credentials exposure.
                    </p>
                    <button
                      onClick={() => setIsDbModalOpen(true)}
                      className="inline-flex items-center gap-2 py-2.5 px-6 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-sm rounded-full shadow-sm transition-all focus:outline-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Connect your first database</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-canvas)]/40">
                          <th className="py-4 px-6 font-bold">Connection Name</th>
                          <th className="py-4 px-6 font-bold">Engine</th>
                          <th className="py-4 px-6 font-bold">Host & Port</th>
                          <th className="py-4 px-6 font-bold">Database Name</th>
                          <th className="py-4 px-6 font-bold">Status</th>
                          <th className="py-4 px-6 font-bold">Created On</th>
                          <th className="py-4 px-6 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {databases.map((db) => (
                          <tr
                            key={db._id}
                            onClick={() => setSelectedDb(db)}
                            className="transition-colors duration-150 group hover:bg-[var(--bg-canvas)]/50 cursor-pointer"
                          >
                            <td className="py-4 px-6 text-sm font-semibold text-[var(--accent-color)] group-hover:underline max-w-xs truncate">
                              <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
                                <span className="truncate">{db.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-main)] whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--border-color)]/60 text-[var(--text-muted)] tracking-wider">
                                {db.engine}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-muted)] font-mono truncate max-w-xs">
                              {db.host}:{db.port}
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-main)] font-semibold whitespace-nowrap">
                              {db.databaseName}
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-main)] whitespace-nowrap">
                              {db.status === 'Connected' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px] uppercase tracking-wide">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Connected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[11px] uppercase tracking-wide">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-[var(--text-muted)] whitespace-nowrap">
                              {db.createdAt ? new Date(db.createdAt).toISOString().split('T')[0] : 'N/A'}
                            </td>
                            <td className="py-4 px-6 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-semibold bg-[var(--bg-canvas)]/80 px-2 py-1 rounded border border-[var(--border-color)] mr-2">
                                  <Lock className="w-3 h-3 text-emerald-500" />
                                  <span>ID Locked</span>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteDatabase(e, db._id, db.name)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none"
                                  title="Delete connection"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <DatabaseSummary 
                database={selectedDb} 
                onRefresh={fetchDatabases} 
                onBack={() => setSelectedDb(null)} 
              />
            )}
          </>
        )}

      </div>

      {/* STATE B: Centered Create Index Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl max-w-md w-full relative overflow-hidden transition-all duration-200 animate-fade-in">
            {/* Top blue highlight line */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-[var(--accent-color)]" />
            
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Create Vector Index</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-canvas)] transition-all focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewIndex}>
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="indexName" className="text-sm font-semibold text-[var(--text-muted)]">
                    Index Name
                  </label>
                  <input
                    type="text"
                    id="indexName"
                    value={newIndexName}
                    onChange={(e) => setNewIndexName(e.target.value)}
                    placeholder="e.g., HR Policies 2026"
                    className="w-full border border-[var(--border-color)] bg-[var(--bg-canvas)] rounded-brand px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-color)] transition-all font-sans"
                    autoFocus
                  />
                  {modalError && (
                    <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm font-semibold mt-1">
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                      <span>{modalError}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-[var(--text-muted)] leading-relaxed bg-[var(--bg-canvas)]/60 border border-[var(--border-color)] rounded-xl p-4">
                  <strong className="font-semibold text-[var(--text-main)]">Embedding Model:</strong> By default, this index will configure standard chunking rules using cosine similarity distance search to structure search outputs.
                </p>
              </div>

              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-canvas)]/30 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-muted)] font-semibold text-sm rounded-full transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--accent-color)] hover:opacity-90 text-white font-bold text-sm rounded-full shadow-sm transition-all focus:outline-none"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centered Create Database Connection Overlay Modal */}
      <DatabaseConnectionModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onSaveSuccess={(newDb) => {
          setDatabases(prev => [newDb, ...prev]);
          setSelectedDb(newDb);
        }}
      />

    </div>
  );
};

export default KnowledgeBase;
