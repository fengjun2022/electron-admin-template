import type { StateTree } from 'pinia'

// Ensure TS recognizes the `persist` option on Pinia stores.
// Some Pinia + plugin version combos don't pick up the plugin's types reliably.
declare module 'pinia' {
  // Extend base options used by both option and setup stores.
  // Using `unknown` keeps it flexible and avoids tight coupling to plugin types.
  // If you prefer stricter typing, replace `unknown` with the plugin's Persist type.
  //   e.g., `import type { Persist } from 'pinia-plugin-persistedstate'`
  //         and then: `persist?: Persist<S>`
  interface DefineStoreOptionsBase<S extends StateTree, Store> {
    persist?: unknown
  }
}

