import { TenTapEditor } from "@/components/TenTapEditor";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { SetStateAction, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useAtom } from "jotai";
import { notesAtom, selectedNoteIndexAtom, saveNoteAtom, selectedNoteAtom } from "@/store";

export default function NotePage() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const [notes] = useAtom(notesAtom);
  const [selectedNote] = useAtom(selectedNoteAtom);
  const [_, setSelectedIndex] = useAtom(selectedNoteIndexAtom);
  const [__, saveNote] = useAtom(saveNoteAtom);

  useEffect(() => {
    if (id) {
      navigation.setOptions({ title: `${id}` });
      // Find the note index by title
      const noteIndex = notes?.findIndex((note) => note.title === id);
      if (noteIndex !== undefined && noteIndex !== -1) {
        setSelectedIndex(noteIndex);
      }
    }
  }, [id, notes]);

  return (
    <View style={styles.container}>
      <TenTapEditor initialValue={selectedNote?.content || `<p>Loading note: ${id}...</p>`} onChange={(content) => saveNote(content)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    fontFamily: "sans-serif",
  },
});
