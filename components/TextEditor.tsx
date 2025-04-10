import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  InputAccessoryView,
  Pressable,
  View,
  ScrollView,
  Keyboard,
  useColorScheme,
} from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { primary } from "@/shared/colors";
import { BlurView } from "expo-blur";

export interface TextEditorHandle {
  dismissKeyboard: () => void;
  focus: () => void;
  updateContent: (content: string) => void;
  getCurrentContent: () => string;
}

interface TextEditorProps {
  initialValue: string;
  onChange: (content: string) => void;
}

export const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  function TextEditor({ initialValue, onChange }, ref) {
    const colorScheme = useColorScheme() || "light";
    const [text, setText] = useState(initialValue || "");
    const inputRef = useRef<TextInput>(null);
    const inputAccessoryViewID = "textEditorInputAccessory";

    // Expose methods to parent component through ref
    useImperativeHandle(ref, () => ({
      dismissKeyboard: () => Keyboard.dismiss(),
      focus: () => inputRef.current?.focus(),
      updateContent: (content: string) => setText(content || ""),
      getCurrentContent: () => text,
    }));

    const isDark = colorScheme === "dark";

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          style={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.scrollContent}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, isDark && { color: "#FFFFFF" }]}
            multiline
            value={text}
            placeholder="Start writing..."
            placeholderTextColor={isDark ? "#999999" : "#777777"}
            textAlignVertical="top"
            blurOnSubmit={false}
            onChangeText={(newText) => {
              setText(newText);
              onChange(newText);
            }}
            inputAccessoryViewID={
              Platform.OS === "ios" ? inputAccessoryViewID : undefined
            }
          />
        </ScrollView>

        {Platform.OS === "ios" && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <BlurView
              intensity={25}
              tint={isDark ? "dark" : "light"}
              style={styles.blurContainer}
            >
              <View
                style={[
                  styles.inputAccessory,
                  isDark && { borderTopColor: "rgba(60, 60, 60, 0.5)" },
                ]}
              >
                <Pressable
                  onPress={() => Keyboard.dismiss()}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    padding: 8,
                    marginHorizontal: 8,
                  })}
                >
                  <IconSymbol
                    name="keyboard.chevron.compact.down"
                    size={30}
                    color={primary}
                  />
                </Pressable>
              </View>
            </BlurView>
          </InputAccessoryView>
        )}
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    minHeight: "100%",
    paddingBottom: 60,
  },
  textInput: {
    flex: 1,
    paddingTop: 25,
    paddingBottom: 60,
    paddingHorizontal: 20,
    fontSize: 18,
    minHeight: "100%",
  },
  blurContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  inputAccessory: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(205, 205, 205, 0.5)",
    padding: 4,
    backgroundColor: "transparent",
    height: 44,
  },
});
