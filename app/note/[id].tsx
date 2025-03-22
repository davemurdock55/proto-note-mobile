import { TenTapEditor } from "@/components/TenTapEditor";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useCallback, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { useAtomValue, useSetAtom } from "jotai";
import {
  notesAtom,
  selectedNoteIndexAtom,
  saveNoteAtom,
  selectedNoteAtom,
} from "@/store";
import { IconSymbol } from "@/components/ui/IconSymbol";

// Define these outside of the NotePage component
const BackButton = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      opacity: pressed ? 0.6 : 1,
      marginRight: 15,
    })}
  >
    <IconSymbol name="chevron.left" size={24} color="#0a7ea4" />
  </Pressable>
);

const SaveButton = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      opacity: pressed ? 0.6 : 1,
      marginLeft: 15,
    })}
  >
    <Text style={{ color: "#0a7ea4", fontWeight: "500", fontSize: 18 }}>
      Save
    </Text>
  </Pressable>
);

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

  const handleManualSave = useCallback(() => {
    if (selectedNote && selectedNote.content) {
      // Clear any pending autosave
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      // Perform immediate save
      saveNote(selectedNote.content);
    }
  }, [selectedNote, saveNote]);

  // In your component:
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
      headerRight: () => <SaveButton onPress={handleManualSave} />,
    });
  }, [navigation, handleManualSave]);

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
      }, 2000); // 2 seconds
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

  // Effect for updating title and tracking when content loads
  useEffect(() => {
    if (selectedNote && selectedNote.id === id) {
      navigation.setOptions({ title: selectedNote.title });
      setIsLoading(false); // Content loaded
    }
  }, [selectedNote, navigation, id]);

  useEffect(() => {
    // Save immediately when navigating away
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);

        // Save the current content if we have a selected note
        if (selectedNote && selectedNote.content) {
          saveNote(selectedNote.content);
        }
      }
    };
  }, [saveNote, selectedNote]);

  return (
    <View style={styles.container}>
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
