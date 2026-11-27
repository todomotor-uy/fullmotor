import localFont from "next/font/local";

export const spaceGrotesk = localFont({
  src: [
    { path: "../fonts/space-grotesk-500-latin.woff2", weight: "500" },
    { path: "../fonts/space-grotesk-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const hankenGrotesk = localFont({
  src: [
    { path: "../fonts/hanken-grotesk-400-latin.woff2", weight: "400" },
    { path: "../fonts/hanken-grotesk-500-latin.woff2", weight: "500" },
    { path: "../fonts/hanken-grotesk-600-latin.woff2", weight: "600" },
    { path: "../fonts/hanken-grotesk-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-hanken",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: [
    { path: "../fonts/jetbrains-mono-400-latin.woff2", weight: "400" },
    { path: "../fonts/jetbrains-mono-500-latin.woff2", weight: "500" },
    { path: "../fonts/jetbrains-mono-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});
