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
      setCollaborationMessage("Shared note with edit permission. Changes refresh automatically every 3 seconds.");
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
          }
        } else {
          res = await noteService.createNote(payload);
          const createdNote = res?.data ?? null;
          if (createdNote) {
            lastSavedNoteRef.current = createdNote;
            onSaveComplete?.(createdNote);
          }
        }

        setSaveMessage(res?.offline ? "Saved offline. Sync will run when you reconnect." : "All changes saved.");
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveMessage("Auto-save failed. Please keep this editor open and try again.");
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [title, content, images, labelIds, note, onSaveComplete]);

  useEffect(() => {
    if (!note || note.permission !== "edit" || note.isLocked) {
      if (note?.permission === "edit" && note?.isLocked) {
        setCollaborationMessage("Locked shared notes refresh when they are reopened with the password.");
      }
      return;
    }

    let isCancelled = false;

    const pollLatest = async () => {
      try {
        const res = await noteService.getNote(note.id);
        const remoteNote = res?.data ?? null;
        const saved = lastSavedNoteRef.current;

        if (!remoteNote || !saved || remoteNote.updatedAt === saved.updatedAt) {
          return;
        }

        if (!hasLocalChanges() && !isSaving) {
          setTitle(remoteNote.title);
          setContent(remoteNote.content);
          setImages(remoteNote.images);
          setLabelIds(remoteNote.labelIds);
          lastSavedNoteRef.current = remoteNote;
          onSaveComplete?.(remoteNote);
          setCollaborationMessage("This shared note was refreshed from another editor.");
        } else {
          setCollaborationMessage("Another editor has newer changes. Save your work first, then reopen the note to refresh.");
        }
      } catch {
        setCollaborationMessage("Unable to refresh shared changes right now.");
      } finally {
        if (!isCancelled) {
          syncTimeoutRef.current = setTimeout(pollLatest, 3000);
        }
      }
    };

    syncTimeoutRef.current = setTimeout(pollLatest, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(syncTimeoutRef.current);
    };
  }, [note, isSaving, onSaveComplete, hasLocalChanges]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    try {
      const compressedImages = await Promise.all(imageFiles.map(compressImage));
      setImages((prev) => [...prev, ...compressedImages]);
    } catch (err) {
      console.error("Image upload failed", err);
      setSaveMessage("Image upload failed. Please try a different image.");
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
        setSettingsMessage({ type: "danger", text: "Please enter the new password twice." });
        return;
      }
    } else if (!currentPassword) {
      setSettingsMessage({ type: "danger", text: "Please enter the current password before changing note security." });
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
        placeholder="Note Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="form-control border-0 shadow-none px-0 note-editor-textarea"
        placeholder="Type your note content here..."
        rows="4"
        style={{ resize: "none" }}
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
              onClick={() => toggleLabel(label.id)}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="note-editor-toolbar d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
        <div className="note-editor-actions d-flex align-items-center gap-3">
          <label className="btn btn-sm btn-outline-secondary mb-0">
            Images
            <input type="file" multiple accept="image/*" className="d-none" onChange={handleImageUpload} />
          </label>

          {note && (
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

          <h6 className="fw-bold mb-3">Security Settings</h6>

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

          <button className="btn btn-sm btn-primary w-100 mb-4" onClick={handleUpdatePassword} disabled={!isOnline}>
            {note.isLocked ? (passwordInput ? "Update Password" : "Disable Password Lock") : "Enable Password Lock"}
          </button>

          <h6 className="fw-bold mb-3">Share Note</h6>
          <div className="note-editor-share-row d-flex gap-2 align-items-center mb-3">
            <input
              type="email"
              className="form-control form-control-sm"
              placeholder="Target email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            <select className="form-select form-select-sm note-editor-role-select" value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
              <option value="read">Read Only</option>
              <option value="edit">Editor</option>
            </select>
            <button className="btn btn-sm btn-success" onClick={handleShare} disabled={!isOnline}>
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
