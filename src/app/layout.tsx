import type { Metadata } from "next";
import { App as AntdApp } from "antd";
import "./globals.css";
import "antd/dist/reset.css";

export const metadata: Metadata = {
  title: "SMT ERP",
  description: "SMT Energy ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AntdApp>{children}</AntdApp>
      </body>
    </html>
  );
}