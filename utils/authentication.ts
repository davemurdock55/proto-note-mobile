import * as SecureStore from "expo-secure-store";
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: "YOUR_USER_POOL_ID", // Your user pool id here
  ClientId: "YOUR_CLIENT_ID", // Your client id here
};

const userPool = new CognitoUserPool(poolData);

export async function signIn(username: string, password: string) {
  const authenticationDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  const userData = {
    Username: username,
    Pool: userPool,
  };

  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: async (result) => {
        const token = result.getIdToken().getJwtToken();
        await SecureStore.setItemAsync("userToken", token);
        resolve(result);
      },
      onFailure: (err) => {
        console.error("Error signing in", err);
        reject(err);
      },
    });
  });
}

export async function getToken() {
  return await SecureStore.getItemAsync("userToken");
}
