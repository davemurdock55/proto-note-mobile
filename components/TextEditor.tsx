import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
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
  TouchableWithoutFeedback,
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

const TextEditorComponent = forwardRef<TextEditorHandle, TextEditorProps>(
  ({ initialValue, onChange }, ref) => {
    const colorScheme = useColorScheme() || "light";
    const [text, setText] = useState(initialValue || "");
    const isInitializedRef = useRef(false);
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const inputAccessoryViewID = "textEditorInputAccessory";
    const [isEditing, setIsEditing] = useState(false);
    const [contentHeight, setContentHeight] = useState(1000); // Start with a larger height
    const heightStableRef = useRef(false);
    const lastMeasuredHeight = useRef(0);

    // Update text when initialValue changes
    useEffect(() => {
      setText(initialValue || "");
    }, [initialValue]);

    // Expose methods to parent component through ref
    useImperativeHandle(ref, () => ({
      dismissKeyboard: () => {
        Keyboard.dismiss();
        setIsEditing(false);
      },
      focus: () => {
        setIsEditing(true);
        inputRef.current?.focus();
      },
      updateContent: (content: string) => {
        setText(content || "");
      },
      getCurrentContent: () => text,
    }));

    // Calculate initial height only once
    useLayoutEffect(() => {
      if (!isInitializedRef.current) {
        // Use a larger initial height estimate to avoid jitter
        const lines = (initialValue || "").split("\n").length;
        const approxHeight = Math.max(1000, lines * 24); // Increased minimum
        setContentHeight(approxHeight);
        isInitializedRef.current = true;
      }
    }, [initialValue]);

    // Process content size changes with debouncing
    const handleContentSizeChange = (e: any) => {
      const newHeight = e.nativeEvent.contentSize.height;

      // Don't update height for small changes (less than 100px) after initial stabilization
      if (
        heightStableRef.current &&
        Math.abs(newHeight - lastMeasuredHeight.current) < 100
      ) {
        return;
      }

      // Store the last measured height
      lastMeasuredHeight.current = newHeight;

      // Add a moderate buffer to avoid constant recalculations
      const bufferedHeight = newHeight + 80; // REDUCED from 200 to 80
      setContentHeight(bufferedHeight);

      // Mark as stable after first measurement
      if (!heightStableRef.current) {
        heightStableRef.current = true;
      }
    };

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.editorContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              minHeight: "100%",
              paddingBottom: 60, // REDUCED from 150 to 60
            }}
            onScrollBeginDrag={() => {
              if (isEditing) {
                Keyboard.dismiss();
                setIsEditing(false);
              }
            }}
          >
            <TouchableWithoutFeedback
              onPress={() => {
                if (!isEditing) {
                  setIsEditing(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }
              }}
            >
              <View
                style={[
                  styles.textInputWrapper,
                  { minHeight: Math.max(contentHeight, 1000) },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.textInput,
                    colorScheme === "dark" && { color: "#FFFFFF" },
                  ]}
                  multiline
                  value={text}
                  placeholder="Start writing..."
                  placeholderTextColor={
                    colorScheme === "dark" ? "#999999" : "#777777"
                  }
                  textAlignVertical="top"
                  returnKeyType="default"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically={true}
                  scrollEnabled={false}
                  pointerEvents={isEditing ? "auto" : "none"}
                  editable={isEditing}
                  onContentSizeChange={handleContentSizeChange}
                  onBlur={() => setIsEditing(false)}
                  inputAccessoryViewID={
                    Platform.OS === "ios" ? inputAccessoryViewID : undefined
                  }
                  onChangeText={(newText) => {
                    setText(newText);
                    onChange(newText);
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>

        {/* Input accessory view for iOS */}
        {Platform.OS === "ios" && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <BlurView
              intensity={25}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={styles.blurContainer}
            >
              <View
                style={[
                  styles.inputAccessory,
                  colorScheme === "dark" && {
                    borderTopColor: "rgba(60, 60, 60, 0.5)",
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsEditing(false);
                  }}
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

TextEditorComponent.displayName = "TextEditor";

export const TextEditor = TextEditorComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    position: "relative",
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  textInputWrapper: {
    flex: 1,
    minHeight: "100%",
  },
  textInput: {
    flex: 1,
    paddingTop: 25,
    paddingBottom: 60, // REDUCED from 150 to 60
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
