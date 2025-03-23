import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";

type CreateNoteParams = {
  createNote: (title: string) => string;
  onSuccess: (noteId: string) => void;
};

export const showCreateNoteDialog = ({
  createNote,
  onSuccess,
}: CreateNoteParams) => {
  // iOS implementation
  if (Platform.OS === "ios") {
    Alert.prompt(
      "Create New Note",
      "Enter a name for your new note:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Create",
          onPress: (name) => {
            if (name && name.trim()) {
              const noteTitle = name.trim() ?? "New Note";
              const newNoteId = createNote(noteTitle);

              console.log("New note created:", newNoteId);
              onSuccess(newNoteId);

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          },
        },
      ],
      "plain-text",
      "New Note"
    );
  } else {
    // Android implementation
    Alert.alert("Create New Note", "Enter a name for your new note:", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Create",
        onPress: () => {
          // For Android, you'd ideally implement a custom modal with TextInput
          const noteTitle = `Note ${new Date().toLocaleDateString()}`;
          const newNoteId = createNote(noteTitle);
          onSuccess(newNoteId);
        },
      },
    ]);

    // NOTE: For Android, the above is limited as we can't include a TextInput inside Alert
    // A better approach would be using a modal component with TextInput
    // Consider implementing a custom modal dialog for Android
  }
};
