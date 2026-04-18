import { useState, useEffect, useRef } from "react";
import noteService from "../services/noteService";

export default function NoteEditor({ note, onClose, onSaveComplete, availableLabels = [] }) {
  const [title, setTitle] = useState(note ? note.title : "");
  const [content, setContent] = useState(note ? note.content : "");
  const [images, setImages] = useState(note?.images ? [...note.images] : []);
  const [labelIds, setLabelIds] = useState(note?.labelIds ? [...note.labelIds] : []);
  const [isSaving, setIsSaving] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("read");

  const saveTimeoutRef = useRef(null);

  // Auto-save logic
  useEffect(() => {
    // Skip if identical to original
    if (note && note.title === title && note.content === content &&
      JSON.stringify(note.images) === JSON.stringify(images) &&
      JSON.stringify(note.labelIds) === JSON.stringify(labelIds)) return;

    // Don't save completely empty new notes
    if (!note && !title.trim() && !content.trim() && images.length === 0) return;

    setIsSaving(true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = { title, content, images, labelIds };
        if (note) {
          await noteService.updateNote(note.id, payload);
        } else {
          const res = await noteService.createNote(payload);
          if (onSaveComplete && !note) onSaveComplete(res.data); // give back newly created note
        }
      } catch (err) {
        console.error("Auto-save failed", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(saveTimeoutRef.current);
  }, [title, content, images, labelIds, note, onSaveComplete]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleLabel = (id) => {
    setLabelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleUpdatePassword = async () => {
    if (!note) return;

    // Better Approach: Double password entry validation
    if (passwordInput && passwordInput !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    // Better Approach: If changing/removing, first provide current password
    if (note.isLocked && !currentPassword) {
      alert("Please enter current password to make changes.");
      return;
    }

    try {
      if (note.isLocked) {
        // Verify current password first call
        await noteService.verifyNotePassword(note.id, currentPassword);
      }

      await noteService.setNotePassword(note.id, passwordInput || null);
      alert(passwordInput ? "Password successfully updated!" : "Password protection disabled.");
      onClose();
    } catch (err) {
      alert("Security Error: " + (err.message || "Incorrect current password"));
    }
  };

  const handleShare = async () => {
    if (!note || !shareEmail.trim()) return;
    try {
      await noteService.shareNote(note.id, shareEmail.trim(), shareRole);
      setShareEmail("");
      onClose(); // refresh
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeShare = async (email) => {
    if (!note) return;
    try {
      await noteService.revokeShare(note.id, email);
      onClose(); // refresh
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="note-editor border rounded p-3 bg-white mb-4 shadow-sm position-relative">
      <input
        type="text"
        className="form-control border-0 fw-bold fs-5 mb-2 shadow-none px-0"
        placeholder="Note Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="form-control border-0 shadow-none px-0"
        placeholder="Type your note content here..."
        rows="4"
        style={{ resize: 'none' }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {images.length > 0 && (
        <div className="d-flex gap-2 mb-3 overflow-auto pb-2">
          {images.map((img, i) => (
            <div key={i} className="position-relative">
              <img src={img} alt="attachment" style={{ height: "80px", width: "auto", borderRadius: "5px", objectFit: "cover" }} />
              <button
                className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0"
                style={{ width: "20px", height: "20px", borderRadius: "50%" }}
                onClick={() => removeImage(i)}
              >&times;</button>
            </div>
          ))}
        </div>
      )}

      {availableLabels.length > 0 && (
        <div className="mb-3 d-flex flex-wrap gap-2">
          {availableLabels.map(lbl => (
            <span
              key={lbl.id}
              className={`badge rounded-pill cursor-pointer ${labelIds.includes(lbl.id) ? "bg-primary" : "bg-light text-dark border"}`}
              onClick={() => toggleLabel(lbl.id)}
            >
              {lbl.name}
            </span>
          ))}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
        <div className="d-flex align-items-center gap-3">
          <label className="btn btn-sm btn-outline-secondary mb-0">
            🖼️ Images
            <input type="file" multiple accept="image/*" className="d-none" onChange={handleImageUpload} />
          </label>

          {note && (
            <button className={`btn btn-sm ${showSettings ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setShowSettings(!showSettings)}>
              ⚙️ Security & Share
            </button>
          )}
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small">
            {isSaving ? "Saving..." : "Saved."}
          </span>
          <button className="btn btn-sm btn-dark" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {showSettings && note && (
        <div className="mt-3 p-3 bg-light border rounded">
          <h6 className="fw-bold mb-3">Security Settings</h6>

          {note.isLocked && (
            <div className="mb-3">
              <label className="small text-muted mb-1">Current Password *</label>
              <input
                type="password"
                className="form-control form-control-sm mb-2"
                placeholder="Required for verification..."
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
          )}

          <div className="row g-2 mb-3">
            <div className="col">
              <label className="small text-muted mb-1">{note.isLocked ? "New Password" : "Set Password"}</label>
              <input
                type="password"
                className="form-control form-control-sm"
                placeholder="Empty to disable"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
              />
            </div>
            <div className="col">
              <label className="small text-muted mb-1">Confirm {note.isLocked ? "New " : ""}Password</label>
              <input
                type="password"
                className="form-control form-control-sm"
                placeholder="Match password above"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-sm btn-primary w-100 mb-4" onClick={handleUpdatePassword}>
            {note.isLocked ? "Update Security" : "Enable Password Lock"}
          </button>

          <h6 className="fw-bold mb-3">Share Note</h6>
          <div className="d-flex gap-2 align-items-center mb-3">
            <input type="email" className="form-control form-control-sm w-auto" placeholder="Target email..." value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
            <select className="form-select form-select-sm w-auto" value={shareRole} onChange={e => setShareRole(e.target.value)}>
              <option value="read">Read Only</option>
              <option value="edit">Editor</option>
            </select>
            <button className="btn btn-sm btn-success" onClick={handleShare}>Share</button>
          </div>

          {note.sharedWith && note.sharedWith.length > 0 && (
            <ul className="list-group list-group-flush border">
              {note.sharedWith.map((sw, i) => (
                <li key={i} className="list-group-item bg-transparent d-flex justify-content-between align-items-center p-2">
                  <span>
                    <small className="fw-semibold me-2">{sw.email}</small>
                    <span className="badge bg-secondary">{sw.role === 'edit' ? 'Editor' : 'Read Only'}</span>
                  </span>
                  <button className="btn btn-sm btn-link text-danger py-0" onClick={() => handleRevokeShare(sw.email)}>Revoke</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
