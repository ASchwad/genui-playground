/*
  Global environment variable typings.
  This keeps TypeScript happy when accessing process.env in client and server code.
*/

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SITE_URL?: string;
      NEXT_PUBLIC_TWITTER_HANDLE?: string;
      NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL?: string;
      NEXT_PUBLIC_COPILOT_API_KEY?: string;
      NEXT_PUBLIC_COPILOTKIT_AGENT_NAME?: string;
    }
  }
}