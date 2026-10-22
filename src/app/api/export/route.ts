import ExcelJS from "exceljs";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listVisibleClients } from "@/lib/clients";
import {
  CLIENT_ROLE_LABELS,
  MARITAL_LABELS,
  PAYMENT_LABELS,
  PROPERTY_TYPE_LABELS,
  type Client,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Palette & style helpers                                            */
/* ------------------------------------------------------------------ */
const COLORS = {
  title: "1E293B",
  header: "047857",
  subHeader: "334155",
  zebra: "F8FAFC",
  border: "CBD5E1",
  buyer: "1D4ED8",
  seller: "B45309",
  residential: "059669",
  investment: "7C3AED",
  buyerSoft: "DBEAFE",
  sellerSoft: "FEF3C7",
  residentialSoft: "D1FAE5",
  investmentSoft: "EDE9FE",
  white: "FFFFFF",
  muted: "64748B",
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } },
};

const solidFill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function styleBanner(cell: ExcelJS.Cell, fill: string, size = 14) {
  cell.fill = solidFill(fill);
  cell.font = { bold: true, color: { argb: COLORS.white }, size, name: "Calibri" };
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

function styleHeaderCell(cell: ExcelJS.Cell, fill = COLORS.header) {
  cell.fill = solidFill(fill);
  cell.font = { bold: true, color: { argb: COLORS.white }, size: 11, name: "Calibri" };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder;
}

function styleDataCell(cell: ExcelJS.Cell, zebra: boolean) {
  cell.border = thinBorder;
  cell.font = { size: 11, name: "Calibri" };
  cell.alignment = { vertical: "middle", wrapText: false };
  if (zebra) cell.fill = solidFill(COLORS.zebra);
}

function listValidation(values: string[]): ExcelJS.DataValidation {
  return {
    type: "list",
    allowBlank: true,
    formulae: [`"${values.join(",")}"`],
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Invalid value",
    error: `Please choose one of: ${values.join(", ")}`,
  };
}

const typesLabel = (c: Client) => c.propertyTypes.map((t) => PROPERTY_TYPE_LABELS[t]).join(", ");
const paymentLabel = (c: Client) => c.paymentMethods.map((p) => PAYMENT_LABELS[p]).join(", ");

/* ------------------------------------------------------------------ */
/*  Sheet 1: ALL                                                       */
/* ------------------------------------------------------------------ */
const ALL_COLUMNS: { header: string; width: number }[] = [
  { header: "#", width: 6 },
  { header: "Name", width: 26 },
  { header: "Phone", width: 16 },
  { header: "Email", width: 28 },
  { header: "Age", width: 7 },
  { header: "Marital Status", width: 15 },
  { header: "Children", width: 10 },
  { header: "Children Note", width: 26 },
  { header: "Areas", width: 34 },
  { header: "Size (m²)", width: 11 },
  { header: "Price (EGP)", width: 16 },
  { header: "Type", width: 22 },
  { header: "Role", width: 10 },
  { header: "Payment", width: 24 },
  { header: "Notes", width: 40 },
  { header: "Added", width: 13 },
];

function buildAllSheet(wb: ExcelJS.Workbook, rows: Client[]) {
  const ws = wb.addWorksheet("ALL", {
    views: [{ state: "frozen", ySplit: 3, xSplit: 2 }],
    properties: { tabColor: { argb: COLORS.header } },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ALL_COLUMNS.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });
  const lastCol = ALL_COLUMNS.length;

  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = "REAL ESTATE BROKER  —  ALL DATA";
  styleBanner(title, COLORS.title, 16);
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, lastCol);
  const sub = ws.getCell(2, 1);
  sub.value = `${rows.length} record${rows.length === 1 ? "" : "s"}  •  Exported ${new Date().toLocaleString("en-GB")}`;
  sub.font = { italic: true, color: { argb: COLORS.muted }, size: 10 };
  sub.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(2).height = 18;

  const headerRow = ws.getRow(3);
  ALL_COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    styleHeaderCell(cell);
  });
  headerRow.height = 24;

  rows.forEach((r, idx) => {
    const row = ws.getRow(4 + idx);
    const values: ExcelJS.CellValue[] = [
      idx + 1,
      r.name,
      r.phone,
      r.email ?? "",
      r.age ?? "",
      MARITAL_LABELS[r.maritalStatus],
      r.maritalStatus === "single" ? "" : r.childrenCount,
      r.childrenNote ?? "",
      r.areas.join(", "),
      r.sizeSqm ?? "",
      r.price ?? "",
      typesLabel(r),
      CLIENT_ROLE_LABELS[r.role],
      paymentLabel(r),
      r.notes ?? "",
      new Date(r.createdAt),
    ];
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      styleDataCell(cell, idx % 2 === 1);
    });

    const center = { horizontal: "center", vertical: "middle" } as const;
    const right = { horizontal: "right", vertical: "middle" } as const;
    row.getCell(1).alignment = center;
    row.getCell(1).font = { color: { argb: COLORS.muted }, size: 10 };
    [5, 6, 7, 13, 16].forEach((c) => (row.getCell(c).alignment = center));
    row.getCell(10).numFmt = "General";
    row.getCell(10).alignment = right;
    row.getCell(11).numFmt = "#,##0";
    row.getCell(11).alignment = right;
    row.getCell(16).numFmt = "dd-mmm-yyyy";

    const hasRes = r.propertyTypes.includes("residential");
    const hasInv = r.propertyTypes.includes("investment");
    const typeCell = row.getCell(12);
    typeCell.alignment = center;
    typeCell.fill = solidFill(hasRes && hasInv ? "E0E7FF" : hasRes ? COLORS.residentialSoft : COLORS.investmentSoft);
    typeCell.font = { bold: true, size: 10, color: { argb: hasRes && hasInv ? "3730A3" : hasRes ? "065F46" : "5B21B6" } };

    const roleCell = row.getCell(13);
    roleCell.fill = solidFill(r.role === "buyer" ? COLORS.buyerSoft : COLORS.sellerSoft);
    roleCell.font = { bold: true, size: 10, color: { argb: r.role === "buyer" ? "1E40AF" : "92400E" } };
  });

  const lastValidationRow = 4 + rows.length + 300;
  for (let rowIdx = 4; rowIdx <= lastValidationRow; rowIdx++) {
    ws.getCell(rowIdx, 6).dataValidation = listValidation(["Single", "Married", "Divorced", "Widowed"]);
    ws.getCell(rowIdx, 13).dataValidation = listValidation(["Buyer", "Seller"]);
  }

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: Math.max(3, 3 + rows.length), column: lastCol } };
}

