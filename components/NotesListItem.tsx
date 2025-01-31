import React from "react";
import { Link } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";

type ItemProps = {
  title: string;
  lastEditTime: number;
};

const NotesListItem = ({ title, lastEditTime }: ItemProps) => {
  const formattedDate = new Date(lastEditTime).toLocaleString();
  return (
    <Link href={`/note/${title}`} asChild>
      <Pressable>
        <View style={styles.item}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.lastEditTime}>{formattedDate}</Text>
        </View>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  item: {
    backgroundColor: "white",
    padding: 20,
    gap: 6,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: 20,
  },
  lastEditTime: {
    fontSize: 12,
    color: "#888",
  },
});

export default NotesListItem;
