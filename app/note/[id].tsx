import { TenTapEditor } from "@/components/TenTapEditor";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useCallback, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useAtomValue, useSetAtom } from "jotai";
import {
  notesAtom,
  selectedNoteIndexAtom,
  saveNoteAtom,
  selectedNoteAtom,
} from "@/store";

export default function NotePage() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const notes = useAtomValue(notesAtom);
  const selectedNote = useAtomValue(selectedNoteAtom);
  const setSelectedIndex = useSetAtom(selectedNoteIndexAtom);
  const saveNote = useSetAtom(saveNoteAtom);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Ref to store the timeout ID
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function - keep this as is
  const debouncedSave = useCallback(
    (content: string) => {
      // Clear any existing timeout
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set a new timeout for 1 minute (60000ms)
      saveTimerRef.current = setTimeout(() => {
        saveNote(content);
      }, 60000);
    },
    [saveNote]
  );

  useEffect(() => {
    setIsLoading(true); // Set loading when id changes
    if (id && notes) {
      // Find the note with matching ID
      const noteIndex = notes.findIndex((note) => note.id === id);

      if (noteIndex !== -1) {
        setSelectedIndex(noteIndex);
      }
    }

    // Cleanup timeout when component unmounts
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [id, notes, setSelectedIndex]);

  // Add a separate effect for updating title and tracking when content loads
  useEffect(() => {
    if (selectedNote && selectedNote.id === id) {
      navigation.setOptions({ title: selectedNote.title });
      setIsLoading(false); // Content loaded
    }
  }, [selectedNote, navigation, id]);

  return (
    <View style={styles.container}>
      <Text>{selectedNote?.id}</Text>
      <Text>{selectedNote?.title}</Text>
      <Text>{selectedNote?.lastEditTime}</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading note...</Text>
        </View>
      ) : (
        <TenTapEditor
          // Add key prop to force re-render when id changes
          key={selectedNote?.id}
          initialValue={selectedNote?.content || "<p>Start writing...</p>"}
          onChange={(content: string) => debouncedSave(content)}
        />
      )}
    </View>
  );
}

// Add this to your styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    fontFamily: "sans-serif",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
