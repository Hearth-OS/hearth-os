import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hearth OS",
  description: "Home maintenance OS for SF homeowners",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
