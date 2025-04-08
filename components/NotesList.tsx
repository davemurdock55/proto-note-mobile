import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotesListItem from "./NotesListItem";
import { useAtomValue, useSetAtom } from "jotai";
import {
  notesAtom,
  selectedNoteIndexAtom,
  syncNotesAtom,
} from "@/store/notesStore";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";

const NotesList = () => {
  const notes = useAtomValue(notesAtom);
  const setSelectedIndex = useSetAtom(selectedNoteIndexAtom);
  const syncNotes = useSetAtom(syncNotesAtom);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleNotePress = async (index: number, title: string) => {
    // First update the selected index
    await setSelectedIndex(index);
    // Then navigate programmatically
    router.push(`/note/${encodeURIComponent(title)}`);
  };

  // New function to handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncNotes();
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
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
            title={item.title}
            lastEditTime={item.lastEditTime}
            onPress={() => handleNotePress(index, item.title)}
            index={index}
          />
        )}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#00b8db"]}
            tintColor="#00b8db"
          />
        }
      />
      {/* <Pressable onPressIn={handleResetPress} style={styles.resetButton}>
        <Text style={styles.resetButtonText}>Reset All Data</Text>
      </Pressable> */}
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
