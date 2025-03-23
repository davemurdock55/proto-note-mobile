import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";

interface AccountDropdownProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

const AccountDropdown = ({
  showModal,
  setShowModal,
  fadeAnim,
  scaleAnim,
}: AccountDropdownProps) => {
  const handleLogout = () => {
    console.log("Logging out...");
    setShowModal(false);
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

  return (
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
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  top: 92, // Move down below the header
                  right: 20, // Keep right alignment
                },
              ]}
            >
              <BlurView
                intensity={80}
                tint={Platform.OS === "ios" ? "light" : "default"}
                style={StyleSheet.absoluteFill}
              />
              <Pressable
                onPress={handleResetPress}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  {
                    backgroundColor: pressed
                      ? Platform.OS === "ios"
                        ? "rgba(241, 241, 241, 0.5)"
                        : "rgba(238, 238, 238, 0.5)"
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    Platform.OS === "ios" ? styles.iosText : styles.androidText,
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
                    Platform.OS === "ios" ? styles.iosText : styles.androidText,
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
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  dropdown: {
    position: "absolute",
    minWidth: 120,
    borderRadius: 10,
    overflow: "hidden",
    borderColor: "rgba(227, 227, 227, 0.5)",
    borderWidth: 1,
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

export default AccountDropdown;