/* ------------------------------------------------------------------ */
/*  Sheet 2: SEARCH (BUYER | SELLER × Residential / Investment)        */
/* ------------------------------------------------------------------ */
const SEARCH_COLUMNS: { header: string; width: number }[] = [
  { header: "#", width: 5 },
  { header: "Name", width: 24 },
  { header: "Phone", width: 15 },
  { header: "Age", width: 6 },
  { header: "Marital Status", width: 13 },
  { header: "Children", width: 9 },
  { header: "Children Note", width: 22 },
  { header: "Areas", width: 30 },
  { header: "Size (m²)", width: 10 },
  { header: "Price (EGP)", width: 15 },
  { header: "Payment", width: 20 },
  { header: "Notes", width: 32 },
];
const HALF = SEARCH_COLUMNS.length;
const LEFT_START = 1;
const RIGHT_START = LEFT_START + HALF + 1;

function writeSearchHalf(
  ws: ExcelJS.Worksheet,
  startCol: number,
  startRow: number,
  rows: Client[],
  sectionFill: string,
  sectionLabel: string,
): number {
  ws.mergeCells(startRow, startCol, startRow, startCol + HALF - 1);
  const banner = ws.getCell(startRow, startCol);
  banner.value = `${sectionLabel}  (${rows.length})`;
  styleBanner(banner, sectionFill, 12);
  ws.getRow(startRow).height = 22;

  const headerRowIdx = startRow + 1;
  SEARCH_COLUMNS.forEach((c, i) => {
    const cell = ws.getCell(headerRowIdx, startCol + i);
    cell.value = c.header;
    styleHeaderCell(cell, COLORS.subHeader);
  });
  ws.getRow(headerRowIdx).height = 22;

  if (rows.length === 0) {
    const r = headerRowIdx + 1;
    ws.mergeCells(r, startCol, r, startCol + HALF - 1);
    const empty = ws.getCell(r, startCol);
    empty.value = "No records yet";
    empty.font = { italic: true, color: { argb: COLORS.muted } };
    empty.alignment = { horizontal: "center", vertical: "middle" };
    empty.border = thinBorder;
    return r;
  }

  rows.forEach((r, idx) => {
    const rowIdx = headerRowIdx + 1 + idx;
    const values: ExcelJS.CellValue[] = [
      idx + 1,
      r.name,
      r.phone,
      r.age ?? "",
      MARITAL_LABELS[r.maritalStatus],
      r.maritalStatus === "single" ? "" : r.childrenCount,
      r.childrenNote ?? "",
      r.areas.join(", "),
      r.sizeSqm ?? "",
      r.price ?? "",
      paymentLabel(r),
      r.notes ?? "",
    ];
    values.forEach((v, i) => {
      const cell = ws.getCell(rowIdx, startCol + i);
      cell.value = v;
      styleDataCell(cell, idx % 2 === 1);
    });
    ws.getCell(rowIdx, startCol).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(rowIdx, startCol).font = { color: { argb: COLORS.muted }, size: 10 };
    [3, 4, 5].forEach((off) => {
      ws.getCell(rowIdx, startCol + off).alignment = { horizontal: "center", vertical: "middle" };
    });
    ws.getCell(rowIdx, startCol + 8).numFmt = "General";
    ws.getCell(rowIdx, startCol + 8).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(rowIdx, startCol + 9).numFmt = "#,##0";
    ws.getCell(rowIdx, startCol + 9).alignment = { horizontal: "right", vertical: "middle" };
  });

  return headerRowIdx + rows.length;
}

