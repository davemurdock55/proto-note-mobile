import { NoteContent, NoteInfo } from "@/shared/models";
import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { noteService } from "@/services/notes-service";
import { currentUserAtom } from "@/store/userStore";
import { syncService } from "@/services/sync-service";

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
        `Loading content for note: ${selectedNote.title} at index ${selectedNoteIndex}`
      );

      const noteContent = await noteService.readNote(selectedNote.title);

      return {
        ...selectedNote,
        content: noteContent,
      };
    } catch (error) {
      console.error("Error loading selected note:", error);
      return null;
    }
  },
  (get, set, update) => {
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
    const currentUser = get(currentUserAtom);

    if (!selectedNote || !notes || selectedIndex === null) return;

    console.log(`Saving note: ${selectedNote.title} at index ${selectedIndex}`);
    console.log(`Content length: ${newContent.length}`);

    try {
      // Save to API/filesystem
      const success = await noteService.writeNote(
        selectedNote.title,
        newContent
      );

      if (success) {
        console.log(`Saved content successfully`);

        // Keep track of the note's title we're working with
        const selectedNoteTitle = selectedNote.title;

        // Update the note's lastEditTime in the local state to ensure it's fresh
        const updatedNotes = notes.map((note) => {
          if (note.title === selectedNoteTitle) {
            return {
              ...note,
              lastEditTime: Date.now(), // Update the edit time
            };
          }
          return note;
        });

        // Update the notes list with updated timestamps
        set(notesAtom, updatedNotes);

        // If user is logged in, we could trigger a background sync
        if (currentUser.isLoggedIn) {
          // This is optional - consider if you want auto-sync after each save
          // syncService.performSyncTask();
        }

        // Force a full refresh with a small delay to ensure files are written
        set(selectedNoteIndexAtom, null);
        setTimeout(() => {
          const currentNotes = get(notesAtom);
          if (currentNotes) {
            const index = currentNotes.findIndex(
              (note) => note.title === selectedNoteTitle
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

    // Pass the title to createNote so filesystem uses the same title
    const userTitle = title || `Note ${Date.now()}`;
    const success = await noteService.createNote(userTitle);

    if (!success) return;

    // Create new note object with the exact same title
    const newNote: NoteInfo = {
      title: userTitle, // Use the actual title user specified
      lastEditTime: Date.now(),
      createdAtTime: Date.now(),
    };

    // Add new note to the beginning of the list and select it
    set(notesAtom, [
      newNote,
      ...notes.filter((note) => note.title !== newNote.title),
    ]);
    set(selectedNoteIndexAtom, 0);

    return newNote.title;
  }
);

/**
 * Action atom for deleting the currently selected note
 * Removes the note via API and updates local state on success
 */
export const deleteNoteAtom = atom(null, async (get, set, title?: string) => {
  const notes = get(notesAtom);

  // If title is provided, use it directly
  if (title) {
    // Delete note via API
    const isDeleted = await noteService.deleteNote(title);

    if (!isDeleted) return;

    if (!notes) return;

    // Remove deleted note from local state
    set(
      notesAtom,
      notes.filter((note) => note.title !== title)
    );

    // If the currently selected note is the one being deleted, clear selection
    const selectedNote = get(selectedNoteAtom);
    if (selectedNote && selectedNote.title === title) {
      set(selectedNoteIndexAtom, null);
    }

    return;
  }

  // Fallback to using selected note if no title is provided (backward compatibility)
  const selectedNote = get(selectedNoteAtom);

  if (!selectedNote || !notes) return;

  // Delete note via API
  const isDeleted = await noteService.deleteNote(selectedNote.title);

  if (!isDeleted) return;

  // Remove deleted note from local state
  set(
    notesAtom,
    notes.filter((note) => note.title !== selectedNote.title)
  );

  // Clear selection
  set(selectedNoteIndexAtom, null);
});

/**
 * Atom for manual sync with cloud
 */
export const syncNotesAtom = atom(null, async (get, set) => {
  const notes = get(notesAtom);
  const currentUser = get(currentUserAtom);

  if (!notes || !currentUser.isLoggedIn) return false;

  try {
    // Trigger manual sync
    const success = await syncService.triggerManualSync();

    if (success) {
      // Refresh the notes list after successful sync
      const updatedNotes = await loadNotes();
      set(notesAtom, updatedNotes);
    }

    return success;
  } catch (error) {
    console.error("Sync failed:", error);
    return false;
  }
});

export const editorContentAtom = atom<string>("");
