import React, { useState } from "react";
import { SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { RichText, Toolbar, useEditorBridge, TenTapStartKit, CoreBridge } from "@10play/tentap-editor";

// Define your custom CSS
const customCSS = `
* {
  font-family: sans-serif;
}
`;

export const TenTapEditor = ({ initialValue = "<p>Start typing here...</p>", onChange }) => {
  const [content, setContent] = useState(initialValue);

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: content,
    onChange: (html) => {
      setContent(html);
      if (onChange) onChange(html);
    },
    bridgeExtensions: [
      // It is important to spread StarterKit BEFORE our extended plugin
      ...TenTapStartKit,
      CoreBridge.configureCSS(customCSS), // Custom font for all text
    ],
  });

  return (
    <SafeAreaView style={styles.fullScreen}>
      <RichText editor={editor} style={styles.editor} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: "100%",
  },
  editor: {
    flex: 1,
    padding: 10,
    // Remove fontFamily from here as it won't affect the webview content
  },
  keyboardAvoidingView: {
    position: "absolute",
    width: "100%",
    bottom: 0,
  },
});
