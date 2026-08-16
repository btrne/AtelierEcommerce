export {};

declare global {
  interface Window {
    FB?: {
      init: (config: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (callback: (response: FbLoginResponse) => void, options?: { scope: string }) => void;
    };
  }

  interface FbLoginResponse {
    status?: string;
    authResponse?: {
      accessToken: string;
      userID: string;
      expiresIn?: number;
    };
    error?: { message: string };
  }
}
