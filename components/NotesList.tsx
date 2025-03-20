import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  StatusBar,
  Button,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotesListItem from "./NotesListItem";
import { useAtomValue, useSetAtom } from "jotai";
import { notesAtom, selectedNoteIndexAtom } from "@/store";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";

const NotesList = () => {
  const notes = useAtomValue(notesAtom);
  const setSelectedIndex = useSetAtom(selectedNoteIndexAtom);
  const router = useRouter();

  const handleNotePress = async (index: number, id: string) => {
    // First update the selected index
    await setSelectedIndex(index);
    // Then navigate programmatically
    router.push(`/note/${id}`);
  };

  const clearAllData = async () => {
    try {
      const NOTES_DIRECTORY = `${FileSystem.documentDirectory}notes/`;
      await FileSystem.deleteAsync(NOTES_DIRECTORY, { idempotent: true });
      await FileSystem.makeDirectoryAsync(NOTES_DIRECTORY, {
        intermediates: true,
      });
      Alert.alert(
        "Success",
        "All data cleared successfully. Restart the app to see changes."
      );
    } catch (error) {
      console.error("Failed to clear data:", error);
      Alert.alert("Error", "Failed to clear data. See console for details.");
    }
  };

  const handleResetPress = () => {
    Alert.alert(
      "Confirm Reset",
      "Are you sure you want to delete ALL notes? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete All", style: "destructive", onPress: clearAllData },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={notes}
        renderItem={({ item, index }) => (
          <NotesListItem
            id={item.id}
            title={item.title}
            lastEditTime={item.lastEditTime}
            onPress={() => handleNotePress(index, item.id)}
            index={index}
          />
        )}
        keyExtractor={(item) => item.id}
      />
      <Pressable onPressIn={handleResetPress} style={styles.resetButton}>
        <Text style={styles.resetButtonText}>Reset All Data</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0 + 8,
  },
  resetButton: {
    backgroundColor: "#ff3b30",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default NotesList;
