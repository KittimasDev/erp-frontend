import type { Metadata } from "next";
import { App as AntdApp } from "antd";
import AntdProvider from "@/components/providers/AntdProvider";
import QueryProvider from "@/components/providers/QueryProvider";
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
        <QueryProvider>
          <AntdProvider>
            <AntdApp>{children}</AntdApp>
          </AntdProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