function buildSearchSheet(wb: ExcelJS.Workbook, rows: Client[]) {
  const ws = wb.addWorksheet("SEARCH", {
    properties: { tabColor: { argb: COLORS.buyer } },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 2 }],
  });

  SEARCH_COLUMNS.forEach((c, i) => {
    ws.getColumn(LEFT_START + i).width = c.width;
    ws.getColumn(RIGHT_START + i).width = c.width;
  });
  ws.getColumn(LEFT_START + HALF).width = 3;

  // A client that wants both Residential and Investment appears in both sections.
  const pick = (role: Client["role"], type: "residential" | "investment") =>
    rows.filter((r) => r.role === role && r.propertyTypes.includes(type));
  const buyers = rows.filter((r) => r.role === "buyer");
  const sellers = rows.filter((r) => r.role === "seller");

  ws.mergeCells(1, LEFT_START, 1, LEFT_START + HALF - 1);
  const buyerBanner = ws.getCell(1, LEFT_START);
  buyerBanner.value = `BUYER  (${buyers.length})`;
  styleBanner(buyerBanner, COLORS.buyer, 16);

  ws.mergeCells(1, RIGHT_START, 1, RIGHT_START + HALF - 1);
  const sellerBanner = ws.getCell(1, RIGHT_START);
  sellerBanner.value = `SELLER  (${sellers.length})`;
  styleBanner(sellerBanner, COLORS.seller, 16);
  ws.getRow(1).height = 34;
  ws.getRow(2).height = 8;

  let cursor = 3;
  const endLeftRes = writeSearchHalf(ws, LEFT_START, cursor, pick("buyer", "residential"), COLORS.residential, "RESIDENTIAL");
  const endRightRes = writeSearchHalf(ws, RIGHT_START, cursor, pick("seller", "residential"), COLORS.residential, "RESIDENTIAL");
  cursor = Math.max(endLeftRes, endRightRes) + 2;

  writeSearchHalf(ws, LEFT_START, cursor, pick("buyer", "investment"), COLORS.investment, "INVESTMENT");
  writeSearchHalf(ws, RIGHT_START, cursor, pick("seller", "investment"), COLORS.investment, "INVESTMENT");
}

/* ------------------------------------------------------------------ */
/*  Route                                                              */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const actor = await requireApiUser();
    const rows = await listVisibleClients(actor);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Broker Sheet";
    wb.created = new Date();

    buildAllSheet(wb, rows);
    buildSearchSheet(wb, rows);

    const buffer = await wb.xlsx.writeBuffer();
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="broker-data-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to export workbook.");
  }
}
