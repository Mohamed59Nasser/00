import { sheetsFetch } from "./google";
import { ALL_TAB, SEARCH_TAB, SHEET_HEADERS } from "./store/sheets";

/* ------------------------------------------------------------------ */
/*  Colors (Google Sheets API uses 0..1 floats)                        */
/* ------------------------------------------------------------------ */
type Rgb = { red: number; green: number; blue: number };
const rgb = (hex: string): Rgb => ({
  red: parseInt(hex.slice(0, 2), 16) / 255,
  green: parseInt(hex.slice(2, 4), 16) / 255,
  blue: parseInt(hex.slice(4, 6), 16) / 255,
});

const C = {
  slate900: rgb("0F172A"),
  slate800: rgb("1E293B"),
  slate50: rgb("F8FAFC"),
  white: rgb("FFFFFF"),
  emerald: rgb("059669"),
  buyer: rgb("1D4ED8"),
  seller: rgb("B45309"),
  violet: rgb("7C3AED"),
  buyerSoft: rgb("DBEAFE"),
  sellerSoft: rgb("FEF3C7"),
  resSoft: rgb("D1FAE5"),
  invSoft: rgb("EDE9FE"),
  resText: rgb("065F46"),
  invText: rgb("5B21B6"),
  buyerText: rgb("1E40AF"),
  sellerText: rgb("92400E"),
};

const MAX_ROWS = 5000;

interface SheetInfo {
  properties: { sheetId: number; title: string };
  bandedRanges?: { bandedRangeId: number }[];
  conditionalFormats?: unknown[];
}

async function fetchSheets(): Promise<SheetInfo[]> {
  const meta = await sheetsFetch<{ sheets?: SheetInfo[] }>(
    "?fields=sheets(properties(sheetId,title),bandedRanges(bandedRangeId),conditionalFormats)",
  );
  return meta.sheets ?? [];
}

async function batchUpdate(requests: unknown[]) {
  if (requests.length === 0) return;
  await sheetsFetch(":batchUpdate", { method: "POST", body: JSON.stringify({ requests }) });
}

/* ------------------------------------------------------------------ */
/*  Request builders                                                   */
/* ------------------------------------------------------------------ */

const range = (sheetId: number, r0: number, r1: number, c0: number, c1: number) => ({
  sheetId,
  startRowIndex: r0,
  endRowIndex: r1,
  startColumnIndex: c0,
  endColumnIndex: c1,
});

const colWidth = (sheetId: number, index: number, pixelSize: number) => ({
  updateDimensionProperties: {
    range: { sheetId, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 },
    properties: { pixelSize },
    fields: "pixelSize",
  },
});

const rowHeight = (sheetId: number, index: number, pixelSize: number) => ({
  updateDimensionProperties: {
    range: { sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 },
    properties: { pixelSize },
    fields: "pixelSize",
  },
});

const listValidation = (sheetId: number, column: number, values: string[], strict = true) => ({
  setDataValidation: {
    range: range(sheetId, 1, MAX_ROWS, column, column + 1),
    rule: {
      condition: { type: "ONE_OF_LIST", values: values.map((v) => ({ userEnteredValue: v })) },
      showCustomUi: true,
      strict,
    },
  },
});

const textRule = (
  sheetId: number,
  column: number,
  conditionType: "TEXT_EQ" | "TEXT_CONTAINS",
  value: string,
  bg: Rgb,
  fg: Rgb,
) => ({
  addConditionalFormatRule: {
    index: 0,
    rule: {
      ranges: [range(sheetId, 1, MAX_ROWS, column, column + 1)],
      booleanRule: {
        condition: { type: conditionType, values: [{ userEnteredValue: value }] },
        format: { backgroundColor: bg, textFormat: { foregroundColor: fg, bold: true } },
      },
    },
  },
});

const formulaRule = (sheetId: number, r: ReturnType<typeof range>, formula: string, bg: Rgb) => ({
  addConditionalFormatRule: {
    index: 0,
    rule: {
      ranges: [r],
      booleanRule: {
        condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: formula }] },
        format: { backgroundColor: bg, textFormat: { foregroundColor: C.white, bold: true } },
      },
    },
  },
  _sheetId: sheetId,
});

