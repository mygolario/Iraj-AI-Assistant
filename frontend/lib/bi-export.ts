import * as XLSX from "xlsx";
import type { BiSnapshot } from "./types";

export function exportSnapshotToExcel(snapshot: BiSnapshot) {
  const wb = XLSX.utils.book_new();

  const kpiRows = Object.entries(snapshot.kpis).map(([key, value]) => ({ metric: key, value }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), "KPIs");

  if (snapshot.rows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.rows), "Records");
  }
  if (snapshot.byGrade.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.byGrade), "By Grade");
  }
  if (snapshot.byCustomer.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.byCustomer), "By Customer");
  }
  if (snapshot.byRep.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.byRep), "By Rep");
  }
  if (snapshot.byRegion.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.byRegion), "By Region");
  }
  if (snapshot.timeSeries.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshot.timeSeries), "Monthly Trend");
  }

  const safeLabel = snapshot.label.replace(/[^a-z0-9-_ ]/gi, "").trim() || "bi-export";
  XLSX.writeFile(wb, `${safeLabel}.xlsx`);
}

/** Serializes an inline SVG chart to a PNG and triggers a download. Works for
 * any Recharts SVG since Recharts renders pure SVG with no external refs. */
export function exportChartAsPng(container: HTMLElement, filename: string) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bgColor = getComputedStyle(document.body).getPropertyValue("--card") || "#ffffff";
  clone.setAttribute("style", `background:${bgColor}`);

  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const width = svg.clientWidth || 800;
  const height = svg.clientHeight || 400;
  const scale = 2;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, "image/png");
  };
  img.src = url;
}

export function printCurrentView() {
  window.print();
}
