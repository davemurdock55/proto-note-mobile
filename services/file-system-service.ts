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
  console.log("Files in directory:", files);
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

async function readNoteFromFiles(title: string): Promise<NoteContent> {
  try {
    await initializeDirectory();
    const sanitizedTitle = sanitizeFilename(title);
    const path = `${NOTES_DIRECTORY}${sanitizedTitle}.txt`;

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
    console.warn(`Failed to read note with title: ${title}`, error);
    return `Error reading note content`; // Plain text error message
  }
}

async function writeNoteFromFiles(
  title: string,
  content: NoteContent,
  timestamp?: number
): Promise<boolean> {
  try {
    await initializeDirectory();
    const sanitizedTitle = sanitizeFilename(title);
    const metaPath = `${NOTES_DIRECTORY}${sanitizedTitle}.meta.json`;
    const contentPath = `${NOTES_DIRECTORY}${sanitizedTitle}.txt`;

    console.log(
      `Writing note with title "${title}" (sanitized: "${sanitizedTitle}")`
    );
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

    // Use provided timestamp or current time if not provided
    const metadata: NoteInfo = {
      title,
      lastEditTime: timestamp || Date.now(),
      createdAtTime: fileInfo.modificationTime || Date.now(),
    };

    await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(metadata));

    return true;
  } catch (error) {
    console.error(`Failed to write note with title: ${title}`, error);
    return false;
  }
}

async function createNoteAsFile(title: string): Promise<boolean> {
  await initializeDirectory();
  const sanitizedTitle = sanitizeFilename(title);
  const metaPath = `${NOTES_DIRECTORY}${sanitizedTitle}.meta.json`;
  const contentPath = `${NOTES_DIRECTORY}${sanitizedTitle}.txt`;

  try {
    await FileSystem.writeAsStringAsync(contentPath, "");

    // Create metadata file
    const metadata: NoteInfo = {
      title: title,
      lastEditTime: Date.now(),
      createdAtTime: Date.now(),
    };

    await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(metadata));
    return true;
  } catch (error) {
    console.error(`Failed to create note file: ${title}`, error);
    return false;
  }
}

async function deleteNoteFromFiles(title: string): Promise<boolean> {
  await initializeDirectory();
  const sanitizedTitle = sanitizeFilename(title);
  const metaPath = `${NOTES_DIRECTORY}${sanitizedTitle}.meta.json`;
  const contentPath = `${NOTES_DIRECTORY}${sanitizedTitle}.txt`;

  try {
    // Delete both files
    await FileSystem.deleteAsync(contentPath, { idempotent: true });
    await FileSystem.deleteAsync(metaPath, { idempotent: true });
    return true;
  } catch (error) {
    console.error(`Failed to delete note file: ${title}`, error);
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
  createNote: createNoteAsFile,
  deleteNote: deleteNoteFromFiles,
  sanitizeFilename,
};
