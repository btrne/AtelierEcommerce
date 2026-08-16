export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (el: HTMLElement, options: { theme: string; size: string; width?: string }) => void;
          prompt: () => void;
        };
      };
    };
  }
}
