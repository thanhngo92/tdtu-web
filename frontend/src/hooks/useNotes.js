import { useState, useCallback } from "react";
import noteService from "../services/noteService";

export default function useNotes() {
  const [notes, setNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await noteService.getNotes();
      setNotes(res.data || []);
      
      const resShared = await noteService.getSharedNotes();
      setSharedNotes(resShared.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await noteService.getLabels();
      setLabels(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const deleteNote = async (id) => {
    await noteService.deleteNote(id);
    await fetchNotes();
  };

  const togglePin = async (id) => {
    await noteService.togglePin(id);
    await fetchNotes();
  };

  return {
    notes,
    sharedNotes,
    labels,
    loading,
    fetchNotes,
    fetchLabels,
    deleteNote,
    togglePin,
    setNotes,
    setSharedNotes
  };
}
