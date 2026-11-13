import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import { App as AntdApp } from "antd";
import AntdProvider from "@/components/providers/AntdProvider";
import ESignProvider from "@/components/esign/ESignProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";
import "antd/dist/reset.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-kanit",
  display: "swap",
});

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
    <html lang="th" className={kanit.variable}>
      <body className={kanit.className}>
        <QueryProvider>
          <AntdProvider>
            <AntdApp>
              {children}
              <ESignProvider />
            </AntdApp>
          </AntdProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
