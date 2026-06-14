import "./globals.css";

export const metadata = {
  title: "SisterCircle+",
  description: "Medical Clarity through Clinical Warmth",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F3F0] text-[#1A1A1A] antialiased">
        {children}
      </body>
    </html>
  );
}
