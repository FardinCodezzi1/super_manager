import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { notesService } from '../../services/notesService';
import { showToast } from '../common/Toast';

export function NoteModal({ isOpen, onClose, noteToEdit, onSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isChecklist, setIsChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title || '');
      setIsChecklist(!!noteToEdit.isChecklist);
      const items = noteToEdit.items || noteToEdit.checklistItems || [];
      if (noteToEdit.isChecklist && Array.isArray(items)) {
        setContent(items.map((it) => (typeof it === 'string' ? it : it.text || '')).join('\n'));
      } else {
        setContent(noteToEdit.content || '');
      }
    } else {
      setTitle('');
      setContent('');
      setIsChecklist(false);
    }
  }, [noteToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return showToast('Title is required', 'error');

    let items = undefined;
    if (isChecklist) {
      items = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, idx) => ({
          id: String(idx + 1),
          text,
          done: false,
        }));
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content: isChecklist ? '' : content.trim(),
        isChecklist,
        items,
        checklistItems: items,
      };

      if (noteToEdit) {
        await notesService.updateNote(noteToEdit.id, payload);
        showToast('Note updated!', 'success');
      } else {
        await notesService.createNote(payload);
        showToast('Note created!', 'success');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to save note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={noteToEdit ? 'Edit Personal Note' : 'New Personal Note'}
      subtitle="100% private to your account"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Groceries"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="modal-note-is-checklist"
            checked={isChecklist}
            onChange={(e) => setIsChecklist(e.target.checked)}
            className="sharp-xs"
          />
          <label htmlFor="modal-note-is-checklist" className="text-xs text-DynamicSec select-none cursor-pointer">
            Format as Grocery / Todo Checklist
          </label>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            {isChecklist ? 'Checklist Items (one per line)' : 'Note Content'}
          </label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isChecklist
                ? 'Eggs (1 dozen)\nMilk (2L)\nToothpaste\nApples (1kg)'
                : 'Write your private notes here...'
            }
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs leading-relaxed"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving...' : noteToEdit ? 'Update Note' : 'Save Note'}
        </button>
      </form>
    </Modal>
  );
}
