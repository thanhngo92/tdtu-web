import { useState, useEffect, useMemo, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import useNotes from "../hooks/useNotes";
import noteService from "../services/noteService";

// UI Components
import NoteCard from "../components/NoteCard";
import NoteEditor from "../components/NoteEditor";
import LabelManager from "../components/LabelManager";

/**
 * Dashboard Component
 * Manages notes display, filtering, searching and global UI states for the editor and label manager.
 */
export default function Dashboard() {
  const { user, logout, isAuthLoading } = useAuth();

  const {
    notes, sharedNotes, labels, fetchNotes, fetchLabels, togglePin, deleteNote
  } = useNotes();

  const [activeTab, setActiveTab] = useState("my-notes");
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState(null);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Toggle Sidebar on mobile
  useEffect(() => {
    const handleToggle = () => setIsSidebarMobileOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Initial data fetch and real-time synchronization
  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchLabels();
    }

    // Collaborative sync (Real-time simulation per Rubrik Requirement 24)
    const syncInterval = setInterval(() => {
      fetchNotes();
      fetchLabels();
    }, 5000); // 5s interval for a balance of real-time feel and performance

    return () => clearInterval(syncInterval);
  }, [user]);

  // Derived notes filtering + sorting
  const displayedNotes = useMemo(() => {
    let source = activeTab === "my-notes" ? notes : sharedNotes;
    let filtered = source;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }

    if (selectedLabelFilter) {
      filtered = filtered.filter(n => n.labelIds && n.labelIds.includes(selectedLabelFilter));
    }

    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) {
        return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, sharedNotes, debouncedSearch, selectedLabelFilter, activeTab]);

  const openEditor = async (note = null) => {
    let noteToOpen = note;
    if (note && note.isLocked) {
      const pwd = window.prompt("This note is locked. Please enter the password:");
      if (pwd === null) return; // user cancelled
      try {
        const response = await noteService.verifyNotePassword(note.id, pwd);
        if (response && response.data) {
          noteToOpen = response.data;
        }
      } catch (err) {
        window.alert("Incorrect password!");
        return;
      }
    }
    setSelectedNote(noteToOpen);
    setIsEditorOpen(true);
  };

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedNote(null);
    fetchNotes();
  }, [fetchNotes]);

  const handleTogglePin = async (id) => {
    try {
      await togglePin(id);
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await deleteNote(id);
      if (selectedNote && selectedNote.id === id) {
        closeEditor();
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isSidebarMobileOpen ? 'mobile-open' : ''}`}>
        <div
          className={`sidebar-nav-item ${activeTab === 'my-notes' && !selectedLabelFilter ? 'active' : ''}`}
          onClick={() => { setActiveTab('my-notes'); setSelectedLabelFilter(null); setIsSidebarMobileOpen(false); }}
        >
          📝 <span>My Notes</span>
        </div>
        <div
          className={`sidebar-nav-item ${activeTab === 'shared-with-me' ? 'active' : ''}`}
          onClick={() => { setActiveTab('shared-with-me'); setSelectedLabelFilter(null); setIsSidebarMobileOpen(false); }}
        >
          👥 <span>Shared With Me</span>
        </div>

        <div className="border-top my-3 mx-4"></div>

        <div className="px-4 mb-2 small text-muted fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>Labels</div>
        {labels.map(l => (
          <div
            key={l.id}
            className={`sidebar-nav-item ${selectedLabelFilter === l.id ? 'active' : ''}`}
            onClick={() => { setSelectedLabelFilter(l.id); setActiveTab('my-notes'); setIsSidebarMobileOpen(false); }}
          >
            🏷️ <span>{l.name}</span>
          </div>
        ))}

        <div
          className="sidebar-nav-item mt-2 text-primary"
          onClick={() => setIsLabelManagerOpen(true)}
        >
          ⚙️ <span>Manage Labels</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Top Header with Search & View Controls */}
        <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center mb-4">
          <div className="search-container-ui flex-grow-1" style={{ maxWidth: "500px" }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search your notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="ms-md-auto d-flex align-items-center gap-3">
            <div className="btn-group border rounded overflow-hidden">
              <button
                className={`btn btn-sm px-3 ${viewMode === "grid" ? "btn-primary" : "btn-light"}`}
                onClick={() => setViewMode("grid")}
              >Grid</button>
              <button
                className={`btn btn-sm px-3 ${viewMode === "list" ? "btn-primary" : "btn-light"}`}
                onClick={() => setViewMode("list")}
              >List</button>
            </div>
          </div>
        </div>

        {/* Action Components (Modals/Overlays) */}
        {isLabelManagerOpen && (
          <LabelManager
            labels={labels}
            fetchLabels={fetchLabels}
            onClose={() => { setIsLabelManagerOpen(false); fetchNotes(); }}
          />
        )}

        {isEditorOpen && (
          <div className="mb-4">
            <NoteEditor
              note={selectedNote}
              onClose={closeEditor}
              onSaveComplete={(newNote) => setSelectedNote(newNote)}
              availableLabels={labels}
            />
          </div>
        )}

        {/* Selected Label Header (Visual cue) */}
        {selectedLabelFilter && (
          <div className="mb-4 d-flex align-items-center gap-2">
            <h5 className="mb-0 fw-bold">Label: <span className="text-primary">{labels.find(l => l.id === selectedLabelFilter)?.name}</span></h5>
            <button className="btn btn-sm btn-link text-decoration-none text-muted" onClick={() => setSelectedLabelFilter(null)}>Clear Filter</button>
          </div>
        )}

        {/* Notes Display */}
        {displayedNotes.length === 0 ? (
          <div className="text-center text-muted py-5 mt-5">
            <div className="display-1 opacity-25 mb-3">📭</div>
            <h3 className="fw-normal">No notes found.</h3>
            <p>Your workspace is clean. Create your first note!</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "note-grid-layout" : "d-flex flex-column gap-3 mb-5"}>
            {displayedNotes.map(note => (
              <div key={note.id} className={viewMode === "list" ? "w-100" : ""}>
                <NoteCard
                  note={note}
                  onClick={openEditor}
                  onPin={handleTogglePin}
                  onDelete={handleDeleteNote}
                  availableLabels={labels}
                />
                {activeTab === 'shared-with-me' && (
                  <div className="mt-2 px-2 d-flex justify-content-between align-items-center">
                    <small className="text-muted">Shared by: <span className="fw-semibold">{note.owner_name}</span></small>
                    <span className="badge rounded-pill bg-light text-dark border px-3">{note.permission === 'edit' ? 'Editor' : 'Read Only'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          className="fab-btn-ui"
          onClick={() => openEditor()}
          title="Create New Note"
        >
          <span>+</span>
        </button>
      </main>
    </div>
  );
}