import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Math - Calculadora y graficador 2D, sin límites",
  description:
    "Vórtex Math, de Vortex Company: evaluador científico con grados/radianes y graficador 2D de funciones f(x) con zoom y paneo. Todo se calcula y dibuja en tu navegador con Canvas, sin subir nada. Gratis, sin anuncios y 100% local.",
  keywords: [
    "Vórtex Math",
    "graficador de funciones",
    "calculadora científica",
    "gráficas 2D online",
    "f(x) online",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#2dd4bf" stroke-width="3.5"/><path d="M10 30c5-10 8 6 14-4s9 2 14-8" fill="none" stroke="#5eead4" stroke-width="3" strokeLinecap="round"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Math - Calculadora y graficador 2D, sin límites",
    description:
      "Vórtex Math, de Vortex Company: calculadora científica y graficador 2D de funciones f(x) con zoom y paneo, todo local en tu navegador. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex Math - Calculadora y graficador 2D, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
