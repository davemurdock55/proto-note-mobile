import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { fileSystemService } from "./file-system-service";
import { fetch } from "expo/fetch";
import { NoteInfo } from "@/shared/models";

// [ ] - Replace with your actual API URL
const API_BASE_URL = "https://your-api-endpoint.com/notes";
const SYNC_TASK_NAME = "background-notes-sync";

// Extract the task logic into a separate function that can be reused
async function performSyncTask() {
  try {
    console.log(`Running sync at: ${new Date().toISOString()}`);

    // Get local notes
    const localNotes = await fileSystemService.getNotes();

    // Get remote notes
    let remoteNotes = [];
    try {
      const response = await fetch(API_BASE_URL);
      if (response.ok) {
        remoteNotes = await response.json();
      }
    } catch (error) {
      console.warn("Failed to fetch remote notes during sync", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Compare and sync (simple strategy: most recent edit wins)
    let hasChanges = false;

    // Map for efficient lookup
    const localNotesMap: Map<string, NoteInfo> = new Map(
      localNotes.map((note: NoteInfo) => [note.id, note])
    );
    const remoteNotesMap: Map<string, NoteInfo> = new Map(
      remoteNotes.map((note: NoteInfo) => [note.id, note])
    );

    // Upload local notes that are newer than remote
    for (const [id, localNote] of localNotesMap) {
      const remoteNote = remoteNotesMap.get(id);

      if (!remoteNote || localNote.lastEditTime > remoteNote.lastEditTime) {
        // Local note is newer or doesn't exist remotely - upload it
        const content = await fileSystemService.readNote(localNote.id);
        try {
          await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          hasChanges = true;
        } catch (error) {
          console.warn(
            `Failed to upload note during sync: ${localNote.title}`,
            error
          );
        }
      }
    }

    // Download remote notes that are newer than local
    for (const [id, remoteNote] of remoteNotesMap) {
      const localNote = localNotesMap.get(id);

      if (!localNote || remoteNote.lastEditTime > localNote.lastEditTime) {
        // Remote note is newer or doesn't exist locally - download it
        try {
          const response = await fetch(
            `${API_BASE_URL}/${encodeURIComponent(id)}`
          );
          if (response.ok) {
            const data = await response.json();
            await fileSystemService.writeNote(
              id,
              remoteNote.title,
              data.content
            );
            hasChanges = true;
          }
        } catch (error) {
          console.warn(
            `Failed to download note during sync: ${remoteNote.title}`,
            error
          );
        }
      }
    }

    return hasChanges
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Error during sync:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

// Define the background task
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    console.log(`Running background sync at: ${new Date().toISOString()}`);

    // Get local notes
    const localNotes = await fileSystemService.getNotes();

    // Get remote notes
    let remoteNotes = [];
    try {
      const response = await fetch(API_BASE_URL);
      if (response.ok) {
        remoteNotes = await response.json();
      }
    } catch (error) {
      console.warn("Failed to fetch remote notes during sync", error);
      // If we can't get remote notes, we can't sync properly
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Compare and sync (simple strategy: most recent edit wins)
    let hasChanges = false;

    // Map for efficient lookup
    const localNotesMap: Map<string, NoteInfo> = new Map(
      localNotes.map((note: NoteInfo) => [note.id, note])
    );
    const remoteNotesMap: Map<string, NoteInfo> = new Map(
      remoteNotes.map((note: NoteInfo) => [note.id, note])
    );

    // Upload local notes that are newer than remote
    for (const [id, localNote] of localNotesMap) {
      const remoteNote = remoteNotesMap.get(id);

      if (!remoteNote || localNote.lastEditTime > remoteNote.lastEditTime) {
        // Local note is newer or doesn't exist remotely - upload it
        const content = await fileSystemService.readNote(localNote.id);
        try {
          await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          hasChanges = true;
        } catch (error) {
          console.warn(
            `Failed to upload note during sync: ${localNote.title}`,
            error
          );
        }
      }
    }

    // Download remote notes that are newer than local
    for (const [id, remoteNote] of remoteNotesMap) {
      const localNote = localNotesMap.get(id);

      if (!localNote || remoteNote.lastEditTime > localNote.lastEditTime) {
        // Remote note is newer or doesn't exist locally - download it
        try {
          const response = await fetch(
            `${API_BASE_URL}/${encodeURIComponent(id)}`
          );
          if (response.ok) {
            const data = await response.json();
            await fileSystemService.writeNote(
              id,
              remoteNote.title,
              data.content
            );
            hasChanges = true;
          }
        } catch (error) {
          console.warn(
            `Failed to download note during sync: ${remoteNote.title}`,
            error
          );
        }
      }
    }

    return hasChanges
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Error during background sync:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const syncService = {
  async registerSyncTask() {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background sync task registered");
  },

  async unregisterSyncTask() {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
    console.log("Background sync task unregistered");
  },

  async isSyncTaskRegistered() {
    return await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  },

  async triggerManualSync() {
    // Check if task is registered before attempting to execute
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      SYNC_TASK_NAME
    );
    if (isRegistered) {
      // Use the same function that the background task uses
      return await performSyncTask();
    } else {
      console.warn(`Task ${SYNC_TASK_NAME} not registered`);
    }
  },
};
