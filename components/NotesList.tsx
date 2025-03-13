import { Link } from "expo-router";
import React from "react";
import { View, FlatList, StyleSheet, Text, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotesListItem from "./NotesListItem";
import { useAtom } from "jotai";
import { notesAtom, selectedNoteIndexAtom } from "@/store";

const NotesList = () => {
  const [notes] = useAtom(notesAtom);
  const [_, setSelectedIndex] = useAtom(selectedNoteIndexAtom);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={notes}
        renderItem={({ item, index }) => <NotesListItem title={item.title} lastEditTime={item.lastEditTime} onPress={() => setSelectedIndex(index)} />}
        keyExtractor={(item) => item.title}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0 + 8,
  },
});

export default NotesList;
