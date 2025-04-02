import { notesMock } from "@/store/mocks/notesMock";
import { NoteContent, NoteInfo } from "@/shared/models";
import { fetch } from "expo/fetch";
import { fileSystemService } from "./file-system-service";

async function getNotes(): Promise<NoteInfo[]> {
  try {
    // First try to get notes from file system
    const localNotes = await fileSystemService.getNotes();
    if (localNotes.length > 0) {
      return localNotes.sort((a, b) => b.lastEditTime - a.lastEditTime);
    }

    // If we have no notes, create mock data
    console.log("No notes found, creating mock data");
    await Promise.all(
      notesMock.map((note) =>
        fileSystemService.writeNote(note.title, `This is note: ${note.title}`)
      )
    );
    return notesMock;
  } catch (error) {
    console.warn(
      "Failed to fetch notes from API or file system, using mock data",
      error
    );
    // Save mock data to file system for future use
    await Promise.all(
      notesMock.map((note) =>
        fileSystemService.writeNote(note.title, `This is note: ${note.title}`)
      )
    );
    return notesMock;
  }
}

async function readNote(title: string): Promise<NoteContent> {
  try {
    // First try to read from file system
    const localContent = await fileSystemService.readNote(title);
    if (localContent && typeof localContent === "string") {
      return localContent;
    }

    return localContent;
  } catch (error) {
    console.warn(`Failed to fetch note "${title}", using empty content`, error);
    return `This is note: ${title}`;
  }
}

async function writeNote(
  title: string,
  content: NoteContent
): Promise<boolean> {
  try {
    // First save to file system
    const localSuccess = await fileSystemService.writeNote(title, content);
    if (!localSuccess) throw new Error("Failed to save note to file system");

    return true;
  } catch (error) {
    console.error(`Failed to save note "${title}"`, error);
    return false;
  }
}

async function createNote(title: string): Promise<boolean> {
  try {
    // Create note in file system with provided title
    const success = await fileSystemService.createNote(title);
    if (!success) throw new Error("Failed to create note in file system");

    return true;
  } catch (error) {
    console.error("Failed to create note", error);
    return false;
  }
}

async function deleteNote(title: string): Promise<boolean> {
  try {
    // First delete from file system
    const localSuccess = await fileSystemService.deleteNote(title);
    if (!localSuccess)
      throw new Error("Failed to delete note from file system");

    return true;
  } catch (error) {
    console.error(`Failed to delete note "${title}"`, error);
    return false;
  }
}
export const noteService = {
  getNotes,
  readNote,
  writeNote,
  createNote,
  deleteNote,
};
