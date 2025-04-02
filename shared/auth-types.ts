export interface UserCredentials {
  name: string;
  username: string;
  token: string;
  isLoggedIn: boolean;
  errorMessage?: string;
}

export const defaultUserState: UserCredentials = {
  name: "",
  username: "",
  token: "",
  isLoggedIn: false,
};
