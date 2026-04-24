import { useState, useEffect, useMemo, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import useNotes from "../hooks/useNotes";
import noteService from "../services/noteService";
import { syncPendingChanges } from "../services/syncService";

import NoteCard from "../components/NoteCard";
import NoteEditor from "../components/NoteEditor";
import LabelManager from "../components/LabelManager";

export default function Dashboard() {
  const { user, isAuthLoading, refreshAuth } = useAuth();
  const { notes, sharedNotes, labels, refreshWorkspace, togglePin, deleteNote } = useNotes(refreshAuth);

  const [activeTab, setActiveTab] = useState("my-notes");
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState(null);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [syncState, setSyncState] = useState({ status: "idle", pendingCount: 0, errorMessage: "" });

  useEffect(() => {
    const handleToggle = () => setIsSidebarMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) {
      return;
    }

    refreshWorkspace();

    const syncInterval = setInterval(() => {
      refreshWorkspace();
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [user, refreshWorkspace]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      try {
        await syncPendingChanges();
      } catch {
        // The sync banner already communicates failures.
      }

      await refreshWorkspace();
    };

    const handleOffline = () => setIsOnline(false);
    const handleSyncState = (event) => setSyncState(event.detail);
    const handleCacheUpdated = async () => refreshWorkspace();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("notes-sync-status", handleSyncState);
    window.addEventListener("notes-cache-updated", handleCacheUpdated);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("notes-sync-status", handleSyncState);
      window.removeEventListener("notes-cache-updated", handleCacheUpdated);
    };
  }, [refreshWorkspace]);

  const displayedNotes = useMemo(() => {
    let filtered = activeTab === "my-notes" ? notes : sharedNotes;

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          (note.title && note.title.toLowerCase().includes(query)) ||
          (note.content && note.content.toLowerCase().includes(query))
      );
    }

    if (selectedLabelFilter) {
      filtered = filtered.filter((note) => note.labelIds && note.labelIds.includes(selectedLabelFilter));
    }

    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      if (a.isPinned && b.isPinned) {
        return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [activeTab, debouncedSearch, notes, selectedLabelFilter, sharedNotes]);

  const openEditor = async (note = null) => {
    let noteToOpen = note;

    if (note && note.isLocked) {
      if (!isOnline) {
        window.alert("Locked notes can only be opened while online.");
        return;
      }

      const password = window.prompt("This note is locked. Please enter the password:");
      if (password === null) {
        return;
      }

      try {
        const response = await noteService.verifyNotePassword(note.id, password);
        if (response?.data) {
          noteToOpen = response.data;
        }
      } catch {
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
    refreshWorkspace();
  }, [refreshWorkspace]);

  const handleTogglePin = async (note) => {
    try {
      if (note.isLocked) {
        if (!isOnline) {
          window.alert("Locked notes can only be updated while online.");
          return;
        }

        const password = window.prompt("This note is locked. Please enter the password before changing its pin status:");
        if (password === null) {
          return;
        }

        await noteService.verifyNotePassword(note.id, password);
      }

      await togglePin(note.id);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleDeleteNote = async (note) => {
    try {
      let password = null;

      if (note.isLocked) {
        if (!isOnline) {
          window.alert("Locked notes can only be deleted while online.");
          return;
        }

        password = window.prompt("This note is locked. Please enter the password before deleting:");
        if (password === null) {
          return;
        }
      }

      await deleteNote(note.id, password);
      if (selectedNote?.id === note.id) {
        closeEditor();
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
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
      <aside className={`app-sidebar ${isSidebarMobileOpen ? "mobile-open" : ""}`}>
        <div
          className={`sidebar-nav-item ${activeTab === "my-notes" && !selectedLabelFilter ? "active" : ""}`}
          onClick={() => {
            setActiveTab("my-notes");
            setSelectedLabelFilter(null);
            setIsSidebarMobileOpen(false);
          }}
        >
          {"\uD83D\uDCDD"} <span>My Notes</span>
        </div>
        <div
          className={`sidebar-nav-item ${activeTab === "shared-with-me" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("shared-with-me");
            setSelectedLabelFilter(null);
            setIsSidebarMobileOpen(false);
          }}
        >
          {"\uD83D\uDC65"} <span>Shared With Me</span>
        </div>

        <div className="border-top my-3 mx-4"></div>

        <div className="px-4 mb-2 small text-muted fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>
          Labels
        </div>
        {labels.map((label) => (
          <div
            key={label.id}
            className={`sidebar-nav-item ${selectedLabelFilter === label.id ? "active" : ""}`}
            onClick={() => {
              setSelectedLabelFilter(label.id);
              setActiveTab("my-notes");
              setIsSidebarMobileOpen(false);
            }}
          >
            {"\uD83C\uDFF7\uFE0F"} <span>{label.name}</span>
          </div>
        ))}

        <div className="sidebar-nav-item mt-2 text-primary" onClick={() => setIsLabelManagerOpen(true)}>
          {"\u2699\uFE0F"} <span>Manage Labels</span>
        </div>
      </aside>

      <main className="app-main">
        <div className="offline-status-row">
          <span className={`network-badge ${isOnline ? "network-badge-online" : "network-badge-offline"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>

          {syncState.status === "syncing" && (
            <span className="network-badge network-badge-sync">
              Syncing {syncState.pendingCount > 0 ? `(${syncState.pendingCount})` : ""}
            </span>
          )}

          {!isOnline && (
            <span className="text-muted small">
              You can keep reading and editing cached notes. Changes will sync later.
            </span>
          )}

          {syncState.status === "error" && (
            <span className="text-danger small">
              {syncState.errorMessage || "Some offline changes could not sync yet."}
            </span>
          )}
        </div>

        <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center mb-4">
          <div className="search-container-ui flex-grow-1" style={{ maxWidth: "500px" }}>
            <span>{"\uD83D\uDD0D"}</span>
            <input
              type="text"
              placeholder="Search your notes..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="ms-md-auto d-flex align-items-center gap-3">
            <div className="btn-group border rounded overflow-hidden">
              <button
                className={`btn btn-sm px-3 ${viewMode === "grid" ? "btn-primary" : "btn-light"}`}
                onClick={() => setViewMode("grid")}
              >
                Grid
              </button>
              <button
                className={`btn btn-sm px-3 ${viewMode === "list" ? "btn-primary" : "btn-light"}`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {isLabelManagerOpen && (
          <LabelManager
            labels={labels}
            onLabelsChanged={refreshWorkspace}
            onClose={() => {
              setIsLabelManagerOpen(false);
              refreshWorkspace();
            }}
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

        {selectedLabelFilter && (
          <div className="mb-4 d-flex align-items-center gap-2">
            <h5 className="mb-0 fw-bold">
              Label: <span className="text-primary">{labels.find((label) => label.id === selectedLabelFilter)?.name}</span>
            </h5>
            <button className="btn btn-sm btn-link text-decoration-none text-muted" onClick={() => setSelectedLabelFilter(null)}>
              Clear Filter
            </button>
          </div>
        )}

        {displayedNotes.length === 0 ? (
          <div className="text-center text-muted py-5 mt-5">
            <div className="display-1 opacity-25 mb-3">{"\uD83D\uDDED"}</div>
            <h3 className="fw-normal">No notes found.</h3>
            <p>Your workspace is clean. Create your first note!</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "note-grid-layout" : "d-flex flex-column gap-3 mb-5"}>
            {displayedNotes.map((note) => (
              <div key={note.id} className={viewMode === "list" ? "w-100" : ""}>
                <NoteCard
                  note={note}
                  onClick={openEditor}
                  onPin={handleTogglePin}
                  onDelete={handleDeleteNote}
                  availableLabels={labels}
                />
                {activeTab === "shared-with-me" && (
                  <div className="shared-note-meta mt-2 px-2 d-flex justify-content-between align-items-center">
                    <div className="d-flex flex-column">
                      <small className="text-muted">
                        Shared by: <span className="fw-semibold">{note.ownerDisplayName || note.ownerEmail}</span>
                      </small>
                      {note.sharedAt && (
                        <small className="text-muted x-small" style={{ fontSize: "0.7rem" }}>
                          on {new Date(note.sharedAt).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                    <span className="badge rounded-pill bg-light text-dark border px-3">
                      {note.permission === "edit" ? "Editor" : "Read Only"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button className="fab-btn-ui" onClick={() => openEditor()} title="Create New Note">
          <span>+</span>
        </button>
      </main>
    </div>
  );
}
