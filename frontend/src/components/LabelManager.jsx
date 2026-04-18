import { useState } from "react";
import noteService from "../services/noteService";

/**
 * Label Manager Component
 * Handles CRUD operations for labels in a modal interface.
 */
export default function LabelManager({ onClose, labels, fetchLabels }) {
  const [newLabelName, setNewLabelName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      await noteService.createLabel(newLabelName.trim());
      setNewLabelName("");
      fetchLabels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    try {
      await noteService.updateLabel(id, editingName.trim());
      setEditingId(null);
      setEditingName("");
      fetchLabels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this label? Notes with this label will not be deleted.")) {
      try {
        await noteService.deleteLabel(id);
        fetchLabels();
        // The notes will automatically have their reference cleaned up backend side
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="modal-backdrop d-flex justify-content-center align-items-center" style={{ zIndex: 1050 }}>
      <div className="modal-content bg-white p-4 rounded shadow" style={{ width: "400px" }}>
        <h5 className="mb-3">Manage Labels</h5>

        <form onSubmit={handleAdd} className="d-flex mb-4 gap-2">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="New label name..."
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
          />
          <button type="submit" className="btn btn-sm btn-primary">Add</button>
        </form>

        <ul className="list-group mb-4">
          {labels.length === 0 ? (
            <li className="list-group-item text-muted text-center">No labels found</li>
          ) : (
            labels.map(label => (
              <li key={label.id} className="list-group-item d-flex justify-content-between align-items-center p-2">
                {editingId === label.id ? (
                  <div className="d-flex gap-2 w-100">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <button className="btn btn-sm btn-success py-0" onClick={() => handleUpdate(label.id)}>Save</button>
                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span><span className="badge bg-secondary me-2">tag</span>{label.name}</span>
                    <div>
                      <button
                        className="btn btn-sm btn-link text-primary py-0"
                        onClick={() => { setEditingId(label.id); setEditingName(label.name); }}
                      >Edit</button>
                      <button
                        className="btn btn-sm btn-link text-danger py-0"
                        onClick={() => handleDelete(label.id)}
                      >Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>

        <div className="text-end">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
