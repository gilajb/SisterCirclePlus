import "@/globals.css";

export const metadata = {
  title: {
    default: "SisterCircle+",
    template: "%s · SisterCircle+",
  },
  description: "Medical Clarity through Clinical Warmth",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
