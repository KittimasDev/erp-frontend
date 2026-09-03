const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "UL",
  "OL",
  "LI",
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

    if (tag === "DIV") {
      const p = el.ownerDocument.createElement("p");
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

    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }
    cleanNode(el);
    child = next;
  }
}

/** ตัดแท็ก/แอตทริบิวต์ที่ไม่ใช่ตัวหนา เอียง ขีดเส้นใต้ รายการ — ใช้ทั้งหน้าจอและ PDF */
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
