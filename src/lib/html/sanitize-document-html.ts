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
  if (typeof DOMParser === "undefined") {
    return htmlTextContent(input);
  }

  const doc = new DOMParser().parseFromString(input, "text/html");
  cleanNode(doc.body);
  const html = doc.body.innerHTML.replace(/&nbsp;/gi, " ").trim();
  return htmlTextContent(html) ? html : "";
}

export function documentHtmlIsEmpty(input?: string | null): boolean {
  return !sanitizeDocumentHtml(input);
}
