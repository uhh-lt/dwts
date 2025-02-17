import { useMutation, useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/openapi/core/ApiError.ts";
import { OpenAPI } from "../api/openapi/core/OpenAPI.ts";
import { UserAuthorizationHeaderData } from "../api/openapi/models/UserAuthorizationHeaderData.ts";
import { UserRead } from "../api/openapi/models/UserRead.ts";
import { AuthenticationService } from "../api/openapi/services/AuthenticationService.ts";
import { UserService } from "../api/openapi/services/UserService.ts";
import { QueryKey } from "../api/QueryKey.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { LoginStatus } from "./LoginStatus.ts";

// init once
OpenAPI.BASE = import.meta.env.VITE_APP_SERVER || "";
OpenAPI.TOKEN = localStorage.getItem("dats-access") || undefined;

interface AuthContextType {
  user: UserRead | undefined;
  updateAuthData: (authData: UserAuthorizationHeaderData) => void;
  logout: () => void;
  loginStatus: LoginStatus;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthContextProps {
  children?: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthContextProps) => {
  // state
  const [accessToken, setAccessToken] = useState<string | undefined>(localStorage.getItem("dats-access") || undefined);
  const [accessTokenExpires, setAccessTokenExpires] = useState<Date | undefined>(() => {
    const expiryString = localStorage.getItem("dats-access-expires");
    return expiryString ? new Date(expiryString) : undefined;
  });
  const [refreshToken, setRefreshToken] = useState<string | undefined>(
    localStorage.getItem("dats-refresh-access") || undefined,
  );

  // fetch user data
  const internalUser = useQuery<UserRead, Error>({
    queryKey: [QueryKey.ME, accessToken],
    queryFn: UserService.getMe,
    retry: false,
  });
  const user = internalUser.data;

  // methods
  const updateAuthData = useCallback((authData: UserAuthorizationHeaderData) => {
    localStorage.setItem("dats-access", authData.access_token);
    OpenAPI.TOKEN = authData.access_token;
    setAccessToken(authData.access_token);

    localStorage.setItem("dats-access-expires", authData.access_token_expires);
    setAccessTokenExpires(new Date(authData.access_token_expires));

    localStorage.setItem("dats-refresh-access", authData.refresh_token);
    setRefreshToken(authData.refresh_token);
  }, []);

  const { mutate: logoutMutation } = useMutation({
    mutationFn: AuthenticationService.logout,
    retry: false,
    onSettled(_data, error) {
      if (error && !(error instanceof ApiError && error.status === 403)) {
        // There's a bug, logout didn't work
        console.error("Error while logging out:", error);
        return;
      }
      OpenAPI.TOKEN = undefined;
      localStorage.removeItem("dats-access");
      localStorage.removeItem("dats-access-expires");
      localStorage.removeItem("dats-refresh-access");
      setAccessToken(undefined);
      setRefreshToken(undefined);
      setAccessTokenExpires(undefined);
      queryClient.clear();
    },
  });
  const logout = useCallback(() => {
    if (refreshToken === undefined) {
      console.error("No refresh token to log out with");
      return;
    }
    logoutMutation({ refreshToken });
  }, [refreshToken, logoutMutation]);

  const { mutate: refreshAccessTokenMutation } = useMutation({
    mutationFn: AuthenticationService.refreshAccessToken,
    retry: false,
    onSuccess(data) {
      updateAuthData(data);
    },
    onError(error, variables) {
      if (error instanceof ApiError && error.status === 403) {
        // Refresh token expired, it's time to log out
        logoutMutation({ refreshToken: variables.refreshToken });
      }
    },
  });

  // refresh the access token when it's about to expire using the refresh token
  useEffect(() => {
    if (accessTokenExpires === undefined || refreshToken === undefined) {
      return;
    }

    // Refresh 60 seconds before the access token expires
    const refreshBefore = 60 * 1000;
    const msToWait = Math.max(accessTokenExpires.getTime() - Date.now() - refreshBefore, 0);
    const handle = setTimeout(() => {
      refreshAccessTokenMutation({ refreshToken });
    }, msToWait);

    return () => clearTimeout(handle);
  }, [accessTokenExpires, refreshToken, refreshAccessTokenMutation]);

  let status;
  const definitelyLoggedIn = user !== undefined;
  const verifyingAccessToken = (internalUser.isLoading || internalUser.isFetching) && accessToken !== undefined;
  if (definitelyLoggedIn) {
    status = LoginStatus.LOGGED_IN;
  } else if (verifyingAccessToken) {
    status = LoginStatus.LOADING;
  } else {
    status = LoginStatus.LOGGED_OUT;
  }

  return (
    <AuthContext.Provider
      value={{
        updateAuthData,
        logout,
        user,
        loginStatus: status,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
