import { Stack } from "expo-router";

// Start app with `npx expo start --clear`

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        title: "Your Notes",
      }}
    />
  );
}
