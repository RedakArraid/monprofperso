/** API fields are text, including strings that look like HTML. */
export function offerPopupContent(
  offer: { label: string; subject?: string; priceLabel?: string },
  doc: Pick<Document, "createElement"> = document,
): HTMLElement {
  const content = doc.createElement("div");
  const title = doc.createElement("strong");
  title.textContent = offer.label;
  content.appendChild(title);
  for (const text of [offer.subject, offer.priceLabel, "Côte d'Ivoire"]) {
    if (!text) continue;
    content.appendChild(doc.createElement("br"));
    const line = doc.createElement("span");
    line.textContent = text;
    content.appendChild(line);
  }
  return content;
}
