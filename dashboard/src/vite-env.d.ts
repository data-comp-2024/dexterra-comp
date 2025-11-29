/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_ROOT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

