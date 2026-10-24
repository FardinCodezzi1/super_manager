import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, CheckSquare, Square, FileText } from 'lucide-react';
import { notesService } from '../../services/notesService';
import { showToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';

export function NotesView({ refreshKey, onOpenAddNote, onEditNote }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await notesService.getNotes();
      const rawList = Array.isArray(res) ? res : res?.notes || [];
      const normalized = rawList.map((n) => {
        let items = n.items || n.checklistItems || [];
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [];
          }
        }
        if (!Array.isArray(items)) items = [];
        const mappedItems = items.map((it, idx) => {
          if (typeof it === 'string') return { id: String(idx + 1), text: it, done: false };
          return { id: it.id || String(idx + 1), text: it.text || '', done: Boolean(it.done) };
        });
        return {
          ...n,
          items: mappedItems,
          checklistItems: mappedItems,
        };
      });
      setNotes(normalized);
    } catch (err) {
      showToast(err.message || 'Failed to load notes', 'error');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refreshKey]);

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await notesService.deleteNote(deletingId);
      showToast('Note deleted', 'info');
      setDeletingId(null);
      fetchNotes();
    } catch (err) {
      showToast(err.message || 'Failed to delete note', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleChecklistItem = async (note, itemIndex) => {
    const currentItems = note.items || note.checklistItems || [];
    const updatedItems = currentItems.map((it, idx) =>
      idx === itemIndex ? { ...it, done: !it.done } : it
    );

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, items: updatedItems, checklistItems: updatedItems } : n
      )
    );

    try {
      await notesService.updateNote(note.id, {
        items: updatedItems,
        checklistItems: updatedItems,
      });
    } catch (err) {
      showToast(err.message || 'Failed to update checklist item', 'error');
      fetchNotes();
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header Strip */}
      <div className="surface-card flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
            Private Notes &amp; Checklists
          </h2>
          <p className="text-[11px] text-DynamicMuted">
            Private to your account; unaffected by mess or tour data
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddNote}
          className="tap-active px-2.5 py-1 theme-btn-primary sharp-xs text-xs font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.isArray(notes) && notes.map((note) => {
          const isChecklist = note.isChecklist && Array.isArray(note.checklistItems);

          return (
            <div
              key={note.id}
              className="p-3 surface-card border border-slate-800 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-slate-700/30">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isChecklist ? (
                      <CheckSquare className="w-3.5 h-3.5 theme-text-primary shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 theme-text-primary shrink-0" />
                    )}
                    <h3 className="text-xs font-bold text-DynamicMain truncate">{note.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditNote(note)}
                      className="tap-active p-1 text-DynamicMuted hover:text-DynamicMain sharp-xs"
                      title="Edit Note"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(note.id)}
                      className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Content / Checklists */}
                {isChecklist ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto pt-0.5">
                    {note.checklistItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleChecklistItem(note, idx)}
                        className="tap-active flex items-center gap-2 text-xs cursor-pointer select-none py-0.5"
                      >
                        {item.done ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-DynamicMuted shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            item.done
                              ? 'line-through text-DynamicMuted opacity-60'
                              : 'text-DynamicSec'
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                    {note.checklistItems.length === 0 && (
                      <p className="text-[11px] text-DynamicMuted italic">Empty checklist</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-DynamicSec whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {note.content || <span className="italic text-DynamicMuted">No content</span>}
                  </p>
                )}
              </div>

              <div className="pt-1.5 border-t border-slate-700/20 text-[9px] text-DynamicMuted flex items-center justify-between">
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                {isChecklist && (
                  <span>
                    {note.checklistItems.filter((i) => i.done).length} / {note.checklistItems.length} Done
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {notes.length === 0 && !loading && (
          <div className="sm:col-span-2 surface-card p-6 text-center text-xs text-DynamicMuted space-y-2">
            <FileText className="w-8 h-8 mx-auto text-DynamicMuted opacity-50" />
            <p>You have not created any notes or checklists yet.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal to Delete Note (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Personal Note"
        message="Are you sure you want to permanently delete this note? This action cannot be reversed."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}
