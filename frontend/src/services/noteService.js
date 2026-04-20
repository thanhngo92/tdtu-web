import { request } from "./authService";

const noteService = {
  getNotes() {
    return request("/notes", {
      method: "GET",
    });
  },

  createNote(payload) {
    return request("/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getNote(id) {
    return request(`/notes/${id}`, {
      method: "GET",
    });
  },

  updateNote(id, payload) {
    return request(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteNote(id, password = null) {
    return request(`/notes/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
  },

  togglePin(id) {
    return request(`/notes/${id}/pin`, {
      method: "POST",
    });
  },

  setNotePassword(id, password) {
    return request(`/notes/${id}/lock`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  verifyNotePassword(id, password) {
    return request(`/notes/${id}/verify-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  getSharedNotes() {
    return request("/shared-notes", {
      method: "GET",
    });
  },

  shareNote(id, email, role) {
    return request(`/notes/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  },

  revokeShare(id, email) {
    return request(`/notes/${id}/revoke-share`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // ===== LABEL OPERATIONS ===== //
  getLabels() {
    return request("/labels", {
      method: "GET",
    });
  },

  createLabel(name) {
    return request("/labels", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  updateLabel(id, name) {
    return request(`/labels/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },

  deleteLabel(id) {
    return request(`/labels/${id}`, {
      method: "DELETE",
    });
  }
};

export default noteService;
