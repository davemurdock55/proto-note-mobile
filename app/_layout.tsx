import { Stack } from "expo-router";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import { createEmptyNoteAtom, selectedNoteAtom } from "@/store";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";

// NOTE: Start app with `npx expo start --clear`

export default function RootLayout() {
  const router = useRouter();
  const createEmptyNote = useSetAtom(createEmptyNoteAtom);
  const [showDropdown, setShowDropdown] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (showDropdown) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDropdown]);

  const handleAccountPress = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    // Implement your logout logic here
    console.log("Logging out...");
    setShowDropdown(false);
    // Example: router.replace("/login");
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
              createEmptyNote(name.trim());
              router.push(`/note/note-${name.trim()}`);
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
      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

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
            <View>
              <Pressable
                onPress={handleAccountPress}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  marginLeft: 15,
                })}
              >
                <IconSymbol name="person.circle" size={24} color="#0a7ea4" />
              </Pressable>

              {showDropdown && (
                <Animated.View
                  style={[
                    styles.dropdown,
                    Platform.OS === "ios"
                      ? styles.iosDropdown
                      : styles.androidDropdown,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      {
                        backgroundColor: pressed
                          ? Platform.OS === "ios"
                            ? "#F1F1F1"
                            : "#EEEEEE"
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        Platform.OS === "ios"
                          ? styles.iosText
                          : styles.androidText,
                        { color: "#FF3B30" },
                      ]}
                    >
                      Logout
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          ),
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  dropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 120,
    zIndex: 1000,
    borderRadius: 10,
    overflow: "hidden",
  },
  iosDropdown: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  androidDropdown: {
    backgroundColor: "white",
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
  },
  iosText: {
    fontWeight: "500",
  },
  androidText: {
    color: "#333",
  },
});
