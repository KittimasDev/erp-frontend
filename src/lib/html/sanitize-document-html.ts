const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "H1",
  "H2",
  "UL",
  "OL",
  "LI",
  "PRE",
  "CODE",
]);

/**
 * หนีอักขระให้กลายเป็นข้อความล้วน — ใช้กับทางที่ไม่มี DOMParser
 *
 * ผลลัพธ์ของไฟล์นี้ถูกส่งเข้า `dangerouslySetInnerHTML` โดยตรง สิ่งที่คืนออกไป
 * จึงต้องปลอดภัยทุกเส้นทาง ไม่ใช่เฉพาะเส้นทางหลัก
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ดึงข้อความอ่านได้ออกจาก HTML — **ถอดรหัสเอนทิตี** จึงใช้ได้แค่สองอย่าง
 * คือเช็คว่าว่างไหม กับเป็นวัตถุดิบให้ `escapeHtml` ต่อ
 *
 * ห้ามคืนค่าจากฟังก์ชันนี้เป็น HTML ตรง ๆ — `&lt;img onerror=...&gt;` ที่ถูกเก็บไว้
 * แบบเข้ารหัสจะกลายเป็นแท็กจริงทันที
 */
function htmlTextContent(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapElement(el: Element) {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  el.remove();
}

const TEXT_ALIGN = new Set(["left", "center", "right", "justify"]);

function safeTextAlign(el: Element): string | null {
  const fromAlign = el.getAttribute("align")?.trim().toLowerCase();
  const style = el.getAttribute("style") ?? "";
  const match = style.match(
    /(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i,
  );
  const value = (match?.[1] ?? fromAlign)?.toLowerCase();
  return value && TEXT_ALIGN.has(value) ? value : null;
}

function keepAllowedAttributes(el: Element) {
  const tag = el.tagName.toUpperCase();
  const isTaskList = tag === "UL" && el.hasAttribute("data-task");
  const isCheckedItem =
    tag === "LI" && el.getAttribute("data-checked") === "true";
  const textAlign = safeTextAlign(el);
  for (const attr of Array.from(el.attributes)) {
    el.removeAttribute(attr.name);
  }
  if (isTaskList) {
    el.setAttribute("data-task", "");
  }
  if (isCheckedItem) {
    el.setAttribute("data-checked", "true");
  }
  if (textAlign) {
    el.setAttribute("style", `text-align: ${textAlign}`);
  }
}

function cleanNode(node: Element) {
  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      child = next;
      continue;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      child = next;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      child = next;
      continue;
    }

    const el = child as Element;
    const tag = el.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE") {
      el.remove();
      child = next;
      continue;
    }

    if (tag === "DIV" && node.tagName.toUpperCase() !== "PRE") {
      const p = el.ownerDocument.createElement("p");
      const textAlign = safeTextAlign(el);
      if (textAlign) {
        p.setAttribute("style", `text-align: ${textAlign}`);
      }
      while (el.firstChild) {
        p.appendChild(el.firstChild);
      }
      node.insertBefore(p, el);
      el.remove();
      child = p;
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      const first = el.firstChild;
      unwrapElement(el);
      child = first ?? next;
      continue;
    }

    keepAllowedAttributes(el);
    cleanNode(el);
    child = next;
  }
}

/** ตัดแท็ก/แอตทริบิวต์ที่ไม่ใช่ตัวหนา เอียง หัวข้อ รายการ โค้ด — ใช้ทั้งหน้าจอและ PDF */
export function sanitizeDocumentHtml(input?: string | null): string {
  if (!input?.trim()) {
    return "";
  }
  /*
    ไม่มี DOMParser = รันนอกเบราว์เซอร์ (SSR, สคริปต์ Node) — ตัดเหลือข้อความล้วน
    แล้ว **หนีอักขระก่อนคืน**

    ของเดิมคืนผลของ `htmlTextContent()` ตรง ๆ ซึ่งถอดรหัส `&lt;` กลับเป็น `<`
    หลังจากตัดแท็กไปแล้ว · หมายเหตุที่เก็บไว้เป็น `&lt;img src=x onerror=...&gt;`
    จึงออกมาเป็นแท็กจริงแล้ววิ่งเข้า `dangerouslySetInnerHTML`

    วันนี้ยังยิงไม่ได้เพราะทุกหน้าดึงข้อมูลฝั่ง client และ PDF ก็สร้างในเบราว์เซอร์
    (ทั้งสองที่มี DOMParser) ตอน SSR จึงไม่มีหมายเหตุให้ประมวลผล · แต่ทันทีที่มีคน
    เพิ่มการดึงข้อมูลฝั่ง server หรือย้าย PDF ไปสร้างที่ Node มันจะกลายเป็น
    stored XSS ทันทีโดยไม่มีอะไรเตือน
  */
  if (typeof DOMParser === "undefined") {
    const text = htmlTextContent(input);
    return text ? `<p>${escapeHtml(text)}</p>` : "";
  }

  const doc = new DOMParser().parseFromString(input, "text/html");
  cleanNode(doc.body);
  const html = doc.body.innerHTML.replace(/&nbsp;/gi, " ").trim();
  return htmlTextContent(html) ? html : "";
}

export function documentHtmlIsEmpty(input?: string | null): boolean {
  return !sanitizeDocumentHtml(input);
}
