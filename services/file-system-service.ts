import * as FileSystem from "expo-file-system";
import { NoteContent, NoteInfo } from "@/shared/models";

const NOTES_DIRECTORY = `${FileSystem.documentDirectory}notes/`;

export const fileSystemService = {
  async initializeDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(NOTES_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(NOTES_DIRECTORY, {
        intermediates: true,
      });
    }
  },

  async getNotes(): Promise<NoteInfo[]> {
    await this.initializeDirectory();
    const files = await FileSystem.readDirectoryAsync(NOTES_DIRECTORY);
    const metadataFiles = files.filter((file) => file.endsWith(".meta.json"));

    const notesPromises = metadataFiles.map(async (file) => {
      const content = await FileSystem.readAsStringAsync(
        `${NOTES_DIRECTORY}${file}`
      );
      return JSON.parse(content) as NoteInfo;
    });

    return Promise.all(notesPromises);
  },

  async readNote(title: string): Promise<NoteContent> {
    await this.initializeDirectory();
    const path = `${NOTES_DIRECTORY}${this.sanitizeFilename(title)}.content`;

    try {
      return await FileSystem.readAsStringAsync(path);
    } catch (error) {
      console.warn(`Failed to read note from file: ${title}`, error);
      return `<p>This is note: ${title}</p>`;
    }
  },

  async writeNote(
    id: string,
    title: string,
    content: NoteContent
  ): Promise<boolean> {
    await this.initializeDirectory();
    const contentPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(title)}.txt`;
    const metaPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(
      title
    )}.meta.json`;

    try {
      // Write content file - ensure content is a string
      const contentString = content || ""; // Provide empty string if content is undefined
      await FileSystem.writeAsStringAsync(contentPath, contentString);

      // Update metadata file
      const metadata: NoteInfo = {
        id: id,
        title: title,
        lastEditTime: Date.now(),
      };

      await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(metadata));
      return true;
    } catch (error) {
      console.error(`Failed to write note to file: ${title}`, error);
      return false;
    }
  },

  async createNote(
    id: string = `note-${Date.now()}`,
    title: string = `Note ${Date.now()}`
  ): Promise<string | null> {
    await this.initializeDirectory();
    const metaPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(
      title
    )}.meta.json`;
    const contentPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(
      title
    )}.content`;

    try {
      // Create empty content file
      await FileSystem.writeAsStringAsync(contentPath, "");

      // Create metadata file
      const metadata: NoteInfo = {
        id: id,
        title: title,
        lastEditTime: Date.now(),
      };

      await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(metadata));
      return title;
    } catch (error) {
      console.error(`Failed to create note file: ${title}`, error);
      return null;
    }
  },

  async deleteNote(id: string): Promise<boolean> {
    await this.initializeDirectory();
    const contentPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(
      id
    )}.content`;
    const metaPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(id)}.meta.json`;

    try {
      // Delete both files
      await FileSystem.deleteAsync(contentPath, { idempotent: true });
      await FileSystem.deleteAsync(metaPath, { idempotent: true });
      return true;
    } catch (error) {
      console.error(`Failed to delete note file: ${id}`, error);
      return false;
    }
  },

  sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  },
};
