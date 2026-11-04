import { useId } from "react";

import type { Language } from "@/lib/i18n/language";

/**
 * ธงประเทศทรงกลมสำหรับตัวสลับภาษา — SVG ในไฟล์ ไม่โหลดรูปจากภายนอก
 * th = ธงชาติไทย · en = ธงสหราชอาณาจักร
 */
export default function LanguageFlag({
  language,
  size = 22,
  ring = true,
  className,
}: {
  language: Language;
  size?: number;
  /** กรอบขาวบาง ๆ + เงา ให้ธงดูเป็นเหรียญนูน */
  ring?: boolean;
  className?: string;
}) {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={language === "th" ? "ธงชาติไทย" : "United Kingdom flag"}
      style={{
        display: "block",
        flex: "none",
        borderRadius: "50%",
        boxShadow: ring
          ? "0 0 0 2px #ffffff, 0 0 0 3px rgba(47, 52, 58, 0.12), 0 3px 8px rgba(47, 52, 58, 0.22)"
          : undefined,
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
        <radialGradient id={`${clipId}-shine`} cx="32%" cy="26%" r="75%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {language === "th" ? (
          <>
            <rect width="24" height="24" fill="#a51931" />
            <rect y="4" width="24" height="16" fill="#f4f5f8" />
            <rect y="8" width="24" height="8" fill="#2d2a4a" />
          </>
        ) : (
          <>
            <rect width="24" height="24" fill="#012169" />
            <path d="M0 0L24 24M24 0L0 24" stroke="#ffffff" strokeWidth="4.4" />
            <path d="M0 0L24 24M24 0L0 24" stroke="#c8102e" strokeWidth="2" />
            <path d="M12 0V24M0 12H24" stroke="#ffffff" strokeWidth="7" />
            <path d="M12 0V24M0 12H24" stroke="#c8102e" strokeWidth="4" />
          </>
        )}
        <circle cx="12" cy="12" r="12" fill={`url(#${clipId}-shine)`} />
      </g>
    </svg>
  );
}
