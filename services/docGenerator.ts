import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  UnderlineType, 
  PageBreak, 
  ColumnBreak, 
  VerticalMergeType, 
  PageOrientation, 
  HeightRule, 
  TableLayoutType 
} from 'docx';
import ExcelJS from 'exceljs';
import { DiaryMetadata, ActivityEntry, MovementEntry, ServiceCallReport, OfficeDatabaseEntry } from '../types';
import { getFortnightDays, formatDate, to24hDot } from '../utils/dateUtils';
import JSZip from 'jszip';

export const saveAsExcel = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const saveAs = async (rawBlob: Blob, fileName: string) => {
  let finalBlob = rawBlob;
  try {
    const zip = new JSZip();
    await zip.loadAsync(rawBlob);
    
    // 1. Process all XML files inside the document container
    for (const filename of Object.keys(zip.files)) {
      if (filename.endsWith('.xml')) {
        const fileEntry = zip.file(filename);
        if (fileEntry) {
          let content = await fileEntry.async("string");
          
          // Remove Word 2010+ compatibility elements (<w:compatSetting>)
          content = content.replace(/<w:compatSetting[^>]*\/>/g, '');
          content = content.replace(/<w:compat>\s*<\/w:compat>/g, '');
          
          // Strip Word 2010/2013/2016 namespaces and attributes from standard elements
          // This is critical because Word 2007 crashes/fails on unknown attributes in standard tags (like w15:tentative on w:lvl)
          content = content.replace(/\s+(w14|w15|w16|w16se|w16cid|w16cex|w16sdtdh|wp14|wpc|wpg|wpi|wps|cx|cx1|cx2|cx3|cx4|cx5|cx6|cx7|cx8|aink|am3d):[a-zA-Z0-9]+=(?:"[^"]*"|'[^']*')/g, '');
          
          // Strip mc:Ignorable attribute completely to avoid schema errors in older Word processors
          content = content.replace(/\s+mc:Ignorable=(?:"[^"]*"|'[^']*')/g, '');
          
          // Sanitize percentage widths for Word 2007 compatibility. 
          // Word 2007 does not support percentage signs (e.g. w:w="100%") in w:tblW or w:tcW, and crashes with Unspecified error.
          // Convert them to fiftieths of a percent integer values (e.g., 100% -> 5000, 15% -> 750).
          content = content.replace(/w:w=(["'])([0-9.]+)%\1/g, (match, quote, p1) => {
            const val = parseFloat(p1);
            const calculated = Math.round(val * 50);
            return `w:w=${quote}${calculated}${quote}`;
          });
          
          zip.file(filename, content);
        }
      }
    }

    // 2. Ensure docProps/app.xml (Extended Properties) is fully schema-compliant.
    // Modern docx outputs an empty <Properties /> tag which is schema-invalid and crashes Word 2007.
    const appXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n' +
      '  <Application>Microsoft Office Word</Application>\n' +
      '  <AppVersion>12.0000</AppVersion>\n' +
      '</Properties>';
    zip.file('docProps/app.xml', appXml);

    // 3. Remove docProps/custom.xml entirely because an empty custom properties element is schema-invalid in Word 2007.
    zip.remove('docProps/custom.xml');

    // Clean relations to custom.xml in _rels/.rels
    const relsFile = zip.file('_rels/.rels');
    if (relsFile) {
      let relsXml = await relsFile.async("string");
      relsXml = relsXml.replace(/<Relationship[^>]*Target="docProps\/custom\.xml"[^>]*\/>/g, '');
      relsXml = relsXml.replace(/<Relationship[^>]*Target='docProps\/custom\.xml'[^>]*\/>/g, '');
      zip.file('_rels/.rels', relsXml);
    }

    // Clean Overrides to custom.xml in [Content_Types].xml
    const contentTypesFile = zip.file('[Content_Types].xml');
    if (contentTypesFile) {
      let ctXml = await contentTypesFile.async("string");
      ctXml = ctXml.replace(/<Override[^>]*PartName="\/docProps\/custom\.xml"[^>]*\/>/g, '');
      ctXml = ctXml.replace(/<Override[^>]*PartName='\/docProps\/custom\.xml'[^>]*\/>/g, '');
      zip.file('[Content_Types].xml', ctXml);
    }

    // Re-generate the compatible .docx file as a Blob
    finalBlob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  } catch (err) {
    console.error("Error post-processing document for Word 2007 compatibility:", err);
  }

  const url = window.URL.createObjectURL(finalBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const DEFAULT_FONT = "Calibri";
const DEFAULT_SIZE = 21; // Calibri Font Size 21 (10.5pt in Word)
const HEADER_SIZE = 36; // Calibri Font Size 36 (18pt in Word)

/**
 * Sanitizes a string for safe inclusion in OpenXML/DOCX by removing:
 * 1. Invalid XML 1.0 control characters (e.g., \x00-\x08, \x0B, \x0C, \x0E-\x1F).
 * 2. Any null, undefined, or non-string inputs (converting them gracefully).
 */
export const cleanText = (val: any): string => {
  if (val === null || val === undefined) {
    return "";
  }
  let str = String(val);
  
  // Remove any XML/HTML tags (like <p>, <br/>, <xml>, etc.) to prevent Word 2007 XML parser crashes
  str = str.replace(/<[^>]*>/g, "");
  
  // Replace standalone < and > with safe brackets
  str = str.replace(/</g, "[").replace(/>/g, "]");
  
  // Replace ampersand to avoid broken entities or raw XML & validation errors
  str = str.replace(/&/g, " and ");
  
  // Matches any character outside the XML 1.0 valid range:
  // #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
  // We strip these control/invalid characters to prevent Word 2007 XML validation crash.
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, "");
};

const formatDottedLine = (labelNumber: string, labelText: string, value: string) => {
  const prefixDots = "................"; // 16 dots as prefix
  const label = `${labelNumber}. ${labelText} `;
  if (!value) {
    return new Paragraph({
      spacing: { before: 300, after: 300, line: 360 },
      children: [
        new TextRun({ text: label, bold: true, size: 20, font: DEFAULT_FONT }),
        new TextRun({ text: "................................................................................................................................................", size: 20, font: DEFAULT_FONT, color: "4A4A4A" })
      ]
    });
  } else {
    const maxDots = 110;
    const suffixCount = Math.max(10, maxDots - value.length - prefixDots.length);
    const suffixDots = ".".repeat(suffixCount);
    return new Paragraph({
      spacing: { before: 300, after: 300, line: 360 },
      children: [
        new TextRun({ text: label, bold: true, size: 20, font: DEFAULT_FONT }),
        new TextRun({ text: prefixDots, size: 20, font: DEFAULT_FONT, color: "4A4A4A" }),
        new TextRun({ text: value, bold: true, size: 20, font: DEFAULT_FONT, color: "000000" }),
        new TextRun({ text: suffixDots, size: 20, font: DEFAULT_FONT, color: "4A4A4A" })
      ]
    });
  }
};

export const generateWordDoc = async (
  metadata: DiaryMetadata,
  activities: ActivityEntry[],
  movements: MovementEntry[]
) => {
  const days = getFortnightDays(metadata.year, metadata.month, metadata.fortnight);
  const startDateStr = cleanText(formatDate(days[0]));
  const endDateStr = cleanText(formatDate(days[days.length - 1]));
  const nameVal = cleanText(metadata.name);
  const designation = cleanText(metadata.designation || 'System Administrator');
  const officeVal = cleanText(metadata.office);
  const submissionPlaceVal = cleanText(metadata.submissionPlace);
  const submissionDateVal = cleanText(metadata.submissionDate);

  const doc = new Document({
    compatabilityModeVersion: 12,
    compatibility: { version: 12 },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,  // A4 width (210 mm) in dxa
              height: 16838, // A4 height (297 mm) in dxa
              code: 9,       // A4 paper size code
            },
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Diary of Shri ${nameVal}, ${designation}`,
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: HEADER_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: officeVal,
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: HEADER_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `From ${startDateStr} to ${endDateStr}`,
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: HEADER_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),

          // Activities Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.AUTOFIT,
            margins: {
              top: 15,
              bottom: 15,
              left: 60,
              right: 60,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: "DATE", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER })],
                  }),
                  new TableCell({
                    width: { size: 85, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: "DETAILS", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER })],
                  }),
                ],
              }),
              ...activities.map(entry => {
                const lines = cleanText(entry.details || '').split('\n');
                return new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ spacing: { before: 10, after: 0 }, children: [new TextRun({ text: cleanText(entry.date), size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ spacing: { before: 0, after: 10 }, children: [new TextRun({ text: cleanText(entry.dayName), italics: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 85, type: WidthType.PERCENTAGE },
                      children: lines.map(line => new Paragraph({ 
                        spacing: { before: 10, after: 10 },
                        children: [new TextRun({ text: cleanText(line), size: DEFAULT_SIZE, font: DEFAULT_FONT })] 
                      })),
                    }),
                  ],
                });
              }),
            ],
          }),

          // Signature Section (Page 1)
          new Paragraph({ spacing: { before: 800 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({ children: [new TextRun({ text: `Date: ${submissionDateVal}`, font: DEFAULT_FONT, size: DEFAULT_SIZE })] }),
                                new Paragraph({ children: [new TextRun({ text: `Place: ${submissionPlaceVal}`, font: DEFAULT_FONT, size: DEFAULT_SIZE })] }),
                            ]
                        }),
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Yours faithfully", font: DEFAULT_FONT, size: DEFAULT_SIZE })] }),
                                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 400 }, children: [new TextRun({ text: nameVal, bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] }),
                                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: designation, bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] }),
                                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: officeVal, bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] }),
                            ]
                        })
                    ]
                })
            ]
          }),

          // Movement Table on New Page
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ 
            alignment: AlignmentType.CENTER, 
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: "MOVEMENTS", bold: true, underline: { type: UnderlineType.SINGLE }, font: DEFAULT_FONT, size: DEFAULT_SIZE })] 
          }),
           new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.AUTOFIT,
            margins: {
              top: 15,
              bottom: 15,
              left: 60,
              right: 60,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
               new TableRow({
                children: [
                  "DATE", "TIME", "FROM", "DATE", "TIME", "TO", "MODE", "KM"
                ].map((h, idx) => new TableCell({
                  width: { size: 0, type: WidthType.AUTO },
                  children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: h, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: (idx === 2 || idx === 5) ? AlignmentType.LEFT : AlignmentType.CENTER })],
                }))
              }),
              ...movements.map(m => new TableRow({
                children: [
                   cleanText(m.date), 
                   cleanText(to24hDot(m.fromTime)), 
                   cleanText(m.fromLocation), 
                   cleanText(m.toDate), 
                   cleanText(to24hDot(m.toTime)), 
                   cleanText(m.toLocation), 
                   cleanText(m.mode), 
                   cleanText(m.km)
                ].map((v, idx) => new TableCell({
                  width: { size: 0, type: WidthType.AUTO },
                  children: [new Paragraph({ spacing: { before: 5, after: 5 }, children: [new TextRun({ text: cleanText(v).toUpperCase(), size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: (idx === 2 || idx === 5) ? AlignmentType.LEFT : AlignmentType.CENTER })],
                }))
              }))
            ]
          }),

          // New Signature and Submission Section below Movements Table
          new Paragraph({ spacing: { before: 800 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: nameVal, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${designation},`, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${officeVal}.`, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),

          new Paragraph({ spacing: { before: 400 } }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: "Submitted to:", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: "The SPO’s Cuddalore Division Cuddalore-607001.", size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[metadata.month] || "June";
  const fnStr = metadata.fortnight === 'first' ? '1st FN' : '2nd FN';
  const fileName = `${monthName} ${fnStr} ${metadata.year}.docx`;
  saveAs(blob, fileName);
};

const numberToIndianWords = (num: number): string => {
  if (num === 0) return "Zero";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const helper = (n: number): string => {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + a[n % 10] : "");
      }
    }
    return str.trim();
  };

  let result = "";
  let temp = num;

  if (temp >= 10000000) { // Crore
    const crores = Math.floor(temp / 10000000);
    result += helper(crores) + " Crore ";
    temp %= 10000000;
  }
  if (temp >= 100000) { // Lakh
    const lakhs = Math.floor(temp / 100000);
    result += helper(lakhs) + " Lakh ";
    temp %= 100000;
  }
  if (temp >= 1000) { // Thousand
    const thousands = Math.floor(temp / 1000);
    result += helper(thousands) + " Thousand ";
    temp %= 1000;
  }
  if (temp > 0) {
    result += helper(temp);
  }

  return result.replace(/\s+/g, " ").trim();
};

// Helper to parse date string (DD.MM.YYYY, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY) into Date for Excel
export const parseDateToExcel = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. dd.MM.yyyy
  const dotParts = trimmed.split('.');
  if (dotParts.length === 3) {
    const d = parseInt(dotParts[0], 10);
    const m = parseInt(dotParts[1], 10);
    const y = parseInt(dotParts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    }
  }

  // 2. yyyy-MM-dd or dd-MM-yyyy
  const dashParts = trimmed.split('-');
  if (dashParts.length === 3) {
    if (dashParts[0].length === 4) {
      const y = parseInt(dashParts[0], 10);
      const m = parseInt(dashParts[1], 10);
      const d = parseInt(dashParts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      }
    } else {
      const d = parseInt(dashParts[0], 10);
      const m = parseInt(dashParts[1], 10);
      const y = parseInt(dashParts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      }
    }
  }

  // 3. dd/MM/yyyy or yyyy/MM/dd
  const slashParts = trimmed.split('/');
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      const y = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10);
      const d = parseInt(slashParts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      }
    } else {
      const d = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10);
      const y = parseInt(slashParts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      }
    }
  }

  return null;
};

// Helper to parse time string (HH:MM or HH.MM) into Excel time serial fraction (0.0 to 1.0)
export const parseTimeToExcelFraction = (timeStr?: string): number | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim().replace('.', ':');
  if (!clean) return null;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toLowerCase();

  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;

  if (h >= 0 && h < 24 && m >= 0 && m < 60) {
    return (h * 60 + m) / 1440;
  }
  return null;
};

export interface TACalculationData {
  sortedMovements: MovementEntry[];
  uniqueDates: string[];
  dateCalculations: { [date: string]: { food: string; purpose: string } };
  totalBikeKm: number;
  totalBusFare: number;
  totalFoodCharges: number;
  bikeCharges: number;
  totalAmount: number;
  netAmountClaimed: number;
  currencyWords: string;
  monthName: string;
  year: number;
  designation: string;
}

export const calculateTAMovementData = (
  metadata: DiaryMetadata,
  activities: ActivityEntry[],
  movements: MovementEntry[],
  serviceCalls?: ServiceCallReport[],
  attachedOffice: string = "Kurinjipadi S.O",
  officesDb: OfficeDatabaseEntry[] = []
): TACalculationData => {
  const designation = metadata.designation || 'System Administrator';

  // Parse time helper (returns minutes from midnight)
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.trim().split(':');
    const hs = parseInt(parts[0], 10) || 0;
    const ms = parseInt(parts[1], 10) || 0;
    return hs * 60 + ms;
  };

  // Parse date and time helper (returns epoch time for sorting)
  const parseDateAndTimeToMinutes = (dateStr: string, timeStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const parts = dateStr.trim().split('.');
    if (parts.length < 3) return 0;
    const d = parseInt(parts[0], 10) || 1;
    const mStr = parseInt(parts[1], 10) || 1;
    const y = parseInt(parts[2], 10) || 2026;
    const [h, min] = (timeStr || "00:00").trim().split(':').map(Number);
    return new Date(y, mStr - 1, d, h || 0, min || 0).getTime();
  };

  // Sort movements by date and then by fromTime to guarantee contiguous blocks
  const sortedMovements = [...movements].sort((a, b) => {
    const timeA = parseDateAndTimeToMinutes(a.date, a.fromTime);
    const timeB = parseDateAndTimeToMinutes(b.date, b.fromTime);
    return timeA - timeB;
  });

  // Calculate food (daily allowance) and purpose of visit per unique date
  const dateCalculations: { [date: string]: { food: string; purpose: string } } = {};
  const uniqueDates = Array.from(new Set(sortedMovements.map(m => (m.date || '').trim()).filter(Boolean)));

  for (const uDate of uniqueDates) {
    const legs = sortedMovements.filter(m => (m.date || '').trim() === uDate);
    
    let minTimeMinutes = Infinity;
    let maxTimeMinutes = -Infinity;

    for (const leg of legs) {
      const fromMin = timeToMinutes(leg.fromTime);
      const toMin = timeToMinutes(leg.toTime);
      
      if (fromMin < minTimeMinutes) minTimeMinutes = fromMin;
      if (toMin > maxTimeMinutes) maxTimeMinutes = toMin;
    }

    const durationMinutes = maxTimeMinutes - minTimeMinutes;
    const hours = durationMinutes / 60;

    let foodAmount = "437.5"; // default fallback if there's an error
    if (durationMinutes > 0 && minTimeMinutes < Infinity && maxTimeMinutes > -Infinity) {
      if (hours < 6) {
        foodAmount = "187.5";
      } else if (hours < 12) {
        foodAmount = "437.5";
      } else {
        foodAmount = "625";
      }
    }

    // 8 km rule: if all offices visited from attached office are <= 8 km, food allowance is 0
    const matchingActivity = activities.find(a => (a.date || '').trim() === uDate);
    const visitedOffices = matchingActivity
      ? matchingActivity.visits
          .map(v => v.officeName)
          .filter(name => name && name.toLowerCase().replace(/\s+/g, ' ').trim() !== attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim())
      : [];

    const visitedFromLegs = legs
      .flatMap(l => [l.fromLocation, l.toLocation])
      .map(loc => loc ? loc.toUpperCase().trim() : "")
      .filter(loc => loc && loc !== attachedOffice.toUpperCase().trim() && loc !== "PANRUTI BUS STAND" && loc !== "CUDDALORE BUS STAND");

    const uniqueVisited = Array.from(new Set([
      ...visitedOffices.map(o => o.toUpperCase().trim()),
      ...visitedFromLegs
    ]));

    if (uniqueVisited.length > 0) {
      let anyAbove8 = false;
      for (const offName of uniqueVisited) {
        const cleanOffice = offName.toLowerCase().replace(/\s+/g, ' ').trim();
        const cleanAttached = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
        const matched = officesDb.find(o => {
          const fOff = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
          const tOff = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
          return (fOff === cleanAttached && tOff === cleanOffice) || (fOff === cleanOffice && tOff === cleanAttached);
        });
        const isBike = matchingActivity?.transportMode === 'Bike';
        const dist = matched ? (isBike ? matched.distanceBike : matched.distanceBus) : 0;
        if (dist > 8) {
          anyAbove8 = true;
          break;
        }
      }
      if (!anyAbove8) {
        foodAmount = "0";
      }
    } else {
      foodAmount = "0";
    }

    // Purpose of visit calculation: use details of problem reported in SCR on this date if available, or fallback to sequential office locations
    const matchingCalls = serviceCalls ? serviceCalls.filter(sc => (sc.date || '').trim() === uDate) : [];
    
    let purposeText = "";

    if (matchingCalls.length > 0) {
      const problemsReported = matchingCalls.flatMap(sc => 
        (sc.problems || []).map(p => p.reported?.trim())
      ).filter(Boolean);
      
      if (problemsReported.length > 0) {
        purposeText = problemsReported.join(", ");
      }
    }

    if (!purposeText) {
      if (matchingActivity) {
        const distinctIssues = (matchingActivity.visits || [])
          .map(v => v.issues?.trim())
          .filter(issue => issue && issue !== "");
        
        if (distinctIssues.length > 0) {
          purposeText = distinctIssues.join(", ");
        } else {
          const offices = (matchingActivity.visits || [])
            .map(v => v.officeName?.trim())
            .filter(o => o && o !== "");
          if (offices.length > 0) {
            purposeText = "Verification / Routine Inspection at " + offices.join(", ");
          } else {
            purposeText = "Routine inspection / maintenance";
          }
        }
      } else {
        purposeText = "Routine inspection / maintenance";
      }
    }

    purposeText = toSentenceCase(purposeText);

    dateCalculations[uDate] = {
      food: foodAmount,
      purpose: purposeText
    };
  }

  const totalBikeKm = sortedMovements
    .filter(m => (m.mode || '').toUpperCase() === 'BIKE')
    .reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);

  let totalBusFare = 0;
  sortedMovements.forEach(m => {
    if ((m.mode || '').toUpperCase() === 'BUS') {
      const kmVal = parseFloat(m.km) || 0;
      let fare = 0;
      if (m.fare !== undefined && m.fare !== null && m.fare !== '') {
        const customFare = parseFloat(m.fare);
        if (!isNaN(customFare)) {
          fare = customFare;
        }
      } else if (kmVal > 0) {
        if (kmVal >= 30) {
          fare = 30;
        } else if (kmVal >= 20) {
          fare = 20;
        } else if (kmVal >= 10) {
          fare = 15;
        } else {
          fare = 10;
        }
      }
      totalBusFare += fare;
    }
  });

  let totalFoodCharges = 0;
  for (const uDate in dateCalculations) {
    totalFoodCharges += parseFloat(dateCalculations[uDate].food) || 0;
  }

  const bikeCharges = Math.min(totalBikeKm, 200) * 15;
  const totalAmount = bikeCharges + totalBusFare + totalFoodCharges;
  const netAmountClaimed = Math.round(totalAmount);
  const currencyWords = numberToIndianWords(netAmountClaimed);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[metadata.month] || "June";
  const year = metadata.year || 2026;

  return {
    sortedMovements,
    uniqueDates,
    dateCalculations,
    totalBikeKm,
    totalBusFare,
    totalFoodCharges,
    bikeCharges,
    totalAmount,
    netAmountClaimed,
    currencyWords,
    monthName,
    year,
    designation
  };
};

export const generateTACalculationsExcel = async (
  metadata: DiaryMetadata,
  activities: ActivityEntry[],
  movements: MovementEntry[],
  serviceCalls?: ServiceCallReport[],
  attachedOffice: string = "Kurinjipadi S.O",
  officesDb: OfficeDatabaseEntry[] = []
) => {
  const {
    sortedMovements,
    uniqueDates,
    dateCalculations,
    totalBikeKm,
    totalBusFare,
    totalFoodCharges,
    bikeCharges,
    totalAmount,
    netAmountClaimed,
    currencyWords,
    monthName,
    year,
    designation
  } = calculateTAMovementData(metadata, activities, movements, serviceCalls, attachedOffice, officesDb);

  // Initialize Excel Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = metadata.name || 'SA Diary Tracker';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create TA Calculation Worksheet with full A4 Portrait print settings
  const worksheet = workbook.addWorksheet('TA Calculation', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait', // Print ready in A4 Portrait mode
      fitToPage: true,
      fitToWidth: 1, // Fit all 11 columns on 1 page width
      fitToHeight: 0, // Automatic multi-page flow vertically without shrinking
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.35,
        header: 0.15,
        footer: 0.15,
      },
      horizontalCentered: true,
      verticalCentered: false,
      printTitlesRow: '3:3' // Repeat table header on every printed page
    },
    views: [{ showGridLines: true }]
  });

  // Calculate content-aware column widths for proper auto-spacing on A4 Portrait
  const maxFromLen = Math.max(4, ...sortedMovements.map(m => (cleanText(m.fromLocation) || '').length));
  const maxToLen = Math.max(2, ...sortedMovements.map(m => (cleanText(m.toLocation) || '').length));
  const maxModeLen = Math.max(4, ...sortedMovements.map(m => (cleanText(m.mode) || '').length));

  worksheet.columns = [
    { key: 'colA', width: 11 },                                           // Col 1: Date (dd.mm.yyyy)
    { key: 'colB', width: 7.5 },                                          // Col 2: Time (hh:mm)
    { key: 'colC', width: Math.min(18, Math.max(13, maxFromLen + 1)) },  // Col 3: From (auto-spaced)
    { key: 'colD', width: 11 },                                           // Col 4: Date (dd.mm.yyyy)
    { key: 'colE', width: 7.5 },                                          // Col 5: Time (hh:mm)
    { key: 'colF', width: Math.min(18, Math.max(13, maxToLen + 1)) },    // Col 6: To (auto-spaced)
    { key: 'colG', width: Math.max(6.5, maxModeLen + 1) },                // Col 7: Mode
    { key: 'colH', width: 5.5 },                                          // Col 8: Km
    { key: 'colI', width: 6.5 },                                          // Col 9: Fare
    { key: 'colJ', width: 7.5 },                                          // Col 10: Food (e.g. 437.5)
    { key: 'colK', width: 25 },                                           // Col 11: Purpose of visit (auto-expandable)
  ];

  // Thin Black Border definition
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // Row 1: Title Header
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'TA Calculations';
  titleCell.font = {
    name: 'Calibri',
    size: 16,
    bold: true,
    underline: true,
    color: { argb: 'FF000000' }
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };
  worksheet.getRow(1).height = 30;

  // Row 2: Blank Spacing
  worksheet.getRow(2).height = 8;

  // Row 3: Table Header Row
  const headers = [
    'Date', 'Time', 'From', 'Date', 'Time', 'To', 'Mode', 'Km', 'Fare', 'Food', 'Purpose of visit'
  ];
  const headerRow = worksheet.getRow(3);
  headerRow.height = 24;

  headers.forEach((h, idx) => {
    const colNum = idx + 1;
    const cell = headerRow.getCell(colNum);
    cell.value = h;
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FF000000' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F4F7' }
    };
    cell.border = thinBorder;
    cell.alignment = {
      horizontal: (colNum === 3 || colNum === 6 || colNum === 11) ? 'left' : 'center',
      vertical: 'middle',
      wrapText: true
    };
  });

  // Helper to accurately calculate wrapped text lines for auto-expanding Purpose of Visit
  const estimateWrappedLines = (text: string, charsPerLine = 24): number => {
    if (!text) return 1;
    const paragraphs = text.split('\n');
    let totalLines = 0;
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        totalLines += 1;
        continue;
      }
      const words = trimmed.split(/\s+/);
      let currentLen = 0;
      let paraLines = 1;
      for (const w of words) {
        if (currentLen === 0) {
          currentLen = w.length;
        } else if (currentLen + 1 + w.length <= charsPerLine) {
          currentLen += 1 + w.length;
        } else {
          paraLines++;
          currentLen = w.length;
        }
      }
      totalLines += paraLines;
    }
    return Math.max(1, totalLines);
  };

  let currentRowIdx = 4;
  const firstDataRow = currentRowIdx;

  // Group sorted movements by unique date to handle merged Food & Purpose cells
  for (const uDate of uniqueDates) {
    const legs = sortedMovements.filter(m => (m.date || '').trim() === uDate);
    const startRow = currentRowIdx;
    const endRow = currentRowIdx + legs.length - 1;
    const calc = dateCalculations[uDate] || { food: "437.5", purpose: "Routine inspection / maintenance" };

    // Calculate vertical height required for Purpose of visit to auto-expand cleanly as per content
    const purposeText = cleanText(calc.purpose) || 'Routine inspection / maintenance';
    const purposeLines = estimateWrappedLines(purposeText, 24);
    const totalPurposeHeightNeeded = Math.max(22, purposeLines * 15 + 6);

    // Calculate baseline height for each leg considering location wrap
    const legHeights: number[] = [];
    legs.forEach((m) => {
      const fromLen = (cleanText(m.fromLocation) || '').length;
      const toLen = (cleanText(m.toLocation) || '').length;
      const locLines = Math.max(Math.ceil(fromLen / 15), Math.ceil(toLen / 15), 1);
      legHeights.push(Math.max(20, locLines * 15 + 4));
    });

    const baseSumHeight = legHeights.reduce((sum, h) => sum + h, 0);
    const extraNeeded = Math.max(0, totalPurposeHeightNeeded - baseSumHeight);
    const extraPerLeg = Math.ceil(extraNeeded / legs.length);

    legs.forEach((m, legIdx) => {
      const row = worksheet.getRow(currentRowIdx);
      // Row height auto-expands cleanly to fit the content of Purpose of visit and locations
      row.height = legHeights[legIdx] + extraPerLeg;

      const kmVal = parseFloat(m.km) || 0;
      let fareText = "";
      if ((m.mode || '').toUpperCase() === 'BUS') {
        if (m.fare !== undefined && m.fare !== null && m.fare !== '') {
          const customFare = parseFloat(m.fare);
          if (!isNaN(customFare)) {
            fareText = customFare.toString();
          }
        } else if (kmVal > 0) {
          if (kmVal >= 30) {
            fareText = "30";
          } else if (kmVal >= 20) {
            fareText = "20";
          } else if (kmVal >= 10) {
            fareText = "15";
          } else {
            fareText = "10";
          }
        }
      }

      // Column values
      const cellA = row.getCell(1);
      const fromDateObj = parseDateToExcel(m.date);
      if (fromDateObj) {
        cellA.value = fromDateObj;
        cellA.numFmt = 'dd.mm.yyyy';
      } else {
        cellA.value = cleanText(m.date);
      }
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellB = row.getCell(2);
      const fromTimeFrac = parseTimeToExcelFraction(m.fromTime);
      if (fromTimeFrac !== null) {
        cellB.value = fromTimeFrac;
        cellB.numFmt = 'hh:mm';
      } else {
        cellB.value = cleanText(m.fromTime);
      }
      cellB.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellC = row.getCell(3);
      cellC.value = cleanText(m.fromLocation).toUpperCase();
      cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      const cellD = row.getCell(4);
      const toDateObj = parseDateToExcel(m.toDate || m.date);
      if (toDateObj) {
        cellD.value = toDateObj;
        cellD.numFmt = 'dd.mm.yyyy';
      } else {
        cellD.value = cleanText(m.toDate || m.date);
      }
      cellD.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellE = row.getCell(5);
      const toTimeFrac = parseTimeToExcelFraction(m.toTime);
      if (toTimeFrac !== null) {
        cellE.value = toTimeFrac;
        cellE.numFmt = 'hh:mm';
      } else {
        cellE.value = cleanText(m.toTime);
      }
      cellE.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellF = row.getCell(6);
      cellF.value = cleanText(m.toLocation).toUpperCase();
      cellF.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Col 7: Mode - number format without decimal point if numeric, else text
      const cellG = row.getCell(7);
      const rawMode = cleanText(m.mode).trim();
      const numMode = parseFloat(rawMode);
      if (rawMode !== '' && !isNaN(numMode) && !isNaN(Number(rawMode))) {
        cellG.value = Math.round(numMode);
        cellG.numFmt = '0';
      } else {
        cellG.value = rawMode.toUpperCase();
      }
      cellG.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col 8: Km - exact number format without rounding off
      const cellH = row.getCell(8);
      const parsedKm = parseFloat(m.km);
      if (!isNaN(parsedKm) && parsedKm > 0) {
        cellH.value = parsedKm;
        cellH.numFmt = Number.isInteger(parsedKm) ? '0' : '0.##';
      } else if (parsedKm === 0) {
        cellH.value = 0;
        cellH.numFmt = '0';
      } else {
        cellH.value = '';
      }
      cellH.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col 9: Fare - number format without decimal point for standard bus fares
      const cellI = row.getCell(9);
      const parsedFare = parseFloat(fareText);
      if (!isNaN(parsedFare) && parsedFare > 0) {
        cellI.value = Math.round(parsedFare);
        cellI.numFmt = '0';
      } else if (parsedFare === 0) {
        cellI.value = 0;
        cellI.numFmt = '0';
      } else {
        cellI.value = '';
      }
      cellI.alignment = { horizontal: 'center', vertical: 'middle' };

      // Apply standard formatting and borders to all 11 columns for this row
      for (let c = 1; c <= 11; c++) {
        const cCell = row.getCell(c);
        cCell.border = thinBorder;
        cCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
      }

      currentRowIdx++;
    });

    const parsedFood = parseFloat(calc.food);
    const validFood = !isNaN(parsedFood) && parsedFood > 0 ? parsedFood : 0;

    // Merge Food (Col 10) and Purpose of visit (Col 11) for multiple legs on the same date
    // Food formatted with single decimal point ('0.0') as requested
    if (startRow === endRow) {
      const foodCell = worksheet.getCell(startRow, 10);
      foodCell.value = validFood;
      foodCell.numFmt = '0.0';
      foodCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const purposeCell = worksheet.getCell(startRow, 11);
      purposeCell.value = cleanText(calc.purpose);
      purposeCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    } else {
      worksheet.mergeCells(startRow, 10, endRow, 10);
      const foodCell = worksheet.getCell(startRow, 10);
      foodCell.value = validFood;
      foodCell.numFmt = '0.0';
      foodCell.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(startRow, 11, endRow, 11);
      const purposeCell = worksheet.getCell(startRow, 11);
      purposeCell.value = cleanText(calc.purpose);
      purposeCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Re-apply borders and number formats on all cells in the merged span so gridlines print flawlessly
      for (let r = startRow; r <= endRow; r++) {
        worksheet.getCell(r, 10).border = thinBorder;
        worksheet.getCell(r, 10).numFmt = '0.0';
        worksheet.getCell(r, 11).border = thinBorder;
      }
    }
  }

  const lastDataRow = Math.max(firstDataRow, currentRowIdx - 1);

  // Blank spacing row after data table
  worksheet.getRow(currentRowIdx).height = 10;
  currentRowIdx++;

  // Certificate 1
  worksheet.mergeCells(`A${currentRowIdx}:K${currentRowIdx}`);
  const cert1 = worksheet.getCell(`A${currentRowIdx}`);
  cert1.value = 'Certified that the amount charged as food bill was actually incurred by me.';
  cert1.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF000000' } };
  cert1.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRowIdx).height = 18;
  currentRowIdx++;

  // Certificate 2
  worksheet.mergeCells(`A${currentRowIdx}:K${currentRowIdx}`);
  const cert2 = worksheet.getCell(`A${currentRowIdx}`);
  cert2.value = 'It is also certified that vouchers were not given by the vendors for the food taken.';
  cert2.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF000000' } };
  cert2.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRowIdx).height = 18;
  currentRowIdx++;

  // Blank spacing row before calculation summary
  worksheet.getRow(currentRowIdx).height = 8;
  currentRowIdx++;

  // Summary row indices for formulas
  const rowBike = currentRowIdx;
  const rowBus = currentRowIdx + 1;
  const rowFood = currentRowIdx + 2;
  const rowLocal = currentRowIdx + 3;
  const rowLodge = currentRowIdx + 4;
  const rowTotal = currentRowIdx + 5;
  const rowAdv = currentRowIdx + 6;
  const rowNet = currentRowIdx + 7;

  const formattedTotalBikeKmExcel = Number.isInteger(totalBikeKm)
    ? totalBikeKm.toString()
    : parseFloat(totalBikeKm.toFixed(2)).toString();

  // Summary rows using real Excel formulas and number formats
  const summaryRows = [
    {
      desc: totalBikeKm > 200 
        ? `Total No. of Kilometers Utilized through Two Wheelers ${formattedTotalBikeKmExcel} km (Only 200 km charged) x Rs.15`
        : `Total No. of Kilometers Utilized through Two Wheelers ${formattedTotalBikeKmExcel} x Rs.15`,
      val: {
        formula: `MIN(SUMIFS(H${firstDataRow}:H${lastDataRow}, G${firstDataRow}:G${lastDataRow}, "BIKE"), 200) * 15`,
        result: bikeCharges
      },
      numFmt: '"Rs. "#,##0.00;"Rs. "-#,##0.00;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Total Bus Fare paid',
      val: {
        formula: `SUM(I${firstDataRow}:I${lastDataRow})`,
        result: totalBusFare
      },
      numFmt: '"Rs. "#,##0.00;"Rs. "-#,##0.00;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Amount of Food charges claimed',
      val: {
        formula: `SUM(J${firstDataRow}:J${lastDataRow})`,
        result: totalFoodCharges
      },
      numFmt: '"Rs. "#,##0.0;"Rs. "-#,##0.0;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Total amount of locally journey performed',
      val: 0,
      numFmt: '"Rs. "#,##0.00;"Rs. "-#,##0.00;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Total Amount for Lodging',
      val: 0,
      numFmt: '"Rs. "#,##0.00;"Rs. "-#,##0.00;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Total',
      val: {
        formula: `SUM(I${rowBike}:I${rowLodge})`,
        result: totalAmount
      },
      numFmt: '"Rs. "#,##0.00;"Rs. "-#,##0.00;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Less Advance Taken',
      val: 0,
      numFmt: '"Rs. "#,##0.00;"Rs. "-#,##0.00;"Rs. Nil"',
      bold: false
    },
    {
      desc: 'Net Amount Claimed',
      val: {
        formula: `ROUND(I${rowTotal} - I${rowAdv}, 0)`,
        result: netAmountClaimed
      },
      numFmt: '"Rs. "#,##0;"Rs. "-#,##0;"Rs. Nil"',
      bold: true
    }
  ];

  summaryRows.forEach(item => {
    worksheet.mergeCells(`A${currentRowIdx}:H${currentRowIdx}`);
    const descCell = worksheet.getCell(`A${currentRowIdx}`);
    descCell.value = item.desc;
    descCell.font = { name: 'Calibri', size: 10.5, bold: item.bold, color: { argb: 'FF000000' } };
    descCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.mergeCells(`I${currentRowIdx}:K${currentRowIdx}`);
    const valCell = worksheet.getCell(`I${currentRowIdx}`);
    valCell.value = item.val;
    valCell.numFmt = item.numFmt;
    valCell.font = { name: 'Calibri', size: 10.5, bold: item.bold, color: { argb: 'FF000000' } };
    valCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.getRow(currentRowIdx).height = 18;
    currentRowIdx++;
  });

  // Amount in Words
  worksheet.mergeCells(`A${currentRowIdx}:K${currentRowIdx}`);
  const wordsCell = worksheet.getCell(`A${currentRowIdx}`);
  wordsCell.value = `(Rs. ${cleanText(currencyWords)} only)`;
  wordsCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };
  wordsCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(currentRowIdx).height = 22;
  currentRowIdx++;

  // Spacing before signatures
  worksheet.getRow(currentRowIdx).height = 20;
  currentRowIdx++;

  // Signatures Row 1
  worksheet.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const subToCell = worksheet.getCell(`A${currentRowIdx}`);
  subToCell.value = 'Submitted to:';
  subToCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };
  subToCell.alignment = { horizontal: 'left', vertical: 'middle' };

  worksheet.mergeCells(`G${currentRowIdx}:K${currentRowIdx}`);
  const nameCell = worksheet.getCell(`G${currentRowIdx}`);
  nameCell.value = cleanText(metadata.name);
  nameCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };
  nameCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(currentRowIdx).height = 18;
  currentRowIdx++;

  // Signatures Row 2
  worksheet.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const spoCell = worksheet.getCell(`A${currentRowIdx}`);
  spoCell.value = 'The SPO’s Cuddalore Division Cuddalore-607001.';
  spoCell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF000000' } };
  spoCell.alignment = { horizontal: 'left', vertical: 'middle' };

  worksheet.mergeCells(`G${currentRowIdx}:K${currentRowIdx}`);
  const desigCell = worksheet.getCell(`G${currentRowIdx}`);
  desigCell.value = `${cleanText(designation)},`;
  desigCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };
  desigCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(currentRowIdx).height = 18;
  currentRowIdx++;

  // Signatures Row 3
  worksheet.mergeCells(`G${currentRowIdx}:K${currentRowIdx}`);
  const offCell = worksheet.getCell(`G${currentRowIdx}`);
  offCell.value = `${cleanText(metadata.office)}.`;
  offCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };
  offCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(currentRowIdx).height = 18;

  // Save Excel file
  const fileName = `TA Calculation-${monthName} ${year}.xlsx`;
  await saveAsExcel(workbook, fileName);
};

export const generateTACalculationsDocx = async (
  metadata: DiaryMetadata,
  activities: ActivityEntry[],
  movements: MovementEntry[],
  serviceCalls?: ServiceCallReport[],
  attachedOffice: string = "Kurinjipadi S.O",
  officesDb: OfficeDatabaseEntry[] = []
) => {
  const {
    sortedMovements,
    uniqueDates,
    dateCalculations,
    totalBikeKm,
    totalBusFare,
    totalFoodCharges,
    bikeCharges,
    totalAmount,
    netAmountClaimed,
    currencyWords,
    monthName,
    year,
    designation
  } = calculateTAMovementData(metadata, activities, movements, serviceCalls, attachedOffice, officesDb);

  const colWidths = [8, 6, 14, 8, 6, 14, 6, 5, 5, 7, 21];
  const tableHeaders = [
    'Date', 'Time', 'From', 'Date', 'Time', 'To', 'Mode', 'Km', 'Fare', 'Food', 'Purpose of visit'
  ];

  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  };

  // Header Row
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: tableHeaders.map((h, idx) => new TableCell({
        width: { size: colWidths[idx], type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: (idx === 2 || idx === 5 || idx === 10) ? AlignmentType.LEFT : AlignmentType.CENTER,
            spacing: { before: 50, after: 50 },
            children: [new TextRun({ text: h, bold: true, size: 16, font: DEFAULT_FONT })]
          })
        ]
      }))
    })
  ];

  // Data Rows
  for (const uDate of uniqueDates) {
    const legs = sortedMovements.filter(m => (m.date || '').trim() === uDate);
    const calc = dateCalculations[uDate] || { food: "437.5", purpose: "Routine inspection / maintenance" };

    for (let legIdx = 0; legIdx < legs.length; legIdx++) {
      const m = legs[legIdx];
      const kmVal = parseFloat(m.km) || 0;
      let fareText = "";
      if ((m.mode || '').toUpperCase() === 'BUS') {
        if (m.fare !== undefined && m.fare !== null && m.fare !== '') {
          const customFare = parseFloat(m.fare);
          if (!isNaN(customFare)) {
            fareText = customFare.toString();
          }
        } else if (kmVal > 0) {
          if (kmVal >= 30) {
            fareText = "30";
          } else if (kmVal >= 20) {
            fareText = "20";
          } else if (kmVal >= 10) {
            fareText = "15";
          } else {
            fareText = "10";
          }
        }
      }

      const parsedKm = parseFloat(m.km);
      const kmText = m.km 
        ? (!isNaN(parsedKm) 
            ? (Number.isInteger(parsedKm) ? parsedKm.toString() : parseFloat(parsedKm.toFixed(2)).toString()) 
            : cleanText(m.km)) 
        : '';
      const rawMode = cleanText(m.mode).trim();
      const numMode = parseFloat(rawMode);
      const modeText = (rawMode !== '' && !isNaN(numMode) && !isNaN(Number(rawMode)))
        ? Math.round(numMode).toString()
        : rawMode.toUpperCase();

      const parsedFoodVal = parseFloat(calc.food);
      const foodText = !isNaN(parsedFoodVal) ? parsedFoodVal.toFixed(1) : (calc.food || '0.0');

      const cells: TableCell[] = [
        // Col 1: Date
        new TableCell({
          width: { size: colWidths[0], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(m.date), size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 2: From Time
        new TableCell({
          width: { size: colWidths[1], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(to24hDot(m.fromTime)), size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 3: From Location
        new TableCell({
          width: { size: colWidths[2], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(m.fromLocation).toUpperCase(), size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 4: To Date
        new TableCell({
          width: { size: colWidths[3], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(m.toDate || m.date), size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 5: To Time
        new TableCell({
          width: { size: colWidths[4], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(to24hDot(m.toTime)), size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 6: To Location
        new TableCell({
          width: { size: colWidths[5], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(m.toLocation).toUpperCase(), size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 7: Mode
        new TableCell({
          width: { size: colWidths[6], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: modeText, size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 8: Km
        new TableCell({
          width: { size: colWidths[7], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: kmText, size: 16, font: DEFAULT_FONT })] })]
        }),
        // Col 9: Fare
        new TableCell({
          width: { size: colWidths[8], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: fareText, size: 16, font: DEFAULT_FONT })] })]
        }),
      ];

      // Col 10: Food & Col 11: Purpose
      if (legs.length === 1) {
        cells.push(
          new TableCell({
            width: { size: colWidths[9], type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: foodText, size: 16, font: DEFAULT_FONT })] })]
          }),
          new TableCell({
            width: { size: colWidths[10], type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(calc.purpose), size: 16, font: DEFAULT_FONT })] })]
          })
        );
      } else {
        if (legIdx === 0) {
          cells.push(
            new TableCell({
              width: { size: colWidths[9], type: WidthType.PERCENTAGE },
              verticalMerge: VerticalMergeType.RESTART,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: foodText, size: 16, font: DEFAULT_FONT })] })]
            }),
            new TableCell({
              width: { size: colWidths[10], type: WidthType.PERCENTAGE },
              verticalMerge: VerticalMergeType.RESTART,
              children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: cleanText(calc.purpose), size: 16, font: DEFAULT_FONT })] })]
            })
          );
        } else {
          cells.push(
            new TableCell({
              width: { size: colWidths[9], type: WidthType.PERCENTAGE },
              verticalMerge: VerticalMergeType.CONTINUE,
              children: [new Paragraph({ children: [] })]
            }),
            new TableCell({
              width: { size: colWidths[10], type: WidthType.PERCENTAGE },
              verticalMerge: VerticalMergeType.CONTINUE,
              children: [new Paragraph({ children: [] })]
            })
          );
        }
      }

      tableRows.push(
        new TableRow({
          children: cells
        })
      );
    }
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: tableRows
  });

  const formattedTotalBikeKmDoc = Number.isInteger(totalBikeKm)
    ? totalBikeKm.toString()
    : parseFloat(totalBikeKm.toFixed(2)).toString();

  // Summary breakdown
  const summaryRowsData = [
    {
      desc: totalBikeKm > 200 
        ? `Total No. of Kilometers Utilized through Two Wheelers ${formattedTotalBikeKmDoc} km (Only 200 km charged) x Rs.15`
        : `Total No. of Kilometers Utilized through Two Wheelers ${formattedTotalBikeKmDoc} x Rs.15`,
      val: `Rs. ${bikeCharges > 0 ? bikeCharges.toFixed(2) : 'Nil'}`,
      bold: false
    },
    {
      desc: 'Total Bus Fare paid',
      val: `Rs. ${totalBusFare > 0 ? totalBusFare.toFixed(2) : 'Nil'}`,
      bold: false
    },
    {
      desc: 'Amount of Food charges claimed',
      val: `Rs. ${totalFoodCharges > 0 ? totalFoodCharges.toFixed(2) : 'Nil'}`,
      bold: false
    },
    {
      desc: 'Total amount of locally journey performed',
      val: 'Rs. Nil',
      bold: false
    },
    {
      desc: 'Total Amount for Lodging',
      val: 'Rs. Nil',
      bold: false
    },
    {
      desc: 'Total',
      val: `Rs. ${totalAmount > 0 ? totalAmount.toFixed(2) : 'Nil'}`,
      bold: false
    },
    {
      desc: 'Less Advance Taken',
      val: 'Rs. Nil',
      bold: false
    },
    {
      desc: 'Net Amount Claimed',
      val: `Rs. ${netAmountClaimed > 0 ? netAmountClaimed.toFixed(2) : 'Nil'}`,
      bold: true
    }
  ];

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: summaryRowsData.map(item => new TableRow({
      children: [
        new TableCell({
          width: { size: 78, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          children: [
            new Paragraph({
              spacing: { before: 25, after: 25 },
              children: [new TextRun({ text: item.desc, bold: item.bold, size: 18, font: DEFAULT_FONT })]
            })
          ]
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 25, after: 25 },
              children: [new TextRun({ text: item.val, bold: item.bold, size: 18, font: DEFAULT_FONT })]
            })
          ]
        })
      ]
    }))
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 500,
              bottom: 500,
              left: 500,
              right: 500,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 160 },
            children: [
              new TextRun({
                text: "TA Calculations",
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: 24,
                font: DEFAULT_FONT
              })
            ]
          }),

          // Data Table
          table,

          // Spacing
          new Paragraph({ spacing: { before: 120, after: 40 }, children: [] }),

          // Certificates
          new Paragraph({
            spacing: { before: 40, after: 40, line: 260 },
            children: [
              new TextRun({
                text: "Certified that the amount charged as food bill was actually incurred by me.",
                size: 18,
                font: DEFAULT_FONT
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 40, after: 120, line: 260 },
            children: [
              new TextRun({
                text: "It is also certified that vouchers were not given by the vendors for the food taken.",
                size: 18,
                font: DEFAULT_FONT
              })
            ]
          }),

          // Summary Section
          summaryTable,

          // Amount in words
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 60, after: 140 },
            children: [
              new TextRun({
                text: `(Rs. ${cleanText(currencyWords)} only)`,
                bold: true,
                size: 18,
                font: DEFAULT_FONT
              })
            ]
          }),

          // Signature section
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({
                        spacing: { before: 180, after: 20 },
                        children: [new TextRun({ text: "To", bold: true, size: 18, font: DEFAULT_FONT })]
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: "The SPO’s Cuddalore Division Cuddalore-607001.", size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 180, after: 20 },
                        children: [new TextRun({ text: cleanText(metadata.name), bold: true, size: 18, font: DEFAULT_FONT })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: `${cleanText(designation)},`, bold: true, size: 18, font: DEFAULT_FONT })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: `${cleanText(metadata.office || attachedOffice)}.`, bold: true, size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `TA Calculation-${monthName} ${year}.docx`;
  await saveAs(blob, fileName);
};

export const generateTACalculationsDoc = async (
  metadata: DiaryMetadata,
  activities: ActivityEntry[],
  movements: MovementEntry[],
  serviceCalls?: ServiceCallReport[],
  attachedOffice: string = "Kurinjipadi S.O",
  officesDb: OfficeDatabaseEntry[] = [],
  format: 'excel' | 'word' = 'excel'
) => {
  if (format === 'word') {
    return generateTACalculationsDocx(metadata, activities, movements, serviceCalls, attachedOffice, officesDb);
  }
  return generateTACalculationsExcel(metadata, activities, movements, serviceCalls, attachedOffice, officesDb);
};

export function toSentenceCase(text: string): string {
  if (!text) return '';
  const cleaned = cleanText(text);
  const trimmed = cleaned.trim();
  if (!trimmed) return '';

  let lower = trimmed.toLowerCase();

  const sentenceCased = lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, char) => {
    return separator + char.toUpperCase();
  });

  return sentenceCased
    .replace(/\bho\b/gi, 'HO')
    .replace(/\bso\b/gi, 'SO')
    .replace(/\bspm\b/gi, 'SPM')
    .replace(/\bpm\b/gi, 'PM')
    .replace(/\baspm\b/gi, 'ASPM')
    .replace(/\bbpm\b/gi, 'BPM')
    .replace(/\bnsp\b/gi, 'NSP')
    .replace(/\bpc\b/gi, 'PC')
    .replace(/\bip\b/gi, 'IP')
    .replace(/\bxml\b/gi, 'XML')
    .replace(/\bco\b/gi, 'CO')
    .replace(/\bbo\b/gi, 'BO')
    .replace(/\bups\b/gi, 'UPS')
    .replace(/\bcpu\b/gi, 'CPU')
    .replace(/\blan\b/gi, 'LAN')
    .replace(/\bwan\b/gi, 'WAN')
    .replace(/\busb\b/gi, 'USB')
    .replace(/\bjava\b/gi, 'Java')
    .replace(/\bhelios\b/gi, 'Helios')
    .replace(/\bfinacle\b/gi, 'Finacle');
}

export function ensureHrsDot(val: string): string {
  const cleaned = cleanText(val || "").trim();
  if (!cleaned) return "";
  if (/hrs\.?$/i.test(cleaned)) {
    return cleaned.replace(/\s*hrs\.?$/i, " hrs.");
  }
  return cleaned;
}

const createSpacerParagraph = (before: number, after: number) => {
  return new Paragraph({
    spacing: { before: Math.round(before), after: Math.round(after) },
    children: [new TextRun({ text: " ", font: "Calibri" })]
  });
};

export const compileCopyChildrenForReport = (
  label: string,
  metadata: DiaryMetadata,
  headquarters: string,
  report: ServiceCallReport
) => {
  const division = cleanText(report.divisionName || "Cuddalore Division");
  const headerDivision = cleanText(division);

  const activeProblems = (report.problems || []).filter(p => (p.reported || "").trim() || (p.actionTaken || "").trim());
  
  // Make mutable copies of problems and report fields so we can truncate them if they exceed the 1-page budget
  const problemsToRender = activeProblems.length > 0 
    ? activeProblems.map(p => ({ 
        reported: p.reported || "", 
        actionTaken: p.actionTaken || "", 
        followUp: p.followUp || "" 
      }))
    : [{ reported: "", actionTaken: "", followUp: "" }];

  const finalReport = {
    ...report,
    replacementOfSpares: report.replacementOfSpares || "",
    amountOfSpares: report.amountOfSpares || "",
    otherIssues: report.otherIssues || ""
  };

  const lerp = (minVal: number, maxVal: number, scale: number): number => {
    return Math.round(minVal + (maxVal - minVal) * Math.min(1.2, Math.max(0, scale)));
  };

  const estimateHeightWithSpacings = (
    scale: number,
    s_propSpaceVertical: number,
    s_probHeaderSpaceBeforeAfter: number,
    s_probCellSpaceBeforeAfter: number,
    s_signBefore: number,
    s_signAfter: number,
    s_pmSigSpaceBefore: number,
    s_remarksCellSpaceBeforeAfter: number
  ): number => {
    const f_title1 = lerp(18, 26, scale);
    const f_title2 = lerp(14, 22, scale);
    const f_title3 = lerp(14, 24, scale);
    const f_main = lerp(13, 21, scale);
    
    const h_spaceBeforeHeader = lerp(10, 70, scale);
    const h_spaceAfterHeader = lerp(10, 50, scale);
    const h_spaceAfterSub = lerp(10, 50, scale);
    const h_spaceAfterTitle3 = lerp(20, 100, scale);
    
    const h_tableMarginsTopBottom = lerp(15, 60, scale);

    const lineHeight = f_main * 13;

    // 1. Header height
    const heightHeader = 
      (f_title1 * 13 + h_spaceBeforeHeader + h_spaceAfterHeader) +
      (f_title2 * 13 + h_spaceAfterSub) +
      (f_title3 * 13 + h_spaceAfterTitle3);

    // 2. Table 1 properties
    const rawMetadata = [
      metadata.name || "",
      headquarters || "",
      finalReport.officeAttended || "",
      finalReport.callGivenBy || "",
      finalReport.date || "",
      finalReport.timeIn || "",
      finalReport.timeOut || ""
    ];
    let table1Lines = 0;
    rawMetadata.forEach((val) => {
      table1Lines += Math.max(1, Math.ceil(val.length / 45));
    });
    const heightTable1 = 
      (table1Lines * lineHeight) + 
      (7 * 2 * s_propSpaceVertical) + 
      (7 * 2 * h_tableMarginsTopBottom);

    // 3. Distance before Table 2 (empty paragraph has s_probHeaderSpaceBeforeAfter * 2 spacing + minimum line height of ~180 dxa)
    const heightSpace2 = s_probHeaderSpaceBeforeAfter * 2 + 180;

    // 4. Table 2 height
    const heightTable2Header = lineHeight + s_probHeaderSpaceBeforeAfter * 2;
    
    let heightTable2Rows = 0;
    problemsToRender.forEach(p => {
      const reportedLines = (p.reported || "").split('\n').map(line => line.trim()).filter(Boolean);
      const actionLines = (p.actionTaken || "").split('\n').map(line => line.trim()).filter(Boolean);
      const followLines = (p.followUp || "").split('\n').map(line => line.trim()).filter(Boolean);

      let repLinesTotalCount = 0;
      reportedLines.forEach(l => {
        repLinesTotalCount += Math.max(1, Math.ceil(l.length / 32));
      });
      let actLinesTotalCount = 0;
      actionLines.forEach(l => {
        actLinesTotalCount += Math.max(1, Math.ceil(l.length / 32));
      });
      let fUpLinesTotalCount = 0;
      followLines.forEach(l => {
        fUpLinesTotalCount += Math.max(1, Math.ceil(l.length / 16));
      });

      const maxRowLines = Math.max(repLinesTotalCount, actLinesTotalCount, fUpLinesTotalCount, 1);
      const numParagraphs = Math.max(reportedLines.length, actionLines.length, followLines.length, 1);
      
      heightTable2Rows += (maxRowLines * lineHeight) + (numParagraphs * 2 * s_probCellSpaceBeforeAfter);
    });

    const heightTable2 = heightTable2Header + heightTable2Rows + ((1 + problemsToRender.length) * 2 * h_tableMarginsTopBottom);

    // 5. Space before Spares (empty paragraph has s_signBefore + s_signAfter spacing + minimum line height of ~180 dxa)
    const heightSpaceSpares = s_signBefore + s_signAfter + 180;

    // 6. Spares items
    const sparesValLines = Math.max(1, Math.ceil((41 + (finalReport.replacementOfSpares || "").length) / 65)) +
                          Math.max(1, Math.ceil((41 + (finalReport.amountOfSpares || "").length) / 65));
    const heightSpares = (sparesValLines * lineHeight) + (3 * s_propSpaceVertical) + s_signAfter + (lineHeight + (2 * s_propSpaceVertical));

    // 7. Signature Table
    const heightSigSM = lineHeight + s_signBefore + s_signAfter + (2 * h_tableMarginsTopBottom);

    // 8. Distance before peripherals (empty paragraph has s_signBefore + s_signAfter spacing + minimum line height of ~180 dxa)
    const heightSpacePeriph = s_signBefore + s_signAfter + 180;

    // 9. Peripherals line
    const periphTextLines = Math.max(1, Math.ceil((49 + (finalReport.otherIssues || "").length) / 65));
    const heightPeriph = (periphTextLines * lineHeight) + (s_propSpaceVertical + 5) * 2;

    // 10. PM Signature paragraph
    const heightPMSig = lineHeight + s_pmSigSpaceBefore + s_signAfter;

    // 11. Distance before Remarks (empty paragraph has s_signBefore + s_signAfter spacing + minimum line height of ~180 dxa)
    const heightSpaceRemarks = s_signBefore + s_signAfter + 180;

    // 12. Remarks Table
    const heightRemarksHeader = lineHeight + Math.round(Math.max(15, s_remarksCellSpaceBeforeAfter / 4)) * 2;
    const heightRemarksBody = s_remarksCellSpaceBeforeAfter * 2;
    const heightRemarksTable = heightRemarksHeader + heightRemarksBody + (4 * h_tableMarginsTopBottom);

    return heightHeader + 
      heightTable1 + 
      heightSpace2 + 
      heightTable2 + 
      heightSpaceSpares + 
      heightSpares + 
      heightSigSM + 
      heightSpacePeriph + 
      heightPeriph + 
      heightPMSig + 
      heightSpaceRemarks + 
      heightRemarksTable;
  };

  const estimateHeight = (scale: number): number => {
    return estimateHeightWithSpacings(
      scale,
      lerp(2, 20, scale),
      lerp(10, 45, scale),
      lerp(1, 12, scale),
      lerp(10, 40, scale),
      lerp(10, 40, scale),
      lerp(10, 400, scale),
      lerp(30, 160, scale)
    );
  };

  let bestScale = 1.0;
  const targetBudget = 14200; // Portrait height budget in dxa (A4 height is 16838. Leaves solid safe padding to guarantee absolutely 1 page in Word 2007)

  // Linear scan to find the exact scale that sits below the target Budget
  for (let s = 1.6; s >= 0.4; s -= 0.02) {
    if (estimateHeight(s) <= targetBudget) {
      bestScale = s;
      break;
    }
  }

  // If even at s = 0.4 the layout is too tall, progressively truncate the longest text fields
  if (estimateHeight(0.4) > targetBudget) {
    bestScale = 0.4;
    for (let truncateIter = 0; truncateIter < 80; truncateIter++) {
      if (estimateHeight(0.4) <= targetBudget) {
        break;
      }
      
      // Find the longest text input and shorten it to fit under budget
      let longestLength = 0;
      let longestFieldType: 'reported' | 'actionTaken' | 'followUp' | 'otherIssues' | 'spares' = 'reported';
      let targetIdx = -1;

      problemsToRender.forEach((p, idx) => {
        if (p.reported.length > longestLength) {
          longestLength = p.reported.length;
          longestFieldType = 'reported';
          targetIdx = idx;
        }
        if (p.actionTaken.length > longestLength) {
          longestLength = p.actionTaken.length;
          longestFieldType = 'actionTaken';
          targetIdx = idx;
        }
        if (p.followUp.length > longestLength) {
          longestLength = p.followUp.length;
          longestFieldType = 'followUp';
          targetIdx = idx;
        }
      });

      if (finalReport.otherIssues.length > longestLength) {
        longestLength = finalReport.otherIssues.length;
        longestFieldType = 'otherIssues';
        targetIdx = -1;
      }
      if (finalReport.replacementOfSpares.length > longestLength) {
        longestLength = finalReport.replacementOfSpares.length;
        longestFieldType = 'spares';
        targetIdx = -1;
      }

      if (longestLength <= 10) {
        break; // Can't truncate any further
      }

      // Truncate the chosen field
      if (targetIdx !== -1) {
        const p = problemsToRender[targetIdx];
        if ((longestFieldType as string) === 'reported') {
          p.reported = p.reported.slice(0, Math.floor(p.reported.length * 0.85)) + "...";
        } else if ((longestFieldType as string) === 'actionTaken') {
          p.actionTaken = p.actionTaken.slice(0, Math.floor(p.actionTaken.length * 0.85)) + "...";
        } else if ((longestFieldType as string) === 'followUp') {
          p.followUp = p.followUp.slice(0, Math.floor(p.followUp.length * 0.85)) + "...";
        }
      } else {
        if (longestFieldType === 'otherIssues') {
          finalReport.otherIssues = finalReport.otherIssues.slice(0, Math.floor(finalReport.otherIssues.length * 0.85)) + "...";
        } else if (longestFieldType === 'spares') {
          finalReport.replacementOfSpares = finalReport.replacementOfSpares.slice(0, Math.floor(finalReport.replacementOfSpares.length * 0.85)) + "...";
        }
      }
    }
  }

  const S = bestScale;
  const sizeTitle1 = lerp(18, 26, S);
  const sizeTitle2 = lerp(14, 22, S);
  const sizeTitle3 = lerp(14, 24, S);
  const sizeMain = lerp(13, 21, S);
  
  const spaceBeforeHeader = lerp(10, 70, S);
  const spaceAfterHeader = lerp(10, 50, S);
  const spaceAfterSub = lerp(10, 50, S);
  const spaceAfterTitle3 = lerp(20, 100, S);
  
  const h_tableMarginsTopBottom = lerp(15, 60, S);
  const h_tableMarginsLeftRight = lerp(40, 120, S);
  const tableMargins = {
    top: h_tableMarginsTopBottom,
    bottom: h_tableMarginsTopBottom,
    left: h_tableMarginsLeftRight,
    right: h_tableMarginsLeftRight
  };
  
  let propSpaceVertical = lerp(2, 20, S);
  let probHeaderSpaceBeforeAfter = lerp(10, 45, S);
  let probCellSpaceBeforeAfter = lerp(1, 12, S);
  
  let signBefore = lerp(10, 40, S);
  let signAfter = lerp(10, 40, S);
  
  let pmSigSpaceBefore = lerp(100, 400, S);
  let remarksCellSpaceBeforeAfter = lerp(30, 160, S);

  // Proactively expand empty spacings and signatures to completely fill the single page budget (targetBudget)
  let currentEst = estimateHeightWithSpacings(
    S,
    propSpaceVertical,
    probHeaderSpaceBeforeAfter,
    probCellSpaceBeforeAfter,
    signBefore,
    signAfter,
    pmSigSpaceBefore,
    remarksCellSpaceBeforeAfter
  );

  for (let i = 0; i < 500; i++) {
    if (currentEst >= targetBudget - 50) {
      break;
    }
    remarksCellSpaceBeforeAfter += 2;
    pmSigSpaceBefore += 2;
    signBefore += 0.5;
    signAfter += 0.5;
    probHeaderSpaceBeforeAfter += 0.2;
    
    currentEst = estimateHeightWithSpacings(
      S,
      propSpaceVertical,
      probHeaderSpaceBeforeAfter,
      probCellSpaceBeforeAfter,
      signBefore,
      signAfter,
      pmSigSpaceBefore,
      remarksCellSpaceBeforeAfter
    );
  }

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: spaceBeforeHeader, after: spaceAfterHeader },
      children: [
        new TextRun({
          text: "DEPARTMENT OF POSTS, INDIA",
          bold: true,
          size: sizeTitle1,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: spaceAfterSub },
      children: [
        new TextRun({
          text: `${division}, Cuddalore 607001.`,
          size: sizeTitle2,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: spaceAfterTitle3 },
      children: [
        new TextRun({
          text: `Service call report of System Managers, ${headerDivision}.`,
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: sizeTitle3,
          font: "Calibri",
        }),
      ],
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: tableMargins,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        ["Name of the System Manager", ":", cleanText(metadata.name || "")],
        ["Head Quarters", ":", cleanText(headquarters || "")],
        ["Date", ":", cleanText(finalReport.date || "")],
        ["Time in", ":", ensureHrsDot(finalReport.timeIn || "")],
        ["Time out", ":", ensureHrsDot(finalReport.timeOut || "")],
        ["Name of the office attended", ":", cleanText(finalReport.officeAttended || "")],
        ["Call given by", ":", (finalReport.callGivenBy ?? "").trim().toUpperCase()],
      ].map(([propName, colon, propVal]) => new TableRow({
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: propSpaceVertical, after: propSpaceVertical },
                children: [
                  new TextRun({
                    text: propName,
                    bold: true,
                    size: sizeMain,
                    font: "Calibri",
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: propSpaceVertical, after: propSpaceVertical },
                children: [
                  new TextRun({
                    text: colon,
                    bold: true,
                    size: sizeMain,
                    font: "Calibri",
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 58, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: propSpaceVertical, after: propSpaceVertical },
                children: [
                  new TextRun({
                    text: propVal,
                    size: sizeMain,
                    font: "Calibri",
                  })
                ]
              })
            ]
          }),
        ]
      }))
    }),

    createSpacerParagraph(probHeaderSpaceBeforeAfter, probHeaderSpaceBeforeAfter),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: tableMargins,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: probHeaderSpaceBeforeAfter, after: probHeaderSpaceBeforeAfter },
                  children: [
                    new TextRun({ text: "Details of problem reported", bold: true, size: sizeMain, font: "Calibri" })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: probHeaderSpaceBeforeAfter, after: probHeaderSpaceBeforeAfter },
                  children: [
                    new TextRun({ text: "Action taken by the System Manager", bold: true, size: sizeMain, font: "Calibri" })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: probHeaderSpaceBeforeAfter, after: probHeaderSpaceBeforeAfter },
                  children: [
                    new TextRun({ text: "Follow up action to be taken", bold: true, size: sizeMain, font: "Calibri" })
                  ]
                })
              ]
            }),
          ]
        }),
        ...problemsToRender.map(p => new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: (() => {
                const paras = p.reported.split('\n').map(line => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  let cleanLine = trimmed;
                  while (
                    cleanLine.startsWith('-') ||
                    cleanLine.startsWith('*') ||
                    cleanLine.startsWith('•') ||
                    cleanLine.startsWith('♦') ||
                    cleanLine.startsWith('◆') ||
                    cleanLine.startsWith('◇') ||
                    cleanLine.startsWith('❖')
                  ) {
                    cleanLine = cleanLine.substring(1).trim();
                  }
                  if (!cleanLine) return null;
                  const cleanVal = cleanText(cleanLine);
                  const displayLine = `❖ ${cleanVal}`;
                  return new Paragraph({
                    spacing: { before: probCellSpaceBeforeAfter, after: probCellSpaceBeforeAfter },
                    children: [
                      new TextRun({ text: displayLine, size: sizeMain, font: "Calibri" })
                    ]
                  });
                }).filter(Boolean) as Paragraph[];
                return paras.length > 0 ? paras : [new Paragraph({ children: [new TextRun(" ")] })];
              })()
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: (() => {
                const paras = p.actionTaken.split('\n').map(line => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  let cleanLine = trimmed;
                  while (
                    cleanLine.startsWith('-') ||
                    cleanLine.startsWith('*') ||
                    cleanLine.startsWith('•') ||
                    cleanLine.startsWith('♦') ||
                    cleanLine.startsWith('◆') ||
                    cleanLine.startsWith('◇') ||
                    cleanLine.startsWith('❖')
                  ) {
                    cleanLine = cleanLine.substring(1).trim();
                  }
                  if (!cleanLine) return null;
                  const cleanVal = cleanText(cleanLine);
                  const displayLine = `❖ ${cleanVal}`;
                  return new Paragraph({
                    spacing: { before: probCellSpaceBeforeAfter, after: probCellSpaceBeforeAfter },
                    children: [
                      new TextRun({ text: displayLine, size: sizeMain, font: "Calibri" })
                    ]
                  });
                }).filter(Boolean) as Paragraph[];
                return paras.length > 0 ? paras : [new Paragraph({ children: [new TextRun(" ")] })];
              })()
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: (() => {
                const paras = (p.followUp || "").split('\n').map(line => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  const cleanVal = cleanText(trimmed);
                  return new Paragraph({
                    spacing: { before: probCellSpaceBeforeAfter, after: probCellSpaceBeforeAfter },
                    children: [
                      new TextRun({ text: cleanVal, size: sizeMain, font: "Calibri" })
                    ]
                  });
                }).filter(Boolean) as Paragraph[];
                return paras.length > 0 ? paras : [new Paragraph({ children: [new TextRun(" ")] })];
              })()
            }),
          ]
        }))
      ]
    }),

    createSpacerParagraph(signBefore, signAfter),

    new Paragraph({
      spacing: { before: propSpaceVertical, after: propSpaceVertical },
      children: [
        new TextRun({ text: "Replacement of spares, if any required: ", bold: true, size: sizeMain, font: "Calibri" }),
        new TextRun({ text: cleanText(finalReport.replacementOfSpares || "None"), size: sizeMain, font: "Calibri" }),
      ]
    }),
    createSpacerParagraph(propSpaceVertical, propSpaceVertical),
    new Paragraph({
      spacing: { before: propSpaceVertical, after: signAfter },
      children: [
        new TextRun({ text: "Amount of purchase of spare (approx.): ", bold: true, size: sizeMain, font: "Calibri" }),
        new TextRun({ text: cleanText(finalReport.amountOfSpares || "None"), size: sizeMain, font: "Calibri" }),
      ]
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun(" ")] })]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: signBefore, after: signAfter },
                  children: [
                    new TextRun({ text: "Signature of System Manager", bold: true, size: sizeMain, font: "Calibri" })
                  ]
                })
              ]
            }),
          ]
        })
      ]
    }),

    createSpacerParagraph(signBefore, signAfter),

    new Paragraph({
      spacing: { before: Math.max(10, propSpaceVertical + 5), after: Math.max(10, propSpaceVertical + 5) },
      children: [
        new TextRun({ text: "All computer peripherals are working fine except: ", bold: true, size: sizeMain, font: "Calibri" }),
        new TextRun({ text: cleanText(finalReport.otherIssues || "NSP 2"), size: sizeMain, font: "Calibri" }),
      ]
    }),

    new Paragraph({
      spacing: { before: pmSigSpaceBefore, after: signAfter },
      children: [
        new TextRun({ text: "Signature of the Post Master/Sub Post Master with seal.", bold: true, size: sizeMain, font: "Calibri" })
      ]
    }),

    createSpacerParagraph(signBefore, signAfter),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: tableMargins,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: Math.round(Math.max(15, remarksCellSpaceBeforeAfter / 4)), after: Math.round(Math.max(15, remarksCellSpaceBeforeAfter / 4)) },
                  children: [
                    new TextRun({ text: "Remarks at Divisional Office", bold: true, size: sizeMain, font: "Calibri" })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ spacing: { before: remarksCellSpaceBeforeAfter, after: remarksCellSpaceBeforeAfter }, children: [new TextRun(" ")] }),
              ]
            })
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: " ", font: "Calibri" })] })
  ];
};

export const getServiceCallReportBlob = async (
  metadata: DiaryMetadata,
  headquarters: string,
  report: ServiceCallReport
): Promise<{ blob: Blob; fileName: string }> => {
  const doc = new Document({
    compatabilityModeVersion: 12,
    compatibility: { version: 12 },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 portrait width (21 cm) in dxa
              height: 16838, // A4 portrait height (29.7 cm) in dxa
              orientation: PageOrientation.PORTRAIT,
              code: 9,       // A4 paper size code
            },
            margin: {
              top: 500,
              right: 600,
              bottom: 500,
              left: 600,
            },
          },
        },
        children: compileCopyChildrenForReport("ORIGINAL", metadata, headquarters, report),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const formattedOffice = cleanText(report.officeAttended).replace(/[\s\.]+/g, '_');
  const formattedDate = cleanText(report.date).replace(/[\s\.]+/g, '_');
  const fileName = `Service_Call_Report_${formattedOffice}_${formattedDate}.docx`;
  return { blob, fileName };
};

export const generateServiceCallReportDoc = async (
  metadata: DiaryMetadata,
  headquarters: string,
  report: ServiceCallReport
) => {
  const { blob, fileName } = await getServiceCallReportBlob(metadata, headquarters, report);
  saveAs(blob, fileName);
};

export const getMultipleServiceCallReportsBlob = async (
  metadata: DiaryMetadata,
  headquarters: string,
  reports: ServiceCallReport[],
  customFileName?: string
): Promise<{ blob: Blob; fileName: string } | null> => {
  if (reports.length === 0) return null;

  const sections = reports.map(report => {
    return {
      properties: {
        page: {
          size: {
            width: 11906, // A4 portrait width (21 cm) in dxa
            height: 16838, // A4 portrait height (29.7 cm) in dxa
            orientation: PageOrientation.PORTRAIT,
            code: 9,       // A4 paper size code
          },
          margin: {
            top: 500,
            right: 600,
            bottom: 500,
            left: 600,
          },
        },
      },
      children: compileCopyChildrenForReport("ORIGINAL", metadata, headquarters, report),
    };
  });

  const doc = new Document({
    compatabilityModeVersion: 12,
    compatibility: { version: 12 },
    sections
  });
  const blob = await Packer.toBlob(doc);
  const formattedDate = cleanText(reports[0].date).replace(/[\s\.]+/g, '_');
  const fileName = customFileName || `Merged_Service_Call_Reports_${formattedDate}_All.docx`;
  return { blob, fileName };
};

export const generateMultipleServiceCallReportsDoc = async (
  metadata: DiaryMetadata,
  headquarters: string,
  reports: ServiceCallReport[],
  customFileName?: string
) => {
  const result = await getMultipleServiceCallReportsBlob(metadata, headquarters, reports, customFileName);
  if (result) {
    saveAs(result.blob, result.fileName);
  }
};

export const generateTABillDoc = async (
  metadata: DiaryMetadata,
  payVal: string,
  advanceVal: string,
  defaultOffice?: string
) => {
  let nameVal = cleanText(metadata.name);
  if (!nameVal || nameVal === "R. Karikalvalavan" || nameVal === "Karikalvalavan R") {
    nameVal = "Karikalvalavan R";
  }
  let designation = cleanText(metadata.designation || "Postal Assistant- System Administrator");
  if (designation === "System Administrator" || designation === "Postal Assistant- System Administrator") {
    designation = "Postal Assistant- System Administrator";
  }
  const finalPay = payVal ? cleanText(payVal) : "38100+others";
  let headquarters = cleanText(defaultOffice || metadata.office || "Kurinjipadi S.O");

  const formatTABillDottedLine = (num: string, label: string, value: string) => {
    const labelText = `${num}. ${label}`;
    const targetStart = 30; // Horizontal alignment target for the value
    const prefixCount = Math.max(3, targetStart - labelText.length);
    const prefixDots = " " + ".".repeat(prefixCount - 2) + " ";
    const valText = value || "";
    const totalLength = 142; // Extends perfectly to the end of the line
    const suffixCount = Math.max(10, totalLength - labelText.length - prefixDots.length - valText.length);
    const suffixDots = ".".repeat(suffixCount);

    return new Paragraph({
      spacing: { before: 80, after: 80, line: 240 },
      children: [
        new TextRun({ text: labelText, bold: true, size: 20, font: DEFAULT_FONT }),
        new TextRun({ text: prefixDots, size: 20, font: DEFAULT_FONT, color: "000000" }),
        new TextRun({ text: valText, bold: true, size: 20, font: DEFAULT_FONT, color: "000000" }),
        new TextRun({ text: suffixDots, size: 20, font: DEFAULT_FONT, color: "4A4A4A" })
      ]
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[metadata.month] || "July";
  const year = metadata.year || 2026;
  const purposeText = `TA calculation sheet attached for the month of ${monthName} ${year}.`;

  const tableRows = [
    // Header Row 1
    new TableRow({
      children: [
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Date and Time", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 9, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "From", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Date and Time", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 9, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "To", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Mode of travel and class of accommodation", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          columnSpan: 2,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Fare paid", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 9, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Distance in Kms. for road mileage", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          columnSpan: 2,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Duration of halt", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Purpose of journey", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
      ],
    }),
    // Header Row 2
    new TableRow({
      children: [
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({
          width: { size: 7, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: "Rs.", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: "P.", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: "Days", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: "Hours", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({ verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
      ],
    }),
    // Header Row 3 (Numbered)
    new TableRow({
      height: { value: 567, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "1", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "2", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "3", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "4", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "5", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "6", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "7", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "8", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "9", size: 16, font: DEFAULT_FONT })] })] }),
      ],
    }),
  ];

  // Add a single elegant body row to Table 5 with "TA calculation sheets attached" in the last cell
  const table5ColWidths = [11, 9, 11, 9, 14, 7, 4, 9, 6, 6, 14];
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 9, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 9, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }), // Rs.
        new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }), // P.
        new TableCell({ width: { size: 9, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }), // Days
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 300, after: 300 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })] }), // Hours
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TA", bold: true, size: 16, font: DEFAULT_FONT })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Calculation", bold: true, size: 16, font: DEFAULT_FONT })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "sheets", bold: true, size: 16, font: DEFAULT_FONT })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Attached for", bold: true, size: 16, font: DEFAULT_FONT })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${monthName} ${year}`, bold: true, size: 16, font: DEFAULT_FONT })] })
          ]
        })
      ]
    })
  );

  // Table 9 rows (Page 2) - Hotel Stay Particulars
  const table9ColWidths = [30, 30, 20, 20];
  const table9Rows = [
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Period of stay (From - To)", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Name of Hotel", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Daily rate of lodging (Rs)", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Total amount paid (Rs)", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
      ],
    }),
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: ["1", "2", "3", "4"].map((num, i) => new TableCell({
        width: { size: table9ColWidths[i], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: num, size: 16, font: DEFAULT_FONT })] })]
      })),
    }),
  ];
  for (let i = 0; i < 8; i++) {
    table9Rows.push(
      new TableRow({
        height: { value: 227, rule: HeightRule.ATLEAST },
        children: table9ColWidths.map((w) => new TableCell({
          width: { size: w, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 90, after: 90 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })]
        })),
      })
    );
  }

  // Table 10 rows (Page 3) - Higher accommodation
  const table10ColWidths = [12, 15, 15, 14, 14, 15, 15];
  const table10Rows = [
    // Row 1
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Date", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          columnSpan: 2,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Name of places", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Mode of conveyance", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Class to which entitled", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Class by which traveled", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Fare of the entitled class", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
      ],
    }),
    // Row 2
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "From", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "To", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
      ],
    }),
    // Row 3 (Numbered Row)
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: ["1", "2", "3", "4", "5", "6", "7"].map((num, i) => new TableCell({
        width: { size: table10ColWidths[i], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: num, size: 16, font: DEFAULT_FONT })] })]
      })),
    }),
  ];
  for (let i = 0; i < 7; i++) {
    table10Rows.push(
      new TableRow({
        height: { value: 227, rule: HeightRule.ATLEAST },
        children: table10ColWidths.map((w) => new TableCell({
          width: { size: w, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 90, after: 90 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })]
        })),
      })
    );
  }

  // Table 11 rows (Page 3) - Road between rail-connected places
  const table11ColWidths = [20, 30, 30, 20];
  const table11Rows = [
    // Row 1
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          verticalMerge: VerticalMergeType.RESTART,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Date", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          columnSpan: 2,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Name of places", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Fair paid", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
      ],
    }),
    // Row 2
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, verticalMerge: VerticalMergeType.CONTINUE, children: [new Paragraph({ children: [] })] }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "From", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "To", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Rs.", bold: true, size: 16, font: DEFAULT_FONT })] })],
        }),
      ],
    }),
    // Row 3 (Numbered Row)
    new TableRow({
      height: { value: 227, rule: HeightRule.ATLEAST },
      children: ["1", "2", "3", "4"].map((num, i) => new TableCell({
        width: { size: table11ColWidths[i], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: num, size: 16, font: DEFAULT_FONT })] })]
      })),
    }),
  ];
  for (let i = 0; i < 5; i++) {
    table11Rows.push(
      new TableRow({
        height: { value: 227, rule: HeightRule.ATLEAST },
        children: table11ColWidths.map((w) => new TableCell({
          width: { size: w, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 90, after: 90 }, children: [new TextRun({ text: " ", size: 16, font: DEFAULT_FONT })] })]
        })),
      })
    );
  }

  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  };

  const doc = new Document({
    compatabilityModeVersion: 12,
    compatibility: { version: 12 },
    styles: {
      default: {
        document: {
          paragraph: {
            spacing: {
              line: 360,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width
              height: 16838, // A4 height
              code: 9,
            },
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // ==================== PAGE 1 ====================
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100, after: 100, line: 360 },
            children: [
              new TextRun({ text: "G.A.R. -14A", bold: true, size: 22, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 150, line: 360 },
            children: [
              new TextRun({ text: "TRAVELING ALLOWANCE BILL FOR TOUR", bold: true, size: 28, font: DEFAULT_FONT, color: "5B2C6F" })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 150, after: 250, line: 360 },
            children: [
              new TextRun({ text: "Note- This bill should be prepared in duplicate, once for payment and the other as office copy.", italics: true, size: 18, font: DEFAULT_FONT, color: "78281F" })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 150, line: 360 },
                        children: [
                          new TextRun({ text: "PART-A (To be filled up by government Servant)", bold: true, size: 22, font: DEFAULT_FONT, color: "5B2C6F" })
                        ]
                      })
                    ],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 50, after: 150, line: 360 },
                        children: [
                          new TextRun({ text: "", size: 16, font: DEFAULT_FONT })
                        ]
                      })
                    ],
                  }),
                ]
              })
            ]
          }),

          // Aligned borderless layout for S.No 1 to 4 using continuous dotted lines
          formatTABillDottedLine("1", "Name", nameVal),
          formatTABillDottedLine("2", "Designation", designation),
          formatTABillDottedLine("3", "Pay", finalPay),
          formatTABillDottedLine("4", "Headquarters", headquarters),

          new Paragraph({ spacing: { before: 300, after: 300, line: 360 }, children: [new TextRun({ text: "5. Details and purpose of journey (s) performed –", bold: true, size: 20, font: DEFAULT_FONT })] }),

          // S.No 5 Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 160, bottom: 160, left: 160, right: 160 },
            borders: tableBorders,
            rows: tableRows,
          }),

          new Paragraph({ spacing: { before: 450, after: 200, line: 360 }, children: [new TextRun({ text: "6. Mode of journey: -", bold: true, size: 20, font: DEFAULT_FONT })] }),
          new Paragraph({ spacing: { before: 200, after: 150, line: 360 }, children: [new TextRun({ text: "(1) Air", bold: true, size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(a) Exchange voucher arranged by officer", size: 18, font: DEFAULT_FONT }), new TextRun({ text: "\t\t\t\t\tYes/No", bold: true, size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 720 }, spacing: { before: 150, after: 200, line: 360 }, children: [new TextRun({ text: ".......................................................................................", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(b) Ticket/Exchange voucher arranged by .................................................................................", size: 18, font: DEFAULT_FONT })] }),

          new Paragraph({ spacing: { before: 300, after: 150, line: 360 }, children: [new TextRun({ text: "(II) Rail", bold: true, size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(a) Whether traveled by mail/express/ordinary train?", size: 18, font: DEFAULT_FONT }), new TextRun({ text: "\t\t\t\tYes/No", bold: true, size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(b) Whether return tickets available?", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(c) Is available, whether return tickets purchased?", size: 18, font: DEFAULT_FONT })] }),

          // ==================== PAGE 2 ====================
          new Paragraph({ children: [new PageBreak()] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 85, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 200, after: 50, line: 360 },
                        children: [
                          new TextRun({ text: "(III) Road", bold: true, size: 18, font: DEFAULT_FONT })
                        ]
                      })
                    ],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: "", size: 16, font: DEFAULT_FONT })
                        ]
                      })
                    ],
                  }),
                ]
              })
            ]
          }),
          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 200, after: 300, line: 360 },
            children: [
              new TextRun({
                text: "Mode of conveyance used i.e. by govt. transport/by taking a Taxi, a single seat in a bus or other public conveyance/by sharing with another Govt. servant in a car belonging to him or to a third person to be specified.",
                size: 18,
                font: DEFAULT_FONT
              })
            ]
          }),

          new Paragraph({ spacing: { before: 300, after: 200, line: 360 }, children: [new TextRun({ text: "7. Date of absence from place of halt on account of: -", bold: true, size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(a) R.H. and C.L.", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(b) Not being actually in camp of Sundays and Holidays.", size: 18, font: DEFAULT_FONT })] }),

          new Paragraph({ spacing: { before: 400, after: 200, line: 360 }, children: [new TextRun({ text: "8. Dates on which free board and/or lodging provided by the State or any Organisation financed by State funds: -", bold: true, size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(a) Board only", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(b) Lodging only", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 200, line: 360 }, children: [new TextRun({ text: "(c) Board and lodging", size: 18, font: DEFAULT_FONT })] }),

          new Paragraph({ spacing: { before: 400, after: 300, line: 360 }, children: [new TextRun({ text: "9. Particulars to be furnished alongwith hotel receipts etc. in cases where higher rate of D.A. is claimed for stay in hotel/other establishments providing board and/or a lodging at scheduled tariffs: -", bold: true, size: 18, font: DEFAULT_FONT })] }),

          // S.No 9 Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 140, bottom: 140, left: 140, right: 140 },
            borders: tableBorders,
            rows: table9Rows,
          }),

          // ==================== PAGE 3 ====================
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            spacing: { before: 150, after: 150, line: 300 },
            children: [
              new TextRun({ text: "10. Particular of journey (s) for which higher class of accommodation that the one to which the govt. servant is entitled was used: -", bold: true, size: 18, font: DEFAULT_FONT })
            ]
          }),

          // S.No 10 Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: tableBorders,
            rows: table10Rows,
          }),

          new Paragraph({ spacing: { before: 120, after: 120, line: 300 }, children: [new TextRun({ text: "If the journey (s) by higher class of accommodation had been performed with the approval of the competent authority, No and date of the sanction may be quoted.", italics: true, size: 16, font: DEFAULT_FONT })] }),

          new Paragraph({ spacing: { before: 180, after: 120, line: 300 }, children: [new TextRun({ text: "11. Details of journey (s) performed by road between place connected by rail: -", bold: true, size: 18, font: DEFAULT_FONT })] }),

          // S.No 11 Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: tableBorders,
            rows: table11Rows,
          }),

          new Paragraph({
            spacing: { before: 120, after: 80, line: 300 },
            children: [
              new TextRun({ text: "12. Amount of T.A. advance, if any, drawn. ", bold: true, size: 18, font: DEFAULT_FONT }),
              new TextRun({ text: advanceVal ? `Rs. ${advanceVal}` : "NIL", bold: true, size: 28, font: DEFAULT_FONT, color: "555555" })
            ]
          }),

          new Paragraph({ spacing: { before: 80, after: 200, line: 300 }, children: [new TextRun({ text: "Certified that the information as given above is true to the best of my knowledge and belief.", size: 18, font: DEFAULT_FONT })] }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300, after: 50, line: 300 },
            children: [
              new TextRun({ text: ".......................................................................", size: 18, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 50, after: 100, line: 300 },
            children: [
              new TextRun({ text: "Signature of the Govt. Servant", bold: true, size: 18, font: DEFAULT_FONT })
            ]
          }),

          // ==================== PAGE 4 ====================
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200, after: 300, line: 360 },
            children: [
              new TextRun({ text: "Date ....................................................", bold: true, size: 18, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400, line: 360 },
            children: [
              new TextRun({ text: "PART-B (To be filled in the Bill Section)", bold: true, size: 24, font: DEFAULT_FONT, color: "5B2C6F" })
            ]
          }),

          new Paragraph({ spacing: { before: 400, after: 400, line: 360 }, children: [new TextRun({ text: "1. The net entitlement of account of traveling allowance works out to Rs. .................................. as detailed below: -", bold: true, size: 18, font: DEFAULT_FONT })] }),

          new Paragraph({ indent: { left: 360 }, spacing: { before: 220, after: 220, line: 360 }, children: [new TextRun({ text: "(a) Railway/Air/Bus/Steamer fare: - Rs. ..........................................................................................", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 220, after: 220, line: 360 }, children: [new TextRun({ text: "(b) Road mileage for .................................................... Kms. @ Rs. ................................................... P./Km.", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 360 }, spacing: { before: 220, after: 220, line: 360 }, children: [new TextRun({ text: "(c) Daily allowance", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 720 }, spacing: { before: 180, after: 180, line: 360 }, children: [new TextRun({ text: "(i) .................................................... day @ Rs. .................................................... Per day", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 720 }, spacing: { before: 180, after: 180, line: 360 }, children: [new TextRun({ text: "(ii) .................................................... day @ Rs. .................................................... Per day", size: 18, font: DEFAULT_FONT })] }),
          new Paragraph({ indent: { left: 720 }, spacing: { before: 180, after: 180, line: 360 }, children: [new TextRun({ text: "(iii) .................................................... day @ Rs. .................................................... Per day", size: 18, font: DEFAULT_FONT })] }),

          // Borderless table for (d) Actual expenses to make it perfectly aligned
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        indent: { left: 360 },
                        spacing: { before: 120, after: 120, line: 360 },
                        children: [new TextRun({ text: "(d) Actual expenses", bold: true, size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 120, line: 360 },
                        children: [new TextRun({ text: "Rs. ..........................................................................", size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [] })]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 120, line: 360 },
                        children: [new TextRun({ text: "Rs. ..........................................................................", size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [] })]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 120, line: 360 },
                        children: [new TextRun({ text: "Rs. ..........................................................................", size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [] })]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 120, line: 360 },
                        children: [new TextRun({ text: "Rs. ..........................................................................", size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [] })]
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 180, after: 180, line: 360 },
                        children: [new TextRun({ text: "Gross amount", bold: true, size: 18, font: DEFAULT_FONT })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 300, after: 200, line: 360 },
            children: [
              new TextRun({ text: "(e) Less amount of T.A. advance, if any, drawn vide voucher No. ............... Date .......................", size: 18, font: DEFAULT_FONT })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200, after: 300, line: 360 },
            children: [
              new TextRun({ text: "Net amount Rs. .......................................................", bold: true, size: 18, font: DEFAULT_FONT })
            ]
          }),

          new Paragraph({
            spacing: { before: 400, after: 600, line: 360 },
            children: [
              new TextRun({ text: "2. The expenditure's debatable to ............................................................................................", bold: true, size: 18, font: DEFAULT_FONT })
            ]
          }),

          new Paragraph({ spacing: { before: 1200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Initials of Bill Clerk", bold: true, size: 18, font: DEFAULT_FONT })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 400 }, children: [new TextRun({ text: "Signature of DDO", bold: true, size: 18, font: DEFAULT_FONT })] })],
                  }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnSpan: 2,
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 800, line: 360 }, children: [new TextRun({ text: "Countersigned", bold: true, size: 18, font: DEFAULT_FONT })] }),
                      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 600, line: 360 }, children: [new TextRun({ text: "Signature of Controlling Officer", bold: true, size: 18, font: DEFAULT_FONT })] }),
                    ]
                  }),
                ]
              })
            ]
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `TA_Tour_Bill_${cleanText(metadata.name).replace(/\s+/g, "_")}_${metadata.month + 1}_${metadata.year}.docx`);
};

