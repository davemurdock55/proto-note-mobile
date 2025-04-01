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
  const { title: paramTitle } = useLocalSearchParams();
  const title = decodeURIComponent(String(paramTitle || ""));
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
        `Manually saving note ${title} with content length: ${editorContent.length}`
      );

      // Directly save to file system for immediate persistence
      // This bypasses the atom flow to ensure content is saved to disk right away
      fileSystemService.writeNote(title, editorContent).then((success) => {
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
  }, [editorContent, title, selectedNote?.title, saveNote]);

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
        fileSystemService.writeNote(title, content).then((success) => {
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
    [title, selectedNote?.title, saveNote]
  );

  // Update editor content when selected note changes
  useEffect(() => {
    if (selectedNote?.content && selectedNote.title === title) {
      // Only update editor content if it hasn't been initialized yet or if selected note title changed
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
  }, [selectedNote?.title, selectedNote?.content, title]);

  useEffect(() => {
    const loadNote = async () => {
      // REMOVE THIS CONDITION - it prevents initial loading
      // if (!isLoading) {
      setIsLoading(true);
      initialLoadRef.current = true;
      editorInitializedRef.current = false;
      console.log("Looking for note with title:", title);

      try {
        // Try direct file system read first
        const directContent = await fileSystemService.readNote(title);

        // Add more detailed logging
        console.log(`Read content result:`, {
          title,
          contentType: typeof directContent,
          length: directContent ? directContent.length : 0,
          preview: directContent ? directContent.substring(0, 20) : "",
        });

        // Check if content exists and is valid
        if (directContent && typeof directContent === "string") {
          setEditorContent(directContent);
          lastSavedContentRef.current = directContent;
          setIsLoading(false); // Exit loading state regardless of content
          editorInitializedRef.current = true;
          return;
        }

        // Always exit loading state with a fallback
        console.log("No content or invalid content, showing fallback");
        setEditorContent("Start writing...");
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading note content:", error);
        setIsLoading(false);
        setEditorContent("Start writing...");
      }
      // } REMOVE CLOSING BRACE
    };

    loadNote();
  }, [title]); // Simplify dependencies to reduce conflicts

  // Effect for updating title
  useEffect(() => {
    if (selectedNote && selectedNote.title === title) {
      navigation.setOptions({ title: selectedNote.title });
    }
  }, [selectedNote, navigation, title]);

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
          fileSystemService.writeNote(title, editorContent);
          lastSavedContentRef.current = editorContent;
          console.log("Navigation save complete");
        } catch (error) {
          console.error("Error saving on navigation:", error);
        }
      }
    };
  }, [editorContent, title, selectedNote?.title]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading note...</Text>
        </View>
      ) : (
        <TextEditor
          key={selectedNote?.title || title}
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
