import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

interface TextEditorProps {
  initialValue: string;
  onChange: (content: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  initialValue,
  onChange,
}) => {
  const [text, setText] = useState(initialValue);

  // Initialize text when the initialValue changes
  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        multiline
        value={text}
        placeholder="Start writing..."
        onChangeText={(newText) => {
          setText(newText);
          onChange(newText);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    paddingVertical: 25,
    paddingHorizontal: 20,
    textAlignVertical: "top",
    fontSize: 18,
    backgroundColor: "white",
  },
});
