import { notesMock } from "@/store/mocks/notesMock";
import { NoteContent, NoteInfo } from "@/shared/models";
import { fetch } from "expo/fetch";
import { fileSystemService } from "./file-system-service";

// [ ] - Replace with your actual API URL
const API_BASE_URL = "https://your-api-endpoint.com/notes";

async function getNotes(): Promise<NoteInfo[]> {
  try {
    // First try to get notes from file system
    const localNotes = await fileSystemService.getNotes();
    if (localNotes.length > 0) {
      return localNotes.sort((a, b) => b.lastEditTime - a.lastEditTime);
    }

    // TODO: Do we need this?
    //  If no local notes, try API
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error("Failed to fetch notes");
    const apiNotes = await response.json();

    // Save API notes to file system
    apiNotes.forEach(async (note: NoteInfo) => {
      const content = await readNote(note.id, note.title);
      await fileSystemService.writeNote(note.id, note.title, content);
    });

    return apiNotes;
  } catch (error) {
    console.warn(
      "Failed to fetch notes from API or file system, using mock data",
      error
    );
    // Save mock data to file system for future use
    notesMock.forEach(async (note) => {
      await fileSystemService.writeNote(
        note.id,
        note.title,
        `<p>This is note: ${note.title}</p>`
      );
    });
    return notesMock;
  }
}

async function readNote(id: string, title: string): Promise<NoteContent> {
  try {
    // First try to read from file system
    const localContent = await fileSystemService.readNote(id);
    if (localContent && typeof localContent === "string") {
      // Don't try to parse HTML content as JSON
      return localContent;
    }

    // If not found locally, try API
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Failed to fetch note content");

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      try {
        // Safely parse JSON
        const data = await response.json();
        await fileSystemService.writeNote(id, title, data.content);
        return data.content;
      } catch (parseError) {
        console.warn("JSON parsing error:", parseError);
        // Return a fallback content instead of propagating the error
        return "<p>Error loading content</p>";
      }
    } else {
      // Otherwise treat as direct content
      const content = await response.text();
      await fileSystemService.writeNote(id, title, content);
      return content;
    }
  } catch (error) {
    console.warn(`Failed to fetch note "${id}", using empty content`, error);
    return `<p>This is note: ${id}</p>`;
  }
}

async function writeNote(
  id: string,
  title: string,
  content: NoteContent
): Promise<boolean> {
  try {
    // First save to file system
    const localSuccess = await fileSystemService.writeNote(id, title, content);
    if (!localSuccess) throw new Error("Failed to save note to file system");

    // Then try to sync with API
    try {
      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      // API sync failure is not critical, we already saved locally
      if (!response.ok) console.warn("Note saved locally but API sync failed");
    } catch (apiError) {
      console.warn("Note saved locally but API sync failed", apiError);
    }

    return true;
  } catch (error) {
    console.error(`Failed to save note "${title}"`, error);
    return false;
  }
}

async function createNote(id: string, title: string): Promise<boolean> {
  try {
    // Create note in file system with provided ID and title
    const success = await fileSystemService.createNote(id, title);
    if (!success) throw new Error("Failed to create note in file system");

    // Try to sync with API
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      // API sync failure is not critical, we already created locally
      if (!response.ok)
        console.warn("Note created locally but API sync failed");
    } catch (apiError) {
      console.warn("Note created locally but API sync failed", apiError);
    }

    return true;
  } catch (error) {
    console.error("Failed to create note", error);
    return false;
  }
}

async function deleteNote(id: string): Promise<boolean> {
  try {
    // First delete from file system
    const localSuccess = await fileSystemService.deleteNote(id);
    if (!localSuccess)
      throw new Error("Failed to delete note from file system");

    // Then try to sync with API
    try {
      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
      // API sync failure is not critical, we already deleted locally
      if (!response.ok)
        console.warn("Note deleted locally but API sync failed");
    } catch (apiError) {
      console.warn("Note deleted locally but API sync failed", apiError);
    }

    return true;
  } catch (error) {
    console.error(`Failed to delete note "${id}"`, error);
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
