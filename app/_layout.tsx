import { Stack, useRouter, usePathname } from "expo-router";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  Modal,
} from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useSetAtom } from "jotai";
import { createEmptyNoteAtom } from "@/store";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";

// Configure Reanimated logger before the component
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // This will disable the strict mode warnings
});

// NOTE: Start app with `npx expo start --clear`

// Import useState and useEffect at the top with your other imports

// ProfileDropdown component
// Create a new component for the header right that maintains its own state

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const createEmptyNote = useSetAtom(createEmptyNoteAtom);
  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Close modal when navigating
  useEffect(() => {
    setShowModal(false);
  }, [pathname]);

  // Same animation effect
  useEffect(() => {
    if (showModal) {
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
  }, [showModal]);

  // Move all handlers to root component
  const handleAccountPress = () => {
    setShowModal(!showModal);
    console.log("Account toggled, new state:", !showModal);
  };

  const handleResetPress = () => {
    Alert.alert(
      "Confirm Reset",
      "Are you sure you want to delete ALL notes? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete All", style: "destructive", onPress: clearAllData },
      ]
    );
    setShowModal(false);
  };

  const handleLogout = () => {
    console.log("Logging out...");
    setShowModal(false);
  };

  // Clear data implementation
  const clearAllData = async () => {
    try {
      const NOTES_DIRECTORY = `${FileSystem.documentDirectory}notes/`;
      await FileSystem.deleteAsync(NOTES_DIRECTORY, { idempotent: true });
      await FileSystem.makeDirectoryAsync(NOTES_DIRECTORY, {
        intermediates: true,
      });
      Alert.alert(
        "Success",
        "All data cleared successfully. Restart the app to see changes."
      );
    } catch (error) {
      console.error("Failed to clear data:", error);
      Alert.alert("Error", "Failed to clear data. See console for details.");
    }
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
      {/* Only one Modal, no duplicated components */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="none" // Handle animation manually
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.dropdown,
                  Platform.OS === "ios"
                    ? styles.iosDropdown
                    : styles.androidDropdown,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    top: 65, // Fixed position from top
                    right: 20, // Fixed position from right
                  },
                ]}
              >
                <Pressable
                  onPress={handleResetPress}
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
                    Reset All Data
                  </Text>
                </Pressable>

                <View style={styles.divider} />

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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  dropdown: {
    position: "absolute",
    minWidth: 120,
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
    shadowOpacity: 0.25,
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
  divider: {
    height: 1,
    backgroundColor: Platform.OS === "ios" ? "#E0E0E0" : "#DDDDDD",
    width: "100%",
  },
});
