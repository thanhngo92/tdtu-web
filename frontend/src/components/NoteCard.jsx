import { useState } from "react";

/**
 * NoteCard Component
 * Displays a summary of a note including title, content preview, pinned status, and labels.
 */
export default function NoteCard({ note, onClick, onPin, onDelete, availableLabels = [] }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const confirmDelete = (e) => {
    e.stopPropagation();
    onDelete(note);
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    onPin(note);
  };

  const isShared = (note.sharedWith && note.sharedWith.length > 0) || note.permission !== "owner";
  const isOwner = note.permission === "owner";

  return (
    <div
      className={`note-card-ui h-100 d-flex flex-column position-relative ${note.isPinned ? "note-pinned-ui" : ""}`}
      onClick={() => onClick(note)}
      role="button"
      tabIndex={0}
      data-note-color={note.noteColor}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h5 className="card-title fw-semibold text-truncate pe-5 mb-0">
          {note.title || "Untitled Note"}
        </h5>

        <div className="position-absolute top-0 end-0 p-2 d-flex gap-1 align-items-center" style={{ zIndex: 10 }}>
          {note.isLocked && <span title="Locked">{"\uD83D\uDD12"}</span>}
          {isShared && <span title="Shared">{"\uD83D\uDC65"}</span>}
        </div>
      </div>

      {note.isLocked ? (
        <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-muted">
          <span className="fs-1 mb-2">{"\uD83D\uDD12"}</span>
          <p className="mb-0 fw-semibold">Locked Content</p>
        </div>
      ) : (
        <>
          {note.images && note.images.length > 0 && (
            <div className="mb-2 d-flex gap-1 overflow-hidden" style={{ height: "60px" }}>
              {note.images.map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />
              ))}
            </div>
          )}

          <p className="card-text text-muted flex-grow-1 mb-2" style={{ whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
            {note.content || "No content provided."}
          </p>

          {note.labelIds && note.labelIds.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-1">
              {note.labelIds.map((labelId) => {
                const label = availableLabels.find((item) => item.id === labelId);
                return label ? <span key={labelId} className="badge bg-secondary rounded-pill fw-light" style={{ fontSize: "0.65rem" }}>{label.name}</span> : null;
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
        <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
          {new Date(note.updatedAt).toLocaleDateString()}
        </span>

        <div className="note-card-actions">
          {isOwner && (
            <button
              className={`note-action-btn ${note.isPinned ? "text-primary border-primary" : ""}`}
              onClick={handlePin}
              title={note.isPinned ? "Unpin" : "Pin"}
            >
              {note.isPinned ? "\uD83D\uDCCC" : "\uD83D\uDCCD"}
            </button>
          )}

          {isOwner && showConfirmDelete ? (
            <div className="btn-group btn-group-sm m-0 p-0" role="group">
              <button className="btn btn-danger py-0 px-2" onClick={confirmDelete} style={{ fontSize: "0.75rem" }}>Delete</button>
              <button className="btn btn-secondary py-0 px-2" onClick={cancelDelete} style={{ fontSize: "0.75rem" }}>Cancel</button>
            </div>
          ) : isOwner ? (
            <button className="note-action-btn text-danger" onClick={handleDelete} title="Delete">
              {"\uD83D\uDDD1\uFE0F"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
