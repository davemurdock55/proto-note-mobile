import { useState, useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { primary } from "@/shared/colors";
import { loginAtom } from "@/store/userStore";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { verifyTokenAtom } from "@/store/userStore";

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}

export default function LoginPage({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const verifyToken = useSetAtom(verifyTokenAtom);
  const login = useSetAtom(loginAtom);

  // Add this effect at the top of the component
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        // Try to verify any existing token
        const result = await verifyToken();

        if (result.verified) {
          // If token is valid, go straight to the main screen
          router.replace("/");
        } else {
          // Show login form if verification failed
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoading(false);
      }
    };

    checkExistingAuth();
  }, []);

  // Monitor keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Keyboard.dismiss();
    setError("");
    setIsLoading(true);

    try {
      const result = await login({ username: email, password });

      if (result.success) {
        // Navigate to home screen
        router.replace("/");
      } else {
        setError(result.message || "Invalid username or password");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Login failed: ${err.message}`);
      } else {
        setError("Login failed. Please try again.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dismissing keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Add this before your main return to show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View
            style={[
              styles.card,
              { justifyContent: "center", alignItems: "center", padding: 30 },
            ]}
          >
            <ActivityIndicator size="large" color={primary} />
            <Text style={{ marginTop: 16, color: "#666" }}>
              Checking authentication...
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text style={styles.title}>Log in to Proto-Note</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  {error.split("\n").map((line, index) => (
                    <Text key={index} style={styles.errorText}>
                      • {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    // This will focus the password input when "next" is pressed
                  }}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <IconSymbol
                      name={showPassword ? "eye.slash" : "eye"}
                      size={24}
                      color="#777"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/auth/sign-up")}>
                  <Text style={styles.switchLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: StatusBar.currentHeight || 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "flex-start",
    paddingTop: 30,
    marginTop: "30%",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: primary, // Cyan color to match your desktop app
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: primary, // Cyan color to match your desktop app
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#BDBDBD",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  switchText: {
    color: "#757575",
    fontSize: 14,
  },
  switchLink: {
    color: primary, // Cyan color to match your desktop app
    fontSize: 14,
    fontWeight: "500",
  },
});
