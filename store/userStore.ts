import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { UserCredentials, defaultUserState } from "@/shared/auth-types";
import { protoNoteAPI } from "@/shared/constants";

// Constants for API endpoints
const AUTH_ENDPOINT = `${protoNoteAPI}/auth`;

// Load current user on app start
const loadCurrentUser = async (): Promise<UserCredentials> => {
  try {
    const userDataString = await SecureStore.getItemAsync("user");
    if (!userDataString) return defaultUserState;
    return JSON.parse(userDataString);
  } catch (error) {
    console.error("Failed to load user:", error);
    return defaultUserState;
  }
};

// Save user credentials to secure storage
const saveUserCredentials = async (
  credentials: UserCredentials
): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync("user", JSON.stringify(credentials));
    return true;
  } catch (error) {
    console.error("Error saving user credentials:", error);
    return false;
  }
};

// Clear user credentials from secure storage
const clearUserCredentials = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync("user");
    return true;
  } catch (error) {
    console.error("Error clearing user credentials:", error);
    return false;
  }
};

// Create auth atoms
const currentUserAtomAsync = atom<UserCredentials | Promise<UserCredentials>>(
  loadCurrentUser()
);
export const currentUserAtom = unwrap(
  currentUserAtomAsync,
  (prev) => prev || defaultUserState
);

// Login atom
export const loginAtom = atom(
  null,
  async (get, set, params: { username: string; password: string }) => {
    try {
      const { username, password } = params;

      // Make API request to login
      const response = await axios.post(`${AUTH_ENDPOINT}/login`, {
        username,
        password,
      });

      // Create user credentials from response
      const user: UserCredentials = {
        name: response.data.response?.name || "User",
        username,
        token: response.data.response?.token || "dummy-token",
        isLoggedIn: true,
      };

      // Save credentials to secure storage
      await saveUserCredentials(user);

      // Update the atom state
      set(currentUserAtom, user);

      return { success: true, message: "" };
    } catch (error) {
      // Extract error message from axios error
      let errorMessage = "Login failed";

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data && error.response.data.message) {
          try {
            // Try to parse the message if it's a JSON string
            const messageContent = error.response.data.message;
            if (
              typeof messageContent === "string" &&
              (messageContent.startsWith("[") || messageContent.startsWith("{"))
            ) {
              // Parse the JSON string
              const parsedErrors = JSON.parse(messageContent);

              if (Array.isArray(parsedErrors)) {
                // Join multiple validation errors into a single message
                errorMessage = parsedErrors
                  .map((err) => err.message)
                  .filter(Boolean)
                  .join("\n");
              } else if (parsedErrors.message) {
                errorMessage = parsedErrors.message;
              }
            } else {
              errorMessage = messageContent;
            }
          } catch (parseError) {
            // If parsing fails, use the original message
            errorMessage = error.response.data.message;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
        }
        console.error("Login error response:", error.response.data);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Login error:", errorMessage);
      return { success: false, message: errorMessage };
    }
  }
);

// Signup atom
export const signupAtom = atom(
  null,
  async (
    get,
    set,
    params: { name: string; username: string; password: string }
  ) => {
    try {
      const { name, username, password } = params;

      // Make API request to register
      const response = await axios.post(`${AUTH_ENDPOINT}/register`, {
        name,
        username,
        password,
      });

      if (response.status === 200) {
        // Now login with the newly created credentials
        return set(loginAtom, { username, password });
      }

      return {
        success: false,
        message: `Unexpected response: ${response.status}`,
      };
    } catch (error) {
      // Extract error message from axios error
      let errorMessage = "Signup failed";

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data && error.response.data.message) {
          try {
            // Try to parse the message if it's a JSON string
            const messageContent = error.response.data.message;
            if (
              typeof messageContent === "string" &&
              (messageContent.startsWith("[") || messageContent.startsWith("{"))
            ) {
              // Parse the JSON string
              const parsedErrors = JSON.parse(messageContent);

              if (Array.isArray(parsedErrors)) {
                // Join multiple validation errors into a single message
                errorMessage = parsedErrors
                  .map((err) => err.message)
                  .filter(Boolean)
                  .join("\n");
              } else if (parsedErrors.message) {
                errorMessage = parsedErrors.message;
              }
            } else {
              errorMessage = messageContent;
            }
          } catch (parseError) {
            // If parsing fails, use the original message
            errorMessage = error.response.data.message;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
        }
        console.error("Signup error response:", error.response.data);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Signup error:", errorMessage);
      return { success: false, message: errorMessage };
    }
  }
);

// Logout atom
export const logoutAtom = atom(null, async (get, set) => {
  try {
    const currentUser = get(currentUserAtom);

    // Only call the API if the user is logged in and has a token
    if (currentUser.isLoggedIn && currentUser.token) {
      try {
        // Make API call to logout
        await axios.post(
          `${AUTH_ENDPOINT}/logout`,
          {
            username: currentUser.username,
            token: currentUser.token,
          },
          {
            headers: {
              Authorization: `Bearer ${currentUser.token}`,
            },
          }
        );
      } catch (apiError) {
        // Log API error but continue to clear local credentials
        console.error("Logout API call failed:", apiError);
      }
    }

    // Clear credentials from secure storage
    await clearUserCredentials();

    // Reset the atom state
    set(currentUserAtom, defaultUserState);

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
});

// Verify token atom
export const verifyTokenAtom = atom(null, async (get, set) => {
  try {
    // Get the current user from secure storage to ensure we have fresh data
    const currentUser = await loadCurrentUser();

    // If no credentials, no need to verify
    if (!currentUser || !currentUser.isLoggedIn || !currentUser.token) {
      return { verified: false };
    }

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Verification timeout")), 5000); // 5 seconds timeout
    });

    // Make API request to verify token with timeout
    const verificationPromise = axios.post(`${AUTH_ENDPOINT}/verify`, {
      username: currentUser.username,
      token: currentUser.token,
    });

    // Race between actual verification and timeout
    const response = await Promise.race([verificationPromise, timeoutPromise]);

    if (response.data.verified) {
      // Update user info with response data
      const updatedUser: UserCredentials = {
        name: response.data.name || currentUser.name,
        username: response.data.username,
        token: response.data.token,
        isLoggedIn: true,
      };

      // Save to secure store and update state
      await saveUserCredentials(updatedUser);
      set(currentUserAtom, updatedUser);

      return { verified: true };
    } else {
      // Token is invalid, clear credentials
      await clearUserCredentials();
      set(currentUserAtom, defaultUserState);

      return { verified: false, message: response.data.message };
    }
  } catch (error) {
    console.error("Token verification error:", error);

    // Current user for potential offline case
    const currentUser = await loadCurrentUser();

    // Handle network errors (offline cases)
    if (axios.isAxiosError(error) && !error.response) {
      console.log("Network error - continuing with existing token");
      // Keep user logged in when offline
      set(currentUserAtom, currentUser);
      return { verified: true, offline: true };
    }

    // Don't log out on network errors - token might still be valid
    return { verified: false, message: "Couldn't verify token status" };
  }
});

// Export getCurrentUser for use outside of atoms
export const getCurrentUser = loadCurrentUser;
