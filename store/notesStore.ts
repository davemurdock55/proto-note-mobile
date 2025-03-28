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
const selectedNoteAtomAsync = atom(
  // Read function (same as before)
  async (get) => {
    const notes = get(notesAtom);
    const selectedNoteIndex = get(selectedNoteIndexAtom);

    // Ensure we have a valid index
    if (
      selectedNoteIndex === null ||
      !Number.isInteger(selectedNoteIndex) ||
      !notes ||
      selectedNoteIndex < 0 ||
      selectedNoteIndex >= notes.length
    ) {
      console.log("Invalid selected note index:", selectedNoteIndex);
      return null;
    }

    try {
      const selectedNote = notes[selectedNoteIndex];
      console.log(
        `Loading content for note: ${selectedNote.id} at index ${selectedNoteIndex}`
      );

      const noteContent = await noteService.readNote(
        selectedNote.id,
        selectedNote.title
      );

      return {
        ...selectedNote,
        content: noteContent,
      };
    } catch (error) {
      console.error("Error loading selected note:", error);
      return null;
    }
  },
  // Add a write function that just passes through
  // This makes it a writable atom
  (get, set, update) => {
    // update will be a Promise resolved with the note data
    return update;
  }
);

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
    const selectedIndex = get(selectedNoteIndexAtom);

    if (!selectedNote || !notes || selectedIndex === null) return;

    console.log(`Saving note: ${selectedNote.id} at index ${selectedIndex}`);
    console.log(`Content length: ${newContent.length}`);

    try {
      // Save to API/filesystem
      const success = await noteService.writeNote(
        selectedNote.id,
        selectedNote.title,
        newContent
      );

      if (success) {
        console.log(`Saved content successfully`);

        // Keep track of the ID we're working with
        const selectedNoteId = selectedNote.id;

        // Update the note's lastEditTime in the local state to ensure it's fresh
        const updatedNotes = notes.map((note) => {
          if (note.id === selectedNoteId) {
            return {
              ...note,
              lastEditTime: Date.now(), // Update the edit time
            };
          }
          return note;
        });

        // Update the notes list with updated timestamps
        set(notesAtom, updatedNotes);

        // Force a full refresh with a small delay to ensure files are written
        set(selectedNoteIndexAtom, null);
        setTimeout(() => {
          const currentNotes = get(notesAtom);
          if (currentNotes) {
            const index = currentNotes.findIndex(
              (note) => note.id === selectedNoteId
            );
            if (index !== -1) {
              set(selectedNoteIndexAtom, index);
              console.log(`Re-selected note at index ${index}`);
            }
          }
        }, 300); // Increase timeout slightly to ensure file is fully written
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
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
