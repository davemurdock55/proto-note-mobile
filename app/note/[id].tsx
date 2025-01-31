import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";

export default function NotePage() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();

  useEffect(() => {
    if (id) {
      navigation.setOptions({ title: `${id}` });
    }
  }, [id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Note ID: {id}</Text>
      {/* Add more content here to display the note details */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
  },
});
