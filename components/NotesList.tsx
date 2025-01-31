import { Link } from "expo-router";
import React from "react";
import { View, FlatList, StyleSheet, Text, StatusBar, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotesListItem from "./NotesListItem";
import { notesMock } from "@/store/mocks/notesMock";

const NotesList = () => (
  <SafeAreaView style={styles.container}>
    <FlatList data={notesMock} renderItem={({ item }) => <NotesListItem title={item.title} lastEditTime={item.lastEditTime} />} keyExtractor={(item) => item.title + item.lastEditTime} />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0 + 8,
  },
});

export default NotesList;
