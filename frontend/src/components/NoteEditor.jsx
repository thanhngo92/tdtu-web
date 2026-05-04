import { useCallback, useEffect, useRef, useState } from "react";
import noteService from "../services/noteService";

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.82;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("Unable to load image file."));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

export default function NoteEditor({ note, onClose, onSaveComplete, availableLabels = [] }) {
  const [title, setTitle] = useState(note ? note.title : "");
  const [content, setContent] = useState(note ? note.content : "");
  const [images, setImages] = useState(note?.images ? [...note.images] : []);
  const [labelIds, setLabelIds] = useState(note?.labelIds ? [...note.labelIds] : []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("read");
  const [settingsMessage, setSettingsMessage] = useState({ type: "", text: "" });
  const [collaborationMessage, setCollaborationMessage] = useState("");
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const saveTimeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const lastSavedNoteRef = useRef(note ?? null);
  const socketRef = useRef(null);
  const SOCKET_URL = `ws://${window.location.hostname}:8080`;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setTitle(note ? note.title : "");
    setContent(note ? note.content : "");
    setImages(note?.images ? [...note.images] : []);
    setLabelIds(note?.labelIds ? [...note.labelIds] : []);
    lastSavedNoteRef.current = note ?? null;
    setSaveMessage("");
    setSettingsMessage({ type: "", text: "" });
    setCurrentPassword("");
    setPasswordInput("");
    setConfirmPassword("");
    setShareEmail("");
    setShareRole("read");

    if (note?.permission === "edit") {
      setCollaborationMessage("Collaborative editing active.");
    } else {
      setCollaborationMessage("");
    }
  }, [note]);

  const hasLocalChanges = useCallback(() => {
    const saved = lastSavedNoteRef.current;

    if (!saved) {
      return !!title.trim() || !!content.trim() || images.length > 0 || labelIds.length > 0;
    }

    return !(
      saved.title === title &&
      saved.content === content &&
      JSON.stringify(saved.images ?? []) === JSON.stringify(images) &&
      JSON.stringify(saved.labelIds ?? []) === JSON.stringify(labelIds)
    );
  }, [content, images, labelIds, title]);

  useEffect(() => {
    if (!note || note.permission !== "edit" || note.isLocked || !isOnline) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const socket = new WebSocket(SOCKET_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket Connected");
      socket.send(JSON.stringify({ action: "join", noteId: note.id }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === "note-updated" && data.noteId === note.id) {
          // Check if we have unsaved changes before overriding
          if (!hasLocalChanges() && !isSaving) {
            setTitle(data.title);
            setContent(data.content);
            setCollaborationMessage("Note updated by collaborator.");
            
            // Update last saved ref to prevent feedback loop
            lastSavedNoteRef.current = {
                ...lastSavedNoteRef.current,
                title: data.title,
                content: data.content
            };
          } else {
            setCollaborationMessage("Collaborator made changes. Finish your edits to sync.");
          }
        }
      } catch (err) {
        console.error("WebSocket message error", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [note?.id, isOnline]);

  useEffect(() => {
    const saved = lastSavedNoteRef.current;

    if (
      saved &&
      saved.title === title &&
      saved.content === content &&
      JSON.stringify(saved.images ?? []) === JSON.stringify(images) &&
      JSON.stringify(saved.labelIds ?? []) === JSON.stringify(labelIds)
    ) {
      return;
    }

    if (note?.permission === "read") {
      return;
    }

    if (!note && !title.trim() && !content.trim() && images.length === 0) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("Saving...");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        let res = null;
        const payload = { title, content, images, labelIds };

        if (note) {
          res = await noteService.updateNote(note.id, payload);
          const savedNote = res?.data ?? null;
          if (savedNote) {
            lastSavedNoteRef.current = savedNote;
            onSaveComplete?.(savedNote);

            // Notify other collaborators via WebSocket
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    action: 'note-updated',
                    noteId: note.id,
                    title: title,
                    content: content
                }));
            }
          }
        } else {
          res = await noteService.createNote(payload);
          const createdNote = res?.data ?? null;
          if (createdNote) {
            lastSavedNoteRef.current = createdNote;
            onSaveComplete?.(createdNote);
          }
        }

        setSaveMessage(res?.offline ? "Saved to local cache." : "All changes synced.");
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveMessage("Sync failed. Keep editor open.");
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [title, content, images, labelIds, note, onSaveComplete]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    try {
      const compressedImages = await Promise.all(imageFiles.map(compressImage));
      setImages((prev) => [...prev, ...compressedImages]);
    } catch (err) {
      console.error("Image upload failed", err);
      setSaveMessage("Image upload failed.");
    } finally {
      e.target.value = "";
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleLabel = (id) => {
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleUpdatePassword = async () => {
    if (!note) return;

    if (!isOnline) {
      setSettingsMessage({ type: "danger", text: "Note security needs an internet connection." });
      return;
    }

    if (!note.isLocked) {
      if (!passwordInput || !confirmPassword) {
        setSettingsMessage({ type: "danger", text: "Enter the new password twice." });
        return;
      }
    } else if (!currentPassword) {
      setSettingsMessage({ type: "danger", text: "Verify current password first." });
      return;
    }

    if (passwordInput !== confirmPassword) {
      setSettingsMessage({ type: "danger", text: "New passwords do not match." });
      return;
    }

    try {
      await noteService.setNotePassword(note.id, {
        currentPassword,
        newPassword: passwordInput,
        confirmPassword,
      });

      setSettingsMessage({
        type: "success",
        text: note.isLocked
          ? (passwordInput ? "Note password updated successfully." : "Password protection disabled.")
          : "Password protection enabled."
      });

      setCurrentPassword("");
      setPasswordInput("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      setSettingsMessage({ type: "danger", text: err?.data?.message || err.message || "Security update failed." });
    }
  };

  const handleShare = async () => {
    if (!note || !shareEmail.trim()) {
      setSettingsMessage({ type: "danger", text: "Please enter a recipient email before sharing." });
      return;
    }

    try {
      await noteService.shareNote(note.id, shareEmail.trim(), shareRole);
      setShareEmail("");
      setSettingsMessage({ type: "success", text: "Note shared successfully." });
      onClose();
    } catch (err) {
      setSettingsMessage({ type: "danger", text: err?.data?.message || err.message || "Unable to share this note." });
    }
  };

  const handleRevokeShare = async (email) => {
    if (!note) return;

    try {
      await noteService.revokeShare(note.id, email);
      setSettingsMessage({ type: "success", text: "Share revoked successfully." });
      onClose();
    } catch (err) {
      setSettingsMessage({ type: "danger", text: err?.data?.message || err.message || "Unable to revoke this share." });
    }
  };

  return (
    <div className="note-editor border rounded p-3 bg-white mb-4 shadow-sm position-relative">
      {collaborationMessage && (
        <div className="alert alert-secondary py-2 px-3 small mb-3">
          {collaborationMessage}
        </div>
      )}

      <input
        type="text"
        className="form-control border-0 fw-bold fs-5 mb-2 shadow-none px-0 note-editor-title"
        placeholder="Untitled Note"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        readOnly={note?.permission === "read"}
      />

      <textarea
        className="form-control border-0 shadow-none px-0 note-editor-textarea"
        placeholder="Take a note..."
        rows="4"
        style={{ resize: "none" }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={note?.permission === "read"}
      />

      {images.length > 0 && (
        <div className="d-flex gap-2 mb-3 overflow-auto pb-2">
          {images.map((img, i) => (
            <div key={i} className="position-relative">
              <img src={img} alt="attachment" style={{ height: "80px", width: "auto", borderRadius: "5px", objectFit: "cover" }} />
              <button
                className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0"
                style={{ width: "20px", height: "20px", borderRadius: "50%", display: note?.permission === "read" ? "none" : "block" }}
                onClick={() => removeImage(i)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {availableLabels.length > 0 && (
        <div className="mb-3 d-flex flex-wrap gap-2">
          {availableLabels.map((label) => (
            <span
              key={label.id}
              className={`badge rounded-pill cursor-pointer ${labelIds.includes(label.id) ? "bg-primary" : "bg-light text-dark border"}`}
              onClick={() => note?.permission !== "read" && toggleLabel(label.id)}
              style={{ cursor: note?.permission === "read" ? "default" : "pointer" }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="note-editor-toolbar d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
        <div className="note-editor-actions d-flex align-items-center gap-3">
          <label className={`btn btn-sm btn-outline-secondary mb-0 ${note?.permission === "read" ? "disabled" : ""}`}>
            Images
            <input type="file" multiple accept="image/*" className="d-none" onChange={handleImageUpload} disabled={note?.permission === "read"} />
          </label>

          {note && note.permission === "owner" && (
            <button className={`btn btn-sm ${showSettings ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setShowSettings(!showSettings)}>
              Security and Share
            </button>
          )}
        </div>

        <div className="note-editor-status d-flex align-items-center gap-3">
          <span className="text-muted small">{isSaving ? "Saving..." : (saveMessage || "Saved.")}</span>
          <button className="btn btn-sm btn-dark" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {showSettings && note && (
        <div className="note-settings-panel mt-3 p-3 bg-light border rounded">
          {!isOnline && (
            <div className="alert alert-warning py-2 px-3 small">
              Sharing and note security need an internet connection. You can still edit note content offline.
            </div>
          )}

          <h5 className="fw-bold mb-3">Security Settings</h5>

          {settingsMessage.text && (
            <div className={`alert alert-${settingsMessage.type} py-2 px-3 small`}>
              {settingsMessage.text}
            </div>
          )}

          {note.isLocked && (
            <div className="mb-3">
              <label className="small text-muted mb-1">Current Password *</label>
              <input
                type="password"
                className="form-control form-control-sm mb-2"
                placeholder="Required for verification"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <div className="form-text">Enter the current password to change or disable protection.</div>
            </div>
          )}

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="small text-muted mb-1">{note.isLocked ? "New Password" : "Set Password"}</label>
              <input
                type="password"
                className="form-control form-control-sm"
                placeholder="Leave empty to disable"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <div className="form-text">
                {note.isLocked ? "Leave both new password fields empty to disable protection." : "Each note uses its own password."}
              </div>
            </div>
            <div className="col-md-6">
              <label className="small text-muted mb-1">Confirm Password</label>
              <input
                type="password"
                className="form-control form-control-sm"
                placeholder="Repeat the password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-sm btn-primary w-100 mb-4 py-2 fw-semibold" onClick={handleUpdatePassword} disabled={!isOnline}>
            {note.isLocked ? (passwordInput ? "Update Password" : "Disable Password Lock") : "Enable Password Lock"}
          </button>

          <h5 className="fw-bold mb-3">Share Note</h5>

          <div className="note-editor-share-row d-flex gap-2 align-items-center mb-3">
            <input
              type="email"
              className="form-control form-control-sm"
              placeholder="Recipient Email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            <select className="form-select form-select-sm note-editor-role-select" style={{ width: "auto" }} value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
              <option value="read">Read Only</option>
              <option value="edit">Editor</option>
            </select>
            <button className="btn btn-sm btn-success px-3" onClick={handleShare} disabled={!isOnline}>
              Share
            </button>
          </div>

          {note.sharedWith && note.sharedWith.length > 0 && (
            <ul className="list-group list-group-flush border">
              {note.sharedWith.map((share, index) => (
                <li key={index} className="list-group-item bg-transparent d-flex justify-content-between align-items-center p-2">
                  <div className="d-flex flex-column">
                    <span>
                      <small className="fw-semibold me-2">{share.email}</small>
                      <span className="badge bg-secondary">{share.role === "edit" ? "Editor" : "Read Only"}</span>
                    </span>
                    {share.sharedAt && <small className="text-muted" style={{ fontSize: "0.7rem" }}>Shared on {new Date(share.sharedAt).toLocaleDateString()}</small>}
                  </div>
                  <button className="btn btn-sm btn-link text-danger py-0" onClick={() => handleRevokeShare(share.email)} disabled={!isOnline}>
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
