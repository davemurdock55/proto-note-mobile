import { Stack, useRouter, usePathname } from "expo-router";
import { Pressable, StyleSheet, Platform, Animated, Alert } from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useSetAtom } from "jotai";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import AccountDropdown from "@/components/AccountDropdown";
import { showCreateNoteDialog } from "@/components/dialogs/CreateNoteDialog";
import { createEmptyNoteAtom } from "@/store";

// Configure Reanimated logger before the component
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // To disable the strict mode warnings for animations
});

// NOTE: Start app with `npx expo start --clear`

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const createEmptyNote = useSetAtom(createEmptyNoteAtom);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Close modal when navigating
  useEffect(() => {
    setShowAccountDropdown(false);
  }, [pathname]);

  const handleAccountPress = () => {
    setShowAccountDropdown(!showAccountDropdown);
  };

  const handleCreateNotePress = () => {
    showCreateNoteDialog({
      createNote: (title: string) => {
        // Generate a temporary ID synchronously
        const tempId = `note-${Date.now()}`;

        // Call the async function but don't wait for it
        createEmptyNote(title).then((actualId) => {
          if (actualId) {
            // Use the actual ID once available
            router.push(`/note/${actualId}`);
          } else {
            // Fallback to using the temp ID
            router.push(`/note/${tempId}`);
          }
        });

        // Return the temp ID immediately
        return tempId;
      },
    });
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
              onPress={handleCreateNotePress}
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
