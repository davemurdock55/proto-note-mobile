import { notesMock } from "@/store/mocks/notesMock";
import { NoteContent, NoteInfo } from "@/shared/models";
import { fetch } from "expo/fetch";

// Replace with your actual API URL
const API_BASE_URL = "https://your-api-endpoint.com/notes";

export const noteService = {
  async getNotes(): Promise<NoteInfo[]> {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error("Failed to fetch notes");
      return await response.json();
    } catch (error) {
      console.warn("Failed to fetch notes, using mock data", error);
      return notesMock;
    }
  },

  async readNote(title: string): Promise<NoteContent> {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(title)}`);
      if (!response.ok) throw new Error("Failed to fetch note content");
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.warn(`Failed to fetch note "${title}", using empty content`, error);
      return `<p>This is note: ${title}</p>`;
    }
  },

  async writeNote(title: string, content: NoteContent): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(title)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to save note "${title}"`, error);
      return false;
    }
  },

  async createNote(): Promise<string | null> {
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Note ${Date.now()}` }),
      });
      if (!response.ok) throw new Error("Failed to create note");
      const data = await response.json();
      return data.title;
    } catch (error) {
      console.error("Failed to create note", error);
      return null;
    }
  },

  async deleteNote(title: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(title)}`, {
        method: "DELETE",
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to delete note "${title}"`, error);
      return false;
    }
  },
};
