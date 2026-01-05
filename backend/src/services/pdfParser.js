module.exports = async function parsePdf(buffer, referenceDate) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // ✅ PDF.js v5 exige Uint8Array
  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const rows = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    const lines = {};

    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item);
    }

    for (const y of Object.keys(lines)) {
      const line = lines[y]
        .sort((a, b) => a.transform[4] - b.transform[4])
        .map(i => i.str)
        .join(" ")
        .trim();

      if (!/^[A-Z0-9]{5}\s+[A-Z]/.test(line)) continue;

      const parts = line.split(/\s+/);
      const reservation = parts[0];
      const agency = parts[1];

      const valueMatch = line.match(/R\$\s*([\d.,]+)/);
      const typeMatch = line.match(/(Repasse|Cr[eé]dito)/i);

      if (!valueMatch || !typeMatch) continue;

      let value = Number(
        valueMatch[1].replace(/\D/g, "")
      );
      value = value / 100;

      rows.push({
        reservation,
        agency,
        repasse: /Repasse/i.test(typeMatch[1]) ? value : 0,
        credito: /Cr[eé]dito/i.test(typeMatch[1]) ? value : 0
      });
    }
  }

  return {
    reference: referenceDate,
    rows
  };
};
