import { NoteContent, NoteInfo } from "@/shared/models";
import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { noteService } from "@/services/notes-service";

/**
 * Fetches all notes from the API and sorts them by most recently edited
 * @returns Promise<NoteInfo[]> - Sorted array of note information
 */
const loadNotes = async () => {
  const notes = await noteService.getNotes();
  // sort them by most recently edited
  return notes.sort((a, b) => b.lastEditTime - a.lastEditTime);
};

/**
 * Async atom that holds the initial promise for loading notes
 */
const notesAtomAsync = atom<NoteInfo[] | Promise<NoteInfo[]>>(loadNotes());

/**
 * Exported atom for accessing the list of all notes
 * Uses unwrap to handle both the loading state and the resolved value
 */
export const notesAtom = unwrap(notesAtomAsync, (prev) => prev);

/**
 * Atom to track the currently selected note index in the notes list
 * null when no note is selected
 */
export const selectedNoteIndexAtom = atom<number | null>(null);

/**
 * Async atom that fetches the full content of the selected note
 * Returns null when no note is selected or notes haven't loaded yet
 */
const selectedNoteAtomAsync = atom(async (get) => {
  const notes = get(notesAtom);
  const selectedNoteIndex = get(selectedNoteIndexAtom);

  if (selectedNoteIndex == null || !notes) return null;

  const selectedNote = notes[selectedNoteIndex];
  const noteContent = await noteService.readNote(
    selectedNote.id,
    selectedNote.title
  );

  return {
    ...selectedNote,
    content: noteContent,
  };
});

/**
 * Exported atom for accessing the currently selected note with its content
 * Falls back to an empty note object when no note is selected
 */
export const selectedNoteAtom = unwrap(
  selectedNoteAtomAsync,
  (prev) =>
    prev ?? {
      id: "",
      title: "",
      content: "",
      lastEditTime: Date.now(),
    }
);

/**
 * Action atom for saving note changes
 * Updates the note content via API and refreshes the local state on success
 * @param newContent - The updated content to save
 */
export const saveNoteAtom = atom(
  null,
  async (get, set, newContent: NoteContent) => {
    const notes = get(notesAtom);
    const selectedNote = get(selectedNoteAtom);

    if (!selectedNote || !notes) return;

    // Save to API
    const success = await noteService.writeNote(
      selectedNote.id,
      selectedNote.title,
      newContent
    );
    if (!success) return;

    // update the saved notes's last edit time
    set(
      // use jotai's set function
      notesAtom, // to update the notesAtom
      notes.map((note) => {
        // for all of the notes in our notes array (in the jotai atom state)
        // if the note is the currently selected note
        if (note.title === selectedNote.title) {
          return {
            ...note,
            lastEditTime: Date.now(), // only updating the last edit time
          };
        }
        // if the current note is not the selected note, just return it and continue
        return note;
      })
    );
  }
);

/**
 * Action atom for creating a new empty note
 * Creates a note via API and updates local state to include it
 */
export const createEmptyNoteAtom = atom(
  null,
  async (get, set, title?: string) => {
    const notes = get(notesAtom);
    if (!notes) return;

    // Generate ID first so it's consistent through the process
    const newId = `note-${Date.now()}`;

    // Pass the ID to createNote so filesystem uses the same ID
    const userTitle = title || `Note ${Date.now()}`;
    const success = await noteService.createNote(newId, userTitle);

    if (!success) return;

    // Create new note object with the exact same ID and title
    const newNote: NoteInfo = {
      id: newId,
      title: userTitle, // Use the actual title user specified
      lastEditTime: Date.now(),
    };

    // Add new note to the beginning of the list and select it
    set(notesAtom, [newNote, ...notes.filter((note) => note.id !== newId)]);
    set(selectedNoteIndexAtom, 0);

    return newId;
  }
);

/**
 * Action atom for deleting the currently selected note
 * Removes the note via API and updates local state on success
 */
export const deleteNoteAtom = atom(null, async (get, set, id?: string) => {
  const notes = get(notesAtom);

  // If title is provided, use it directly
  if (id) {
    // Delete note via API
    const isDeleted = await noteService.deleteNote(id);

    if (!isDeleted) return;

    if (!notes) return;

    // Remove deleted note from local state
    set(
      notesAtom,
      notes.filter((note) => note.id !== id)
    );

    // If the currently selected note is the one being deleted, clear selection
    const selectedNote = get(selectedNoteAtom);
    if (selectedNote && selectedNote.id === id) {
      set(selectedNoteIndexAtom, null);
    }

    return;
  }

  // Fallback to using selected note if no title is provided (backward compatibility)
  const selectedNote = get(selectedNoteAtom);

  if (!selectedNote || !notes) return;

  // Delete note via API
  const isDeleted = await noteService.deleteNote(selectedNote.id);

  if (!isDeleted) return;

  // Remove deleted note from local state
  set(
    notesAtom,
    notes.filter((note) => note.id !== selectedNote.id)
  );

  // Clear selection
  set(selectedNoteIndexAtom, null);
});
