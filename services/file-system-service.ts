import * as FileSystem from "expo-file-system";
import { NoteContent, NoteInfo } from "@/shared/models";

const NOTES_DIRECTORY = `${FileSystem.documentDirectory}notes/`;

// Initialize notes directory if it doesn't exist
async function initializeDirectory(): Promise<void> {
  // Get directory info
  const dirInfo = await FileSystem.getInfoAsync(NOTES_DIRECTORY);
  if (!dirInfo.exists) {
    // Create directory if it doesn't exist
    await FileSystem.makeDirectoryAsync(NOTES_DIRECTORY, {
      intermediates: true,
    });
  }
}

async function getNotesFromFiles(): Promise<NoteInfo[]> {
  // This method stays mostly the same
  await initializeDirectory();
  // Get all files in the directory
  const files = await FileSystem.readDirectoryAsync(NOTES_DIRECTORY);
  // Filter out metadata files
  const metadataFiles = files.filter((file) => file.endsWith(".meta.json"));

  const notesPromises = metadataFiles.map(async (file) => {
    const content = await FileSystem.readAsStringAsync(
      `${NOTES_DIRECTORY}${file}`
    );
    return JSON.parse(content) as NoteInfo;
  });

  return Promise.all(notesPromises);
}

async function readNoteFromFiles(id: string): Promise<NoteContent> {
  try {
    await initializeDirectory();
    const sanitizedId = sanitizeFilename(id);
    const path = `${NOTES_DIRECTORY}${sanitizedId}.txt`;

    const fileInfo = await FileSystem.getInfoAsync(path);
    if (!fileInfo.exists) {
      console.warn(`Note content file does not exist: ${path}`);
      return "Note content not found";
    }

    const content = await FileSystem.readAsStringAsync(path);
    console.log(
      `Successfully read content, length: ${content.length} characters`
    );

    return content;
  } catch (error) {
    console.warn(`Failed to read note with ID: ${id}`, error);
    return `Error reading note content`; // Plain text error message
  }
}

async function writeNoteFromFiles(
  id: string,
  title: string,
  content: NoteContent
): Promise<boolean> {
  try {
    await initializeDirectory();
    const sanitizedId = sanitizeFilename(id);
    const contentPath = `${NOTES_DIRECTORY}${sanitizedId}.txt`;
    const metaPath = `${NOTES_DIRECTORY}${sanitizedId}.meta.json`;

    console.log(`Writing note with ID "${id}" (sanitized: "${sanitizedId}")`);
    console.log(`Content path: ${contentPath}`);
    console.log(`Metadata path: ${metaPath}`);

    // Ensure content is a string
    const contentString =
      typeof content === "string" ? content : String(content);

    // Write content file
    await FileSystem.writeAsStringAsync(contentPath, contentString);

    // Verify write
    const fileInfo = await FileSystem.getInfoAsync(contentPath);
    if (!fileInfo.exists) {
      throw new Error(`Failed to write content file at ${contentPath}`);
    }

    // Write metadata with current timestamp
    const metadata: NoteInfo = {
      id,
      title,
      lastEditTime: Date.now(),
    };

    await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(metadata));

    return true;
  } catch (error) {
    console.error(`Failed to write note with ID: ${id}`, error);
    return false;
  }
}

async function createNoteFromFiles(
  id: string,
  title: string
): Promise<boolean> {
  await initializeDirectory();
  const metaPath = `${NOTES_DIRECTORY}${sanitizeFilename(id)}.meta.json`;
  const contentPath = `${NOTES_DIRECTORY}${sanitizeFilename(id)}.txt`;

  try {
    await FileSystem.writeAsStringAsync(contentPath, "Start writing...");

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
}

async function deleteNoteFromFiles(id: string): Promise<boolean> {
  await initializeDirectory();
  const contentPath = `${NOTES_DIRECTORY}${sanitizeFilename(id)}.txt`;
  const metaPath = `${NOTES_DIRECTORY}${sanitizeFilename(id)}.meta.json`;

  try {
    // Delete both files
    await FileSystem.deleteAsync(contentPath, { idempotent: true });
    await FileSystem.deleteAsync(metaPath, { idempotent: true });
    return true;
  } catch (error) {
    console.error(`Failed to delete note file: ${id}`, error);
    return false;
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

export const fileSystemService = {
  initializeDirectory,
  getNotes: getNotesFromFiles,
  readNote: readNoteFromFiles,
  writeNote: writeNoteFromFiles,
  createNote: createNoteFromFiles,
  deleteNote: deleteNoteFromFiles,
  sanitizeFilename,
};
