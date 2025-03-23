import { Stack, useRouter, usePathname } from "expo-router";
import { Pressable, StyleSheet, Platform, Animated, Alert } from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useSetAtom } from "jotai";
import { createEmptyNoteAtom } from "@/store";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import AccountDropdown from "@/components/AccountDropdown";

// Configure Reanimated logger before the component
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // This will disable the strict mode warnings
});

// NOTE: Start app with `npx expo start --clear`

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const createEmptyNote = useSetAtom(createEmptyNoteAtom);
  // Modal state
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Close modal when navigating
  useEffect(() => {
    setShowAccountDropdown(false);
  }, [pathname]);

  // Move all handlers to root component
  const handleAccountPress = () => {
    setShowAccountDropdown(!showAccountDropdown);
    console.log("Account toggled, new state:", !showAccountDropdown);
  };

  const showCreateNoteDialog = () => {
    // Use platform-specific approach
    if (Platform.OS === "ios") {
      // iOS uses prompt for native single-input dialogs
      Alert.prompt(
        "Create New Note",
        "Enter a name for your new note:",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Create",
            onPress: (name) => {
              if (name && name.trim()) {
                const noteTitle = name.trim() ?? "New Note";
                const newNoteId = createEmptyNote(noteTitle);

                console.log("New note created:", newNoteId);

                router.push(`/note/${newNoteId}`);
                if (Platform.OS === "ios") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
              }
            },
          },
        ],
        "plain-text",
        "New Note"
      );
    } else {
      // Android doesn't support text input in Alert natively
      // We'll use a workaround with a custom implementation
      // let noteTitle = `Note ${new Date().toLocaleDateString()}`;

      Alert.alert("Create New Note", "Enter a name for your new note:", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Create",
          onPress: (name) => {
            if (name && name.trim()) {
              const noteTitle = name.trim();
              const newNoteId = createEmptyNote(noteTitle);

              router.push(`/note/${newNoteId}`);
              if (Platform.OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }
          },
        },
      ]);

      // NOTE: For Android, the above is limited as we can't include a TextInput inside Alert
      // A better approach would be using a modal component with TextInput
      // Consider implementing a custom modal dialog for Android
    }
  };

  return (
    <>
      <AccountDropdown
        showModal={showAccountDropdown}
        setShowModal={setShowAccountDropdown}
        fadeAnim={fadeAnim}
        scaleAnim={scaleAnim}
      />

      <Stack
        screenOptions={{
          title: "Your Notes",
          headerLeft: () => (
            <Pressable
              onPress={showCreateNoteDialog}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                marginRight: 15,
              })}
            >
              <IconSymbol name="plus" size={24} color="#0a7ea4" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleAccountPress}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                marginLeft: 15,
              })}
            >
              <IconSymbol name="person.circle" size={24} color="#0a7ea4" />
            </Pressable>
          ),
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Platform.OS === "ios" ? "#E0E0E0" : "#DDDDDD",
    width: "100%",
  },
});
