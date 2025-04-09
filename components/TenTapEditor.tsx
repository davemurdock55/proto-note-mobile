import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import {
  RichText,
  Toolbar,
  useEditorBridge,
  TenTapStartKit,
  CoreBridge,
} from "@10play/tentap-editor";

// Define your custom CSS
const customCSS = `
* {
  font-family: sans-serif;
}
`;

// Define the props interface with proper types
interface TenTapEditorProps {
  initialValue?: string;
  onChange?: (content: string) => void;
}

export const TenTapEditor: React.FC<TenTapEditorProps> = ({
  initialValue = "<p>Start writing here...</p>",
  onChange,
}) => {
  // Add inline fallback for extractContentFromHtml to handle potential import issues
  const processHtml = (html: string): string => {
    if (!html) return "<p>Start writing...</p>";

    try {
      // If extractContentFromHtml is available, use it
      // if (typeof extractContentFromHtml === "function") {
      //   return extractContentFromHtml(html);
      // }

      // Otherwise provide a minimal implementation
      if (!html.includes("<html>") && !html.includes("<!DOCTYPE")) {
        return html;
      }

      // Simple body content extraction
      const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
      if (bodyMatch && bodyMatch[1]) {
        return bodyMatch[1].trim();
      }

      return html;
    } catch (error) {
      console.warn("Error processing HTML:", error);
      return html || "<p>Start writing...</p>";
    }
  };

  // Ensure initialValue is never undefined and is just content, not a full document
  const safeInitialValue =
    initialValue && typeof initialValue === "string"
      ? !initialValue.includes("<html>")
        ? initialValue
        : processHtml(initialValue)
      : "<p>Start writing...</p>";

  const [content, setContent] = useState(safeInitialValue);

  useEffect(() => {
    if (initialValue && typeof initialValue === "string") {
      const processedValue = !initialValue.includes("<html>")
        ? initialValue
        : processHtml(initialValue);

      setContent(processedValue);
    }
  }, [initialValue]);

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: content,
    onChange: (html?: string) => {
      if (html) {
        setContent(html);
        if (onChange) onChange(html);
      }
    },
    bridgeExtensions: [...TenTapStartKit, CoreBridge.configureCSS(customCSS)],
  });

  return (
    <SafeAreaView style={styles.fullScreen}>
      <RichText editor={editor} style={styles.editor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
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
  },
  keyboardAvoidingView: {
    position: "absolute",
    width: "100%",
    bottom: 0,
  },
});
