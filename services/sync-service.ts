import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { fileSystemService } from "./file-system-service";
import { NoteInfo, FullNote } from "@/shared/models";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { protoNoteAPI } from "@/shared/constants";
import * as Device from "expo-device";
import * as Application from "expo-application";

// Constants for API and task name
const NOTES_ENDPOINT = `${protoNoteAPI}/notes`;
const SYNC_TASK_NAME = "background-notes-sync";
const DEVICE_ID_KEY = "device_id";
const LAST_SYNCED_TIME_KEY = "last_synced_time";

// Get current user helper function
async function getCurrentUser() {
  try {
    const userDataString = await SecureStore.getItemAsync("user");
    if (!userDataString) return null;
    return JSON.parse(userDataString);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Gets or creates a device ID for sync identification
 */
async function getDeviceId(): Promise<string> {
  try {
    // First try to get stored ID
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (!deviceId) {
      // Create a new device ID based on device info
      const deviceName = Device.deviceName || "";
      const installationId = await Application.getInstallationTimeAsync();
      const deviceBrand = Device.brand || "";
      const deviceModel = Device.modelName || "";

      // Create a composite ID
      deviceId = `${deviceBrand}-${deviceModel}-${installationId}`.substring(
        0,
        32
      );

      // Store it for future use
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      console.log(`Generated new device ID: ${deviceId}`);
    }

    return deviceId;
  } catch (error) {
    console.error("Error getting device ID:", error);
    // Fallback to a random ID if there's an error
    const fallbackId = Math.random().toString(36).substring(2, 15);
    return `fallback-${fallbackId}`;
  }
}

/**
 * Gets the last synced time for this device
 */
async function getLastSyncedTime(): Promise<number> {
  try {
    const timeString = await SecureStore.getItemAsync(LAST_SYNCED_TIME_KEY);
    return timeString ? parseInt(timeString, 10) : 0;
  } catch (error) {
    console.error("Error getting last synced time:", error);
    return 0;
  }
}

/**
 * Updates the last synced time for this device
 */
async function updateLastSyncedTime(timestamp: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_SYNCED_TIME_KEY, timestamp.toString());
    console.log(
      `Updated last synced time to: ${new Date(timestamp).toISOString()}`
    );
  } catch (error) {
    console.error("Error updating last synced time:", error);
  }
}

/**
 * Performs the sync operation between local and cloud notes
 */
async function performSyncTask() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return BackgroundFetch.BackgroundFetchResult.NoData;

    const deviceId = await getDeviceId();
    const lastSyncedTime = await getLastSyncedTime();

    const localNotes = await fileSystemService.getNotes();
    const notesPayload: FullNote[] = [];

    for (const note of localNotes) {
      const content = await fileSystemService.readNote(note.title);
      notesPayload.push({
        title: note.title,
        content,
        lastEditTime: note.lastEditTime,
        createdAtTime: note.createdAtTime,
      });
    }

    const response = await fetch(`${NOTES_ENDPOINT}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        username: currentUser.username,
        deviceId,
        notes: notesPayload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const responseData = await response.json();

    await updateLastSyncedTime(responseData.lastSyncedTime);
    await reconcileWithCloudNotes(responseData.notes, notesPayload);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Error syncing notes:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

/**
 * Reconciles local notes with cloud notes
 * @param cloudNotes - Notes received from the cloud API
 * @param localNotes - Local notes that were sent to the API
 */
async function reconcileWithCloudNotes(
  cloudNotes: FullNote[],
  localNotes: FullNote[]
) {
  console.log("Beginning reconciliation with cloud notes...");
  console.log(`Received ${cloudNotes.length} notes from server`);

  // Create maps for easier lookup
  const localNotesMap = new Map<string, FullNote>();
  localNotes.forEach((note) => localNotesMap.set(note.title, note));

  const cloudNotesMap = new Map<string, FullNote>();
  cloudNotes.forEach((note) => cloudNotesMap.set(note.title, note));

  // Process each cloud note
  for (const cloudNote of cloudNotes) {
    const localNote = localNotesMap.get(cloudNote.title);

    // Always preserve the earliest createdAtTime between local and cloud
    const createdAtTime =
      localNote && localNote.createdAtTime && cloudNote.createdAtTime
        ? Math.min(localNote.createdAtTime, cloudNote.createdAtTime)
        : cloudNote.createdAtTime || localNote?.createdAtTime || Date.now();

    // For lastEditTime, take the more recent one
    const lastEditTime =
      localNote && localNote.lastEditTime && cloudNote.lastEditTime
        ? Math.max(localNote.lastEditTime, cloudNote.lastEditTime)
        : cloudNote.lastEditTime || localNote?.lastEditTime || Date.now();

    await fileSystemService.writeNote(
      cloudNote.title,
      cloudNote.content,
      lastEditTime,
      createdAtTime
    );
  }

  // Delete local notes not in cloud
  for (const [title, _] of localNotesMap.entries()) {
    if (!cloudNotesMap.has(title)) {
      await fileSystemService.deleteNote(title);
    }
  }

  console.log("Reconciliation complete");
}

// Define the background task
TaskManager.defineTask(SYNC_TASK_NAME, performSyncTask);

/**
 * Registers the background sync task
 */
async function registerSyncTask() {
  try {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background sync task registered");
    return true;
  } catch (error) {
    console.error("Failed to register background sync task:", error);
    return false;
  }
}

/**
 * Unregisters the background sync task
 */
async function unregisterSyncTask() {
  try {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
    console.log("Background sync task unregistered");
    return true;
  } catch (error) {
    console.error("Failed to unregister background sync task:", error);
    return false;
  }
}

/**
 * Checks if the sync task is registered
 */
async function isSyncTaskRegistered() {
  return await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
}

// In services/sync-service.ts, modify the triggerManualSync function:

// In services/sync-service.ts, modify the triggerManualSync function:

/**
 * Triggers a manual sync and shows the result
 * @param onSyncComplete Optional callback for when sync is complete
 */
async function triggerManualSync(onSyncComplete?: (success: boolean) => void) {
  try {
    console.log(`Triggering manual sync at: ${new Date().toISOString()}`);
    const result = await performSyncTask();
    const success =
      result === BackgroundFetch.BackgroundFetchResult.NewData ||
      result === BackgroundFetch.BackgroundFetchResult.NoData;

    if (result === BackgroundFetch.BackgroundFetchResult.NewData) {
      Alert.alert(
        "Sync Successful",
        "Your notes have been synced with the cloud."
      );
    } else if (result === BackgroundFetch.BackgroundFetchResult.NoData) {
      Alert.alert("Sync Complete", "No changes were needed.");
    } else {
      Alert.alert(
        "Sync Failed",
        "There was a problem syncing your notes. Please try again later."
      );
    }

    // Call the callback with the success status
    if (onSyncComplete) {
      onSyncComplete(success);
    }

    return success;
  } catch (error) {
    console.error("Error during manual sync:", error);
    Alert.alert("Sync Error", "An unexpected error occurred during sync.");

    // Call the callback with failure
    if (onSyncComplete) {
      onSyncComplete(false);
    }

    return false;
  }
}

export const syncService = {
  registerSyncTask,
  unregisterSyncTask,
  isSyncTaskRegistered,
  triggerManualSync,
  performSyncTask,
};
