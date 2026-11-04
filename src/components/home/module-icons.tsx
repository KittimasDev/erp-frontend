import type { ReactNode } from "react";
import {
  BarChartOutlined,
  ExperimentOutlined,
  FundOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TruckOutlined,
  UserOutlined,
  WalletOutlined,
  ExperimentFilled,
} from "@ant-design/icons";

/**
 * ไอคอนประจำโมดูล (คีย์ตรงกับ PortalModuleKey) — ใช้ร่วมกันระหว่างการ์ดหน้าแรกและหัวหน้า (PageHeader)
 */
export function moduleIcon(key: string | null | undefined): ReactNode {
  switch (key) {
    case "dashboard":
      return <BarChartOutlined aria-hidden />;
    case "raw-tire":
      return <TruckOutlined aria-hidden />;
    case "purchase":
      return <ShoppingCartOutlined aria-hidden />;
    case "rm-warehouse":
      return <InboxOutlined aria-hidden />;
    case "production":
      return <ThunderboltOutlined aria-hidden />;
    case "fg-warehouse":
      return <ShoppingOutlined aria-hidden />;
    case "sales":
      return <TeamOutlined aria-hidden />;
    case "laboratory":
      return <ExperimentOutlined aria-hidden />;
    case "oil-tank-farm":
      return <ExperimentFilled aria-hidden />;
    case "maintenance":
      return <ToolOutlined aria-hidden />;
    case "hrm":
      return <UserOutlined aria-hidden />;
    case "finance":
      return <WalletOutlined aria-hidden />;
    case "reports":
      return <FundOutlined aria-hidden />;
    case "master":
      return <SettingOutlined aria-hidden />;
    default:
      return <InboxOutlined aria-hidden />;
  }
}
