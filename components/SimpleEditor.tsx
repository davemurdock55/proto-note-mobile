import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

interface SimpleEditorProps {
  initialValue: string;
  onChange: (content: string) => void;
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({
  initialValue,
  onChange,
}) => {
  // Strip HTML tags for display in TextInput
  const plainText = initialValue.replace(/<[^>]*>/g, "");
  const [text, setText] = useState(plainText);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        multiline
        value={text}
        onChangeText={(newText) => {
          setText(newText);
          // Wrap in paragraph tags to maintain HTML structure
          onChange(`<p>${newText}</p>`);
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
    padding: 10,
    textAlignVertical: "top",
    fontSize: 16,
    backgroundColor: "white",
  },
});
