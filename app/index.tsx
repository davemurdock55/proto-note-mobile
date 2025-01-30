import NotesList from "@/components/NotesList";
import { Text, View, StyleSheet, StatusBar, Pressable, Button } from "react-native";

export default function Index() {
  return (
    <View>
      <Text>Hi there! :)</Text>
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Pressable style={styles.pressable} onPress={() => console.log("pressed")}>
        <Text>Test Button</Text>
      </Pressable>
      <Button title="another test button" />
      <NotesList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
  },
  item: {
    backgroundColor: "#f9c2ff",
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
  },
  pressable: {
    padding: 20,
    backgroundColor: "#ffff00",
  },
});
