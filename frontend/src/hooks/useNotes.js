import { useState, useCallback } from "react";
import noteService from "../services/noteService";

export default function useNotes(onUnauthorized) {
  const [notes, setNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);

  const handleError = useCallback((error) => {
    if (error?.status === 401) {
      setNotes([]);
      setSharedNotes([]);
      setLabels([]);
      onUnauthorized?.();
      return;
    }

    console.error(error);
  }, [onUnauthorized]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await noteService.getNotes();
      setNotes(res.data || []);
      
      const resShared = await noteService.getSharedNotes();
      setSharedNotes(resShared.data || []);
    } catch (e) {
      handleError(e);
    }
  }, [handleError]);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await noteService.getLabels();
      setLabels(res.data || []);
    } catch (e) {
      handleError(e);
    }
  }, [handleError]);

  const deleteNote = async (id, password = null) => {
    await noteService.deleteNote(id, password);
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
