export type AppTheme = "forest" | "ocean" | "royal" | "sunset" | "charcoal" | "teal" | "indigo" | "rose" | "gold" | "berry";
export const themeStorageKey = "printmanager:colour-theme";
export const themes: Array<{ id: AppTheme; name: string; description: string; colors: [string,string,string] }> = [
  { id: "forest", name: "Forest", description: "PrintManager green", colors: ["#102e2b","#194f46","#d8f36d"] },
  { id: "ocean", name: "Ocean", description: "Calm professional blue", colors: ["#102d46","#185b82","#72d6f2"] },
  { id: "royal", name: "Royal", description: "Modern violet", colors: ["#2b2145","#6348a4","#d8c5ff"] },
  { id: "sunset", name: "Sunset", description: "Warm copper", colors: ["#43291f","#9a5033","#ffd38a"] },
  { id: "charcoal", name: "Charcoal", description: "Clean neutral dark", colors: ["#202728","#3c4a4b","#d6e2df"] },
  { id: "teal", name: "Teal", description: "Fresh creative studio", colors: ["#103638","#147477","#8de1d5"] },
  { id: "indigo", name: "Indigo", description: "Confident business blue", colors: ["#202c55","#3f5aa9","#b9c9ff"] },
  { id: "rose", name: "Rose", description: "Warm elegant rose", colors: ["#482631","#9b4c66","#ffc1d3"] },
  { id: "gold", name: "Gold", description: "Premium black and gold", colors: ["#29261e","#78652d","#f0d475"] },
  { id: "berry", name: "Berry", description: "Rich modern magenta", colors: ["#3e203b","#87457f","#f2b8e9"] },
];
export function getTheme(): AppTheme { const value=localStorage.getItem(themeStorageKey) as AppTheme|null;return themes.some(theme=>theme.id===value)?value!:"forest"; }
export function applyTheme(theme: AppTheme) { document.documentElement.dataset.theme=theme;localStorage.setItem(themeStorageKey,theme);window.dispatchEvent(new CustomEvent("printmanager:theme-changed",{detail:theme})); }
