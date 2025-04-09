import { Stack, useRouter, usePathname } from "expo-router";
import { Pressable, Animated, View } from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useAtomValue, useSetAtom } from "jotai";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import AccountDropdown from "@/components/AccountDropdown";
import { showCreateNoteDialog } from "@/components/dialogs/CreateNoteDialog";
import { createEmptyNoteAtom } from "@/store/notesStore";
import { currentUserAtom } from "@/store/userStore";
import { primary } from "@/shared/colors";
import { syncService } from "@/services/sync-service";

// Configure Reanimated logger before the component
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // To disable the strict mode warnings for animations
});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAtomValue(currentUserAtom);
  const createEmptyNote = useSetAtom(createEmptyNoteAtom);

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Check if the current route is an auth route
  const isAuthRoute = pathname?.startsWith("/auth");

  // Redirect to log-in if not logged in and not already on an auth route
  useEffect(() => {
    if (!currentUser.isLoggedIn && !isAuthRoute) {
      router.replace("/auth/log-in");
    }
  }, [currentUser.isLoggedIn, isAuthRoute, router]);

  const handleSyncPress = async () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await syncService.triggerManualSync();
  };

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
        // Call the async function but don't wait for it
        createEmptyNote(title).then((returnedTitle) => {
          if (returnedTitle) {
            // Use the returned title once available
            router.push(`/note/${encodeURIComponent(returnedTitle)}`);
          } else {
            // Fallback to using the passed title
            router.push(`/note/${encodeURIComponent(title)}`);
          }
        });

        // Return the passed title immediately
        return title;
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
          headerShown: !isAuthRoute, // Hide header on auth routes
          title: "Your Notes",
          headerLeft: () => (
            <Pressable
              onPress={handleCreateNotePress}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                marginRight: 15,
              })}
            >
              <IconSymbol name="plus" size={24} color={primary} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={handleSyncPress}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  marginRight: 15,
                })}
              >
                {/* Using available icon as placeholder - we'd need to add refresh/sync to mapping */}
                <IconSymbol
                  name="arrow.trianglehead.2.clockwise.rotate.90.icloud"
                  size={30}
                  color={primary}
                />
              </Pressable>
              <Pressable
                onPress={handleAccountPress}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <IconSymbol name="person.circle" size={26} color={primary} />
              </Pressable>
            </View>
          ),
        }}
      />
    </>
  );
}
