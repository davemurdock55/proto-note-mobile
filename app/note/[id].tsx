import { TenTapEditor } from "@/components/TenTapEditor";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useCallback, useState } from "react";
import { StyleSheet, View, Text, Pressable, TextInput } from "react-native";
import { useAtomValue, useSetAtom } from "jotai";
import {
  notesAtom,
  selectedNoteIndexAtom,
  saveNoteAtom,
  selectedNoteAtom,
} from "@/store/notesStore";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { fileSystemService } from "@/services/file-system-service";
import { TextEditor } from "@/components/TextEditor";

// Define these outside of the NotePage component with proper types
const BackButton = ({ onPress }: { onPress: () => void }) => (
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

const SaveButton = ({ onPress }: { onPress: () => void }) => (
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

  // Track the current editor content separately from selectedNote
  const [editorContent, setEditorContent] = useState("");

  // Reference to track if editor has been initialized with content
  const editorInitializedRef = useRef(false);

  // Flag to prevent initial content updates from triggering saves
  const initialLoadRef = useRef(true);

  // Ref to store the timeout ID
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep a ref of the last content that was saved to prevent unnecessary saves
  const lastSavedContentRef = useRef("");

  const handleManualSave = useCallback(() => {
    if (editorContent && editorContent !== lastSavedContentRef.current) {
      // Clear any pending autosave
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      console.log(
        `Manually saving note ${id} with content length: ${editorContent.length}`
      );

      // Directly save to file system for immediate persistence
      // This bypasses the atom flow to ensure content is saved to disk right away
      fileSystemService
        .writeNote(
          String(id),
          selectedNote?.title || "Untitled Note",
          editorContent
        )
        .then((success) => {
          if (success) {
            console.log(`Manual save to file system successful`);
            // Only update our reference after confirmed save
            lastSavedContentRef.current = editorContent;

            // Also trigger the atom-based save to update UI state
            saveNote(editorContent);
          } else {
            console.error("Manual save to file system failed");
          }
        });
    }
  }, [editorContent, id, selectedNote?.title, saveNote]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
      headerRight: () => <SaveButton onPress={handleManualSave} />,
    });
  }, [navigation, handleManualSave]);

  // Debounced save function
  const debouncedSave = useCallback(
    (content: string) => {
      // Skip initial load to prevent immediate triggering
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      // Skip if content is the same as the last saved content
      if (content === lastSavedContentRef.current) return;

      // Clear any existing timeout
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      console.log(`Setting up autosave for content length: ${content.length}`);

      // Set a new timeout for 2 seconds
      saveTimerRef.current = setTimeout(() => {
        console.log(
          `Autosave triggered with content length: ${content.length}`
        );

        // Directly save to file system first
        fileSystemService
          .writeNote(
            String(id),
            selectedNote?.title || "Untitled Note",
            content
          )
          .then((success) => {
            if (success) {
              console.log(`Autosave to file system successful`);
              // Update reference after confirmed save
              lastSavedContentRef.current = content;

              // Then update state through the atom
              saveNote(content);
            } else {
              console.error("Autosave to file system failed");
            }
          });
      }, 2000);
    },
    [id, selectedNote?.title, saveNote]
  );

  // Update editor content when selected note changes
  useEffect(() => {
    if (selectedNote?.content && selectedNote.id === id) {
      // Only update editor content if it hasn't been initialized yet or if selected note ID changed
      if (
        !editorInitializedRef.current ||
        selectedNote.content !== editorContent
      ) {
        setEditorContent(selectedNote.content);
        // Also update the last saved content reference
        lastSavedContentRef.current = selectedNote.content;
        editorInitializedRef.current = true;
      }
      setIsLoading(false);
    }
  }, [selectedNote?.id, selectedNote?.content, id]);

  useEffect(() => {
    const loadNote = async () => {
      // Only start loading if we're not already loading
      if (!isLoading) {
        setIsLoading(true);
        initialLoadRef.current = true;
        editorInitializedRef.current = false;
        console.log("Looking for note with ID:", id);

        try {
          // Try direct file system read first
          const directContent = await fileSystemService.readNote(String(id));

          // Check if content exists and is valid
          if (
            directContent &&
            typeof directContent === "string" &&
            !directContent.includes("Note content not found")
          ) {
            console.log(
              `Direct file read result: ${directContent.substring(0, 50)}...`
            );
            setEditorContent(directContent || "<p>Start writing...</p>");
            lastSavedContentRef.current =
              directContent || "<p>Start writing...</p>";
            setIsLoading(false);
            editorInitializedRef.current = true;
            return;
          }

          // Fall back to notes list
          if (id && notes) {
            const noteIndex = notes.findIndex((note) => note.id === id);
            if (noteIndex !== -1) {
              setSelectedIndex(noteIndex);

              // Don't schedule additional timeouts - wait for the note content to load
              // through the other useEffect that watches selectedNote
            } else {
              // Note not found in list
              setEditorContent("<p>Start writing...</p>");
              lastSavedContentRef.current = "<p>Start writing...</p>";
              setIsLoading(false);
              editorInitializedRef.current = true;
            }
          } else {
            // Default content if no notes/id
            setEditorContent("<p>Start writing...</p>");
            lastSavedContentRef.current = "<p>Start writing...</p>";
            setIsLoading(false);
            editorInitializedRef.current = true;
          }
        } catch (error) {
          console.error("Error loading note content:", error);
          setEditorContent("<p>Start writing...</p>");
          lastSavedContentRef.current = "<p>Start writing...</p>";
          setIsLoading(false);
          editorInitializedRef.current = true;
        }
      }
    };

    loadNote();

    // Remove isLoading from dependencies to prevent the infinite loop
  }, [id, notes, setSelectedIndex]);

  // Effect for updating title
  useEffect(() => {
    if (selectedNote && selectedNote.id === id) {
      navigation.setOptions({ title: selectedNote.title });
    }
  }, [selectedNote, navigation, id]);

  useEffect(() => {
    // Save immediately when navigating away
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      // Save the current editor content if it differs from stored content
      if (editorContent && editorContent !== lastSavedContentRef.current) {
        console.log(
          `Saving on navigation away: ${editorContent.length} characters`
        );

        // Synchronous save attempt since we're navigating away
        // We need to make sure this completes before we leave the screen
        try {
          fileSystemService.writeNote(
            String(id),
            selectedNote?.title || "Untitled Note",
            editorContent
          );
          lastSavedContentRef.current = editorContent;
          console.log("Navigation save complete");
        } catch (error) {
          console.error("Error saving on navigation:", error);
        }
      }
    };
  }, [editorContent, id, selectedNote?.title]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading note...</Text>
        </View>
      ) : (
        <TextEditor
          key={selectedNote?.id || String(id)}
          initialValue={editorContent}
          onChange={(newContent) => {
            if (newContent !== editorContent) {
              setEditorContent(newContent);
              debouncedSave(newContent);
            }
          }}
        />
      )}
    </View>
  );
}

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
