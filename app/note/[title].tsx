import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useCallback, useState } from "react";
import { StyleSheet, View, Text, Pressable, Platform } from "react-native";
import { useAtomValue, useSetAtom } from "jotai";
import { saveNoteAtom, selectedNoteAtom } from "@/store/notesStore";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { fileSystemService } from "@/services/file-system-service";
import { TextEditor, TextEditorHandle } from "@/components/TextEditor";
import * as Haptics from "expo-haptics";
import { primary } from "@/shared/colors";

// Define these outside of the NotePage component with proper types
const BackButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={() => {
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }}
    style={({ pressed }) => ({
      opacity: pressed ? 0.2 : 1,
      marginRight: 15,
    })}
  >
    <IconSymbol name="chevron.left" size={24} color={primary} />
  </Pressable>
);

const SaveButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={() => {
      // Trigger haptic feedback before executing the save function
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onPress();
    }}
    style={({ pressed }) => ({
      opacity: pressed ? 0.2 : 1,
      marginLeft: 15,
    })}
  >
    <Text style={{ color: primary, fontWeight: "500", fontSize: 18 }}>
      Save
    </Text>
  </Pressable>
);

export default function NotePage() {
  const { title: paramTitle } = useLocalSearchParams();
  const title = decodeURIComponent(String(paramTitle || ""));
  const navigation = useNavigation();
  const selectedNote = useAtomValue(selectedNoteAtom);
  const saveNote = useSetAtom(saveNoteAtom);
  const editorRef = useRef<TextEditorHandle>(null);

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
    // ONLY get content directly from the editor component
    const currentContent = editorRef.current?.getCurrentContent();

    // Add protection against the ref or content missing
    if (!currentContent) {
      console.log("No content to save or editor reference missing");
      return;
    }

    // Now safe to dismiss keyboard
    editorRef.current?.dismissKeyboard();

    // Always update the local state with the freshest content
    setEditorContent(currentContent);

    if (currentContent !== lastSavedContentRef.current) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      console.log(
        `Manually saving note ${title} with content length: ${currentContent.length}`
      );

      fileSystemService
        .writeNote(title, currentContent, Date.now())
        .then((success) => {
          if (success) {
            console.log(`Manual save to file system successful`);
            lastSavedContentRef.current = currentContent;
            saveNote(currentContent);

            // Add this line to update the editor's internal state
            editorRef.current?.updateContent(currentContent);
          } else {
            console.error("Manual save to file system failed");
          }
        });
    }
  }, [title, saveNote]);

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

      // Set a new timeout for 5 seconds
      saveTimerRef.current = setTimeout(() => {
        console.log(
          `Autosave triggered with content length: ${content.length}`
        );

        // Directly save to file system first
        fileSystemService
          .writeNote(title, content, Date.now())
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
      }, 5000);
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
        setEditorContent("");
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading note content:", error);
        setIsLoading(false);
        setEditorContent("");
      }
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
          fileSystemService.writeNote(title, editorContent, Date.now());
          lastSavedContentRef.current = editorContent;
          console.log("Navigation save complete");
        } catch (error) {
          console.error("Error saving on navigation:", error);
        }
      }
    };
  }, [title, selectedNote?.title]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading note...</Text>
        </View>
      ) : (
        <TextEditor
          ref={editorRef}
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
