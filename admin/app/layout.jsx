import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "Luqya – Smart & Secure Chat App",
  description:
    "Luqya is a modern mobile chat application designed for fast, secure, and meaningful conversations. Stay connected anytime, anywhere.",
  keywords: [
    "Luqya",
    "Chat App",
    "Messaging App",
    "Secure Chat",
    "Mobile Messaging",
  ],
  authors: [{ name: "Luqya Team" }],
  openGraph: {
    title: "Luqya – Smart & Secure Chat App",
    description:
      "Experience seamless and secure conversations with Luqya. Built for speed, privacy, and connection.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased font-sans bg-foreground text-background">
        {children}
      </body>
    </html>
  );
}
