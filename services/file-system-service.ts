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
    // This method stays mostly the same
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

  // Change to use ID instead of title
  async readNote(id: string): Promise<NoteContent> {
    await this.initializeDirectory();
    const path = `${NOTES_DIRECTORY}${this.sanitizeFilename(id)}.content`;

    try {
      return await FileSystem.readAsStringAsync(path);
    } catch (error) {
      console.warn(`Failed to read note with ID: ${id}`, error);
      return `<p>Note content unavailable</p>`;
    }
  },

  // Update to use ID for filenames
  async writeNote(
    id: string,
    title: string,
    content: NoteContent
  ): Promise<boolean> {
    await this.initializeDirectory();
    // Use ID for filenames instead of title
    const contentPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(
      id
    )}.content`;
    const metaPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(id)}.meta.json`;

    try {
      // Write content file
      const contentString = content || "";
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
      console.error(`Failed to write note with ID: ${id}`, error);
      return false;
    }
  },

  async createNote(id: string, title: string): Promise<boolean> {
    await this.initializeDirectory();
    const metaPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(id)}.meta.json`;
    const contentPath = `${NOTES_DIRECTORY}${this.sanitizeFilename(
      id
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
      return true;
    } catch (error) {
      console.error(`Failed to create note file: ${title}`, error);
      return false;
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
