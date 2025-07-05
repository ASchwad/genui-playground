/*
  Global environment variable typings.
  This keeps TypeScript happy when accessing process.env in client and server code.
*/

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ImportMetaEnv {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_TWITTER_HANDLE?: string;
}

// eslint-disable-next-line no-var
declare var process: {
  env: ImportMetaEnv;
};

// Fallback definition for JSX to avoid linter errors when React types are not present
declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface IntrinsicElements {
    // Allow any element name
    [elemName: string]: any;
  }
}