/* ------------------------------------------------------------------ */
/*  SEARCH tab formulas                                                */
/* ------------------------------------------------------------------ */

// ALL columns used in the SEARCH tab (positions inside ALL!A:N, QUERY letters)
const SEARCH_SELECT = "A,B,D,E,F,G,H,I,J,M,N";
const SEARCH_HEADERS = [
  "Name",
  "Phone",
  "Age",
  "Marital Status",
  "Children",
  "Children Note",
  "Areas",
  "Size (m²)",
  "Price (EGP)",
  "Payment",
  "Notes",
];
const SEARCH_COLS = SEARCH_HEADERS.length; // 11
const LEFT = 0; // A
const RIGHT = SEARCH_COLS + 1; // M (one spacer column in between)

const q = (s: string) => `"${s}"`;
const padRow = (first: string) => [first, ...Array(SEARCH_COLS - 1).fill('""')].join(",");

function sectionFormula(role: "Buyer" | "Seller", label: string, keyword: string): string {
  const count = `COUNTIFS(ALL!$L$2:$L,${q(role)},ALL!$K$2:$K,${q(`*${keyword}*`)})`;
  const banner = padRow(`${q(`${label.toUpperCase()}  (`)}&${count}&${q(")")}`);
  const header = SEARCH_HEADERS.map(q).join(",");
  const query = `IFERROR(QUERY(ALL!$A$2:$N,${q(`select ${SEARCH_SELECT} where L = '${role}' and K contains '${keyword}'`)},0),{${padRow(q("No records"))}})`;
  return `${banner};${header};${query}`;
}

function blockFormula(role: "Buyer" | "Seller"): string {
  return `={${sectionFormula(role, "Residential", "Residential")};${padRow('""')};${sectionFormula(role, "Investment", "Investment")}}`;
}

/* ------------------------------------------------------------------ */
/*  Public: initialize / re-style the spreadsheet                      */
/* ------------------------------------------------------------------ */

export async function initializeSheet(): Promise<void> {
  /* 1. Make sure both tabs exist */
  let sheets = await fetchSheets();
  const titles = sheets.map((s) => s.properties.title);
  const createRequests: unknown[] = [];

  if (!titles.includes(ALL_TAB)) {
    const first = sheets[0];
    if (sheets.length === 1 && /^sheet\s?1$/i.test(first.properties.title)) {
      createRequests.push({
        updateSheetProperties: {
          properties: { sheetId: first.properties.sheetId, title: ALL_TAB, index: 0 },
          fields: "title,index",
        },
      });
    } else {
      createRequests.push({ addSheet: { properties: { title: ALL_TAB, index: 0 } } });
    }
  }
  if (!titles.includes(SEARCH_TAB)) {
    createRequests.push({ addSheet: { properties: { title: SEARCH_TAB, index: 1 } } });
  }
  await batchUpdate(createRequests);

  sheets = await fetchSheets();
  const all = sheets.find((s) => s.properties.title === ALL_TAB);
  const search = sheets.find((s) => s.properties.title === SEARCH_TAB);
  if (!all || !search) throw new Error("Could not create the ALL / SEARCH tabs.");
  const a = all.properties.sheetId;
  const s = search.properties.sheetId;

  // SEARCH may contain hand-maintained formulas or a different reporting layout.
  // Never clear an existing report just to re-apply ALL formatting.
  const searchValues = await sheetsFetch<{ values?: unknown[][] }>(
    `/values/${encodeURIComponent(`${SEARCH_TAB}!A1:Z${MAX_ROWS}`)}`,
  );
  const preserveSearch = (searchValues.values ?? []).some((row) =>
    row.some((value) => String(value ?? "").trim() !== ""),
  );

  /* 2. Reset old banding / conditional formats so re-running never fails */
  const resetRequests: unknown[] = [];
  for (const sheet of preserveSearch ? [all] : [all, search]) {
    for (const b of sheet.bandedRanges ?? []) resetRequests.push({ deleteBanding: { bandedRangeId: b.bandedRangeId } });
    const count = sheet.conditionalFormats?.length ?? 0;
    for (let i = 0; i < count; i++) {
      resetRequests.push({ deleteConditionalFormatRule: { sheetId: sheet.properties.sheetId, index: 0 } });
    }
  }
  if (!preserveSearch) resetRequests.push({ unmergeCells: { range: range(s, 0, 3, 0, 30) } });
  await batchUpdate(resetRequests);

  /* 3. Clear only a blank SEARCH tab and write headers into ALL */
  if (!preserveSearch) {
    await sheetsFetch(`/values/${encodeURIComponent(`${SEARCH_TAB}!A1:Z${MAX_ROWS}`)}:clear`, { method: "POST", body: "{}" });
  }
  await sheetsFetch(`/values/${encodeURIComponent(`${ALL_TAB}!A1:Z1`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[...SHEET_HEADERS]] }),
  });

  /* 4. Formatting – ALL tab */
  const widths = [
    190, 130, 220, 60, 120, 80, 200, 260, 90, 120, 170, 80, 170, 280, 130, 60,
    190, 170, 190, 170, 130, 190, 170, 190, 170, 130,
  ];
  const allRequests: unknown[] = [
    {
      updateSheetProperties: {
        properties: { sheetId: a, tabColor: C.emerald, gridProperties: { frozenRowCount: 1 } },
        fields: "tabColor,gridProperties.frozenRowCount",
      },
    },
    // base body style
    {
      repeatCell: {
        range: range(a, 1, MAX_ROWS, 0, 26),
        cell: { userEnteredFormat: { verticalAlignment: "MIDDLE", textFormat: { fontSize: 10 } } },
        fields: "userEnteredFormat(verticalAlignment,textFormat.fontSize)",
      },
    },
    // header row
    {
      repeatCell: {
        range: range(a, 0, 1, 0, 26),
        cell: {
          userEnteredFormat: {
            backgroundColor: C.slate800,
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            textFormat: { bold: true, fontSize: 10, foregroundColor: C.white },
          },
        },
        fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)",
      },
    },
    rowHeight(a, 0, 34),
    // phone stays text so leading zeros are kept
    {
      repeatCell: {
        range: range(a, 1, MAX_ROWS, 1, 2),
        cell: { userEnteredFormat: { numberFormat: { type: "TEXT" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // price with thousands separator
    {
      repeatCell: {
        range: range(a, 1, MAX_ROWS, 9, 10),
        cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" }, horizontalAlignment: "RIGHT" } },
        fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
      },
    },
    // centered columns: Age, Marital, Children, Role
    ...[3, 4, 5, 11].map((col) => ({
      repeatCell: {
        range: range(a, 1, MAX_ROWS, col, col + 1),
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
        fields: "userEnteredFormat.horizontalAlignment",
      },
    })),
    // dropdowns
    listValidation(a, 4, ["Single", "Married", "Divorced", "Widowed"]),
    listValidation(a, 10, ["Residential", "Investment", "Residential, Investment"]),
    listValidation(a, 11, ["Buyer", "Seller"]),
    // color chips
    textRule(a, 11, "TEXT_EQ", "Buyer", C.buyerSoft, C.buyerText),
    textRule(a, 11, "TEXT_EQ", "Seller", C.sellerSoft, C.sellerText),
    textRule(a, 10, "TEXT_CONTAINS", "Investment", C.invSoft, C.invText),
    textRule(a, 10, "TEXT_CONTAINS", "Residential", C.resSoft, C.resText),
    // zebra rows
    {
      addBanding: {
        bandedRange: {
          range: range(a, 0, MAX_ROWS, 0, 26),
          rowProperties: { headerColor: C.slate800, firstBandColor: C.white, secondBandColor: C.slate50 },
        },
      },
    },
    // filter + hidden ID column
    { setBasicFilter: { filter: { range: range(a, 0, MAX_ROWS, 0, 26) } } },
    {
      updateDimensionProperties: {
        range: { sheetId: a, dimension: "COLUMNS", startIndex: 15, endIndex: 16 },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
    ...widths.map((w, i) => colWidth(a, i, w)),
  ];

  /* 5. Formatting – SEARCH tab */
  const searchRequests: unknown[] = preserveSearch ? [] : [
    {
      updateSheetProperties: {
        properties: { sheetId: s, tabColor: C.buyer, gridProperties: { frozenRowCount: 1 } },
        fields: "tabColor,gridProperties.frozenRowCount",
      },
    },
    {
      repeatCell: {
        range: range(s, 0, MAX_ROWS, 0, 24),
        cell: { userEnteredFormat: { verticalAlignment: "MIDDLE", textFormat: { fontSize: 10 } } },
        fields: "userEnteredFormat(verticalAlignment,textFormat.fontSize)",
      },
    },
    { mergeCells: { range: range(s, 0, 1, LEFT, LEFT + SEARCH_COLS), mergeType: "MERGE_ALL" } },
    { mergeCells: { range: range(s, 0, 1, RIGHT, RIGHT + SEARCH_COLS), mergeType: "MERGE_ALL" } },
    ...(
      [
        [LEFT, C.buyer],
        [RIGHT, C.seller],
      ] as [number, Rgb][]
    ).map(([start, color]) => ({
      repeatCell: {
        range: range(s, 0, 1, start, start + SEARCH_COLS),
        cell: {
          userEnteredFormat: {
            backgroundColor: color,
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            textFormat: { bold: true, fontSize: 16, foregroundColor: C.white },
          },
        },
        fields: "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)",
      },
    })),
    rowHeight(s, 0, 40),
    // price column (9th) of each block
    ...[LEFT, RIGHT].map((start) => ({
      repeatCell: {
        range: range(s, 2, MAX_ROWS, start + 8, start + 9),
        cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" }, horizontalAlignment: "RIGHT" } },
        fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
      },
    })),
    // phone column text
    ...[LEFT, RIGHT].map((start) => ({
      repeatCell: {
        range: range(s, 2, MAX_ROWS, start + 1, start + 2),
        cell: { userEnteredFormat: { numberFormat: { type: "TEXT" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    })),
    // section banner / header rows (colored by their text)
    ...(
      [
        [LEFT, "A"],
        [RIGHT, "M"],
      ] as [number, string][]
    ).flatMap(([start, letter]) => {
      const r = range(s, 2, MAX_ROWS, start, start + SEARCH_COLS);
      return [
        formulaRule(s, r, `=LEFT($${letter}3,11)="RESIDENTIAL"`, C.emerald),
        formulaRule(s, r, `=LEFT($${letter}3,10)="INVESTMENT"`, C.violet),
        formulaRule(s, r, `=AND($${letter}3="Name",$${String.fromCharCode(letter.charCodeAt(0) + 1)}3="Phone")`, C.slate800),
      ];
    }),
    ...[190, 120, 55, 110, 75, 170, 230, 85, 110, 160, 240].flatMap((w, i) => [
      colWidth(s, LEFT + i, w),
      colWidth(s, RIGHT + i, w),
    ]),
    colWidth(s, SEARCH_COLS, 24),
  ].map((req) => {
    // strip helper keys that are not part of the API
    const { _sheetId: _ignored, ...rest } = req as Record<string, unknown>;
    void _ignored;
    return rest;
  });

  await batchUpdate([...allRequests, ...searchRequests]);

  /* 6. Live SEARCH formulas (need USER_ENTERED so Sheets evaluates them) */
  if (!preserveSearch) {
    await sheetsFetch("/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `${SEARCH_TAB}!A1`, values: [["BUYER"]] },
          { range: `${SEARCH_TAB}!M1`, values: [["SELLER"]] },
          { range: `${SEARCH_TAB}!A3`, values: [[blockFormula("Buyer")]] },
          { range: `${SEARCH_TAB}!M3`, values: [[blockFormula("Seller")]] },
        ],
      }),
    });
  }
}
