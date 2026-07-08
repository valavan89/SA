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
import { DiaryMetadata, ActivityEntry, MovementEntry, ServiceCallReport } from '../types';
import { getFortnightDays, formatDate, to24hDot } from '../utils/dateUtils';

const saveAs = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
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
  const str = String(val);
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
                    width: { size: 0, type: WidthType.AUTO },
                    children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: "DATE", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER })],
                  }),
                  new TableCell({
                    width: { size: 0, type: WidthType.AUTO },
                    children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: "DETAILS", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER })],
                  }),
                ],
              }),
              ...activities.map(entry => {
                const lines = cleanText(entry.details || '').split('\n');
                return new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 0, type: WidthType.AUTO },
                      children: [
                        new Paragraph({ spacing: { before: 10, after: 0 }, children: [new TextRun({ text: cleanText(entry.date), size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ spacing: { before: 0, after: 10 }, children: [new TextRun({ text: cleanText(entry.dayName), italics: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], alignment: AlignmentType.CENTER }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 0, type: WidthType.AUTO },
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
  saveAs(blob, `Diary_${nameVal.replace(/\s+/g, '_')}_${cleanText(metadata.fortnight)}_${metadata.month + 1}_${metadata.year}.docx`);
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

export const generateTACalculationsDoc = async (
  metadata: DiaryMetadata,
  activities: ActivityEntry[],
  movements: MovementEntry[],
  serviceCalls?: ServiceCallReport[]
) => {
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

    // Purpose of visit calculation: use details of problem reported in SCR on this date if available, or fallback to sequential office locations
    const matchingActivity = activities.find(a => (a.date || '').trim() === uDate);
    const matchingCalls = serviceCalls ? serviceCalls.filter(sc => (sc.date || '').trim() === uDate) : [];
    
    let purposeText = "";

    if (matchingCalls.length > 0) {
      // Collect details of problem reported in SCR
      const problemsReported = matchingCalls.flatMap(sc => 
        (sc.problems || []).map(p => p.reported?.trim())
      ).filter(Boolean);
      
      if (problemsReported.length > 0) {
        purposeText = problemsReported.join(", ");
      }
    }

    // Fallback to standard activity issues / offices visited if no SCR problems are reported
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

    // Auto sentence case for Purpose of visit
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

  const createBorderlessRow = (descText: string, valueText: string, isBold: boolean = false) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: cleanText(descText),
                  bold: isBold,
                  size: DEFAULT_SIZE,
                  font: DEFAULT_FONT,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: cleanText(valueText),
                  bold: isBold,
                  size: DEFAULT_SIZE,
                  font: DEFAULT_FONT,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };

  const doc = new Document({
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
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "TA Calculations",
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: HEADER_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),

          // Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
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
              // Header Row
              new TableRow({
                children: [
                  "Date", "Time", "From", "Date", "Time", "To", "Mode", "Km", "Fare", "Food", "Purpose of visit"
                ].map((h, idx) => new TableCell({
                  width: { size: [8, 6, 15, 8, 6, 15, 7, 5, 5, 8, 17][idx], type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [
                        new TextRun({ text: h, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT }),
                      ],
                      alignment: (idx === 2 || idx === 5 || idx === 10) ? AlignmentType.LEFT : AlignmentType.CENTER,
                    }),
                  ],
                })),
              }),

              // Data Rows
              ...sortedMovements.map((m, i) => {
                const isFirstForDate = i === 0 || (sortedMovements[i - 1].date || '').trim() !== (m.date || '').trim();
                const calc = dateCalculations[(m.date || '').trim()] || { food: "437.5", purpose: "Routine inspection / maintenance" };

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

                // Food cell with proper vertical merge matching same date
                let foodCell: TableCell;
                if (isFirstForDate) {
                  foodCell = new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    verticalMerge: VerticalMergeType.RESTART,
                    children: [
                      new Paragraph({
                        spacing: { before: 5, after: 5 },
                        children: [
                          new TextRun({ text: cleanText(calc.food), size: 19, font: DEFAULT_FONT }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  });
                } else {
                  foodCell = new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    verticalMerge: VerticalMergeType.CONTINUE,
                    children: [
                      new Paragraph({
                        spacing: { before: 5, after: 5 },
                        children: [new TextRun(" ")],
                      }),
                    ],
                  });
                }

                // Purpose of visit cell with proper vertical merge matching same date
                let purposeCell: TableCell;
                if (isFirstForDate) {
                  purposeCell = new TableCell({
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    verticalMerge: VerticalMergeType.RESTART,
                    children: [
                      new Paragraph({
                        spacing: { before: 5, after: 5 },
                        children: [
                          new TextRun({ text: cleanText(calc.purpose), size: 19, font: DEFAULT_FONT }),
                        ],
                        alignment: AlignmentType.LEFT,
                      }),
                    ],
                  });
                } else {
                  purposeCell = new TableCell({
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    verticalMerge: VerticalMergeType.CONTINUE,
                    children: [
                      new Paragraph({
                        spacing: { before: 5, after: 5 },
                        children: [new TextRun(" ")],
                      }),
                    ],
                  });
                }

                const standardValues = [
                  cleanText(m.date),
                  cleanText(to24hDot(m.fromTime)),
                  cleanText(m.fromLocation),
                  cleanText(m.toDate),
                  cleanText(to24hDot(m.toTime)),
                  cleanText(m.toLocation),
                  cleanText(m.mode),
                  cleanText(m.km),
                  cleanText(fareText),
                ];

                const cells = standardValues.map((v, idx) => new TableCell({
                  width: { 
                    size: [8, 6, 15, 8, 6, 15, 7, 5, 5][idx], 
                    type: WidthType.PERCENTAGE 
                  },
                  children: [
                    new Paragraph({
                      spacing: { before: 5, after: 5 },
                      children: [
                        new TextRun({ text: cleanText(v).toUpperCase(), size: 19, font: DEFAULT_FONT }),
                      ],
                      alignment: (idx === 2 || idx === 5) ? AlignmentType.LEFT : AlignmentType.CENTER,
                    }),
                  ],
                }));

                return new TableRow({
                  children: [
                    ...cells,
                    foodCell,
                    purposeCell,
                  ],
                });
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: "Certified that the amount charged as food bill was actually incurred by me.",
                font: DEFAULT_FONT,
                size: DEFAULT_SIZE,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 300 },
            children: [
              new TextRun({
                text: "It is also certified that vouchers were not given by the vendors for the food taken.",
                font: DEFAULT_FONT,
                size: DEFAULT_SIZE,
              }),
            ],
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
              createBorderlessRow(
                totalBikeKm > 200 
                  ? `Total No. of Kilometers Utilized through Two Wheelers ${totalBikeKm} km (Only 200 km charged) x Rs.15`
                  : `Total No. of Kilometers Utilized through Two Wheelers ${totalBikeKm} x Rs.15`, 
                `Rs. ${bikeCharges > 0 ? bikeCharges : 'Nil'}`
              ),
              createBorderlessRow(`Total Bus Fare paid`, `Rs. ${totalBusFare > 0 ? totalBusFare : 'Nil'}`),
              createBorderlessRow(`Amount of Food charges claimed`, `Rs. ${totalFoodCharges > 0 ? totalFoodCharges : 'Nil'}`),
              createBorderlessRow(`Total amount of locally journey performed`, `Rs. Nil`),
              createBorderlessRow(`Total Amount for Lodging`, `Rs. Nil`),
              createBorderlessRow(`Total`, `Rs. ${totalAmount > 0 ? totalAmount.toFixed(1) : 'Nil'}`),
              createBorderlessRow(`Less Advance Taken`, `Rs. Nil`),
              createBorderlessRow(`Net Amount Claimed`, `Rs. ${netAmountClaimed > 0 ? netAmountClaimed : 'Nil'}`, true),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100, after: 400 },
            children: [
              new TextRun({
                text: `(Rs. ${cleanText(currencyWords)} only)`,
                bold: true,
                size: DEFAULT_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),

          // Signature and Submission Section below Table
          new Paragraph({ spacing: { before: 800 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: cleanText(metadata.name), bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${cleanText(designation)},`, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${cleanText(metadata.office)}.`, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })
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
  saveAs(blob, `TA_Calculations_${cleanText(metadata.name).replace(/\s+/g, '_')}_FullMonth_${metadata.month + 1}_${metadata.year}.docx`);
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

const createSpacerParagraph = (before: number, after: number) => {
  return new Paragraph({
    spacing: { before, after }
  });
};

export const compileCopyChildrenForReport = (
  label: string,
  metadata: DiaryMetadata,
  headquarters: string,
  report: ServiceCallReport
) => {
  const division = cleanText(report.divisionName || "Cuddalore Division");
  const headerDivision = cleanText(division).replace(/\s+/g, '');

  const activeProblems = (report.problems || []).filter(p => (p.reported || "").trim() || (p.actionTaken || "").trim());
  const problemsToRender = activeProblems.length > 0 ? activeProblems : [{ reported: "", actionTaken: "", followUp: "" }];

  // Calculate total lines to render in the text cells to measure data density
  let totalLinesCount = 0;
  problemsToRender.forEach(p => {
    const repLines = (p.reported || "").split('\n').filter(line => line.trim()).length;
    const actLines = (p.actionTaken || "").split('\n').filter(line => line.trim()).length;
    const fUpLines = (p.followUp || "").split('\n').filter(line => line.trim()).length;
    totalLinesCount += Math.max(repLines, actLines, fUpLines, 1);
  });

  const lerp = (minVal: number, maxVal: number, scale: number): number => {
    return Math.round(minVal + (maxVal - minVal) * Math.min(1.2, Math.max(0, scale)));
  };

  const estimateHeight = (S: number): number => {
    const f_title1 = lerp(18, 26, S);
    const f_title2 = lerp(14, 22, S);
    const f_title3 = lerp(14, 24, S);
    const f_main = lerp(13, 21, S);
    
    const h_spaceBeforeHeader = lerp(10, 70, S);
    const h_spaceAfterHeader = lerp(10, 50, S);
    const h_spaceAfterSub = lerp(10, 50, S);
    const h_spaceAfterTitle3 = lerp(20, 100, S);
    
    const h_propSpaceVertical = lerp(2, 20, S);
    const h_probHeaderSpaceBeforeAfter = lerp(10, 45, S);
    const h_probCellSpaceBeforeAfter = lerp(1, 12, S);
    
    const h_signBefore = lerp(10, 40, S);
    const h_signAfter = lerp(10, 40, S);
    
    const h_pmSigSpaceBefore = lerp(100, 400, S);
    const h_remarksCellSpaceBeforeAfter = lerp(30, 160, S);
    
    const h_tableMarginsTopBottom = lerp(15, 60, S);

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
      report.officeAttended || "",
      report.callGivenBy || "",
      report.date || "",
      report.timeIn || "",
      report.timeOut || ""
    ];
    let table1Lines = 0;
    rawMetadata.forEach((val) => {
      table1Lines += Math.max(1, Math.ceil(val.length / 28));
    });
    const heightTable1 = 
      (table1Lines * lineHeight) + 
      (7 * 2 * h_propSpaceVertical) + 
      (7 * 2 * h_tableMarginsTopBottom);

    // 3. Distance before Table 2 (empty paragraph has h_probHeaderSpaceBeforeAfter * 2 spacing + minimum line height of ~180 dxa)
    const heightSpace2 = h_probHeaderSpaceBeforeAfter * 2 + 180;

    // 4. Table 2 height
    const heightTable2Header = lineHeight + h_probHeaderSpaceBeforeAfter * 2;
    
    let heightTable2Rows = 0;
    problemsToRender.forEach(p => {
      const reportedLines = (p.reported || "").split('\n').map(line => line.trim()).filter(Boolean);
      const actionLines = (p.actionTaken || "").split('\n').map(line => line.trim()).filter(Boolean);
      const followLines = (p.followUp || "").split('\n').map(line => line.trim()).filter(Boolean);

      let repLinesTotalCount = 0;
      reportedLines.forEach(l => {
        repLinesTotalCount += Math.max(1, Math.ceil(l.length / 18));
      });
      let actLinesTotalCount = 0;
      actionLines.forEach(l => {
        actLinesTotalCount += Math.max(1, Math.ceil(l.length / 18));
      });
      let fUpLinesTotalCount = 0;
      followLines.forEach(l => {
        fUpLinesTotalCount += Math.max(1, Math.ceil(l.length / 9));
      });

      const maxRowLines = Math.max(repLinesTotalCount, actLinesTotalCount, fUpLinesTotalCount, 1);
      const numParagraphs = Math.max(reportedLines.length, actionLines.length, followLines.length, 1);
      
      heightTable2Rows += (maxRowLines * lineHeight) + (numParagraphs * 2 * h_probCellSpaceBeforeAfter);
    });

    const heightTable2 = heightTable2Header + heightTable2Rows + ((1 + problemsToRender.length) * 2 * h_tableMarginsTopBottom);

    // 5. Space before Spares (empty paragraph has h_signBefore + h_signAfter spacing + minimum line height of ~180 dxa)
    const heightSpaceSpares = h_signBefore + h_signAfter + 180;

    // 6. Spares items
    const sparesValLines = Math.max(1, Math.ceil((41 + (report.replacementOfSpares || "").length) / 45)) +
                          Math.max(1, Math.ceil((41 + (report.amountOfSpares || "").length) / 45));
    const heightSpares = (sparesValLines * lineHeight) + (3 * h_propSpaceVertical) + h_signAfter;

    // 7. Signature Table
    const heightSigSM = lineHeight + h_signBefore + h_signAfter + (2 * h_tableMarginsTopBottom);

    // 8. Distance before peripherals (empty paragraph has h_signBefore + h_signAfter spacing + minimum line height of ~180 dxa)
    const heightSpacePeriph = h_signBefore + h_signAfter + 180;

    // 9. Peripherals line
    const periphTextLines = Math.max(1, Math.ceil((49 + (report.otherIssues || "").length) / 45));
    const heightPeriph = (periphTextLines * lineHeight) + (h_propSpaceVertical + 5) * 2;

    // 10. PM Signature paragraph
    const heightPMSig = lineHeight + h_pmSigSpaceBefore + h_signAfter;

    // 11. Distance before Remarks (empty paragraph has h_signBefore + h_signAfter spacing + minimum line height of ~180 dxa)
    const heightSpaceRemarks = h_signBefore + h_signAfter + 180;

    // 12. Remarks Table
    const heightRemarksHeader = lineHeight + Math.max(15, h_remarksCellSpaceBeforeAfter / 4) * 2;
    const heightRemarksBody = h_remarksCellSpaceBeforeAfter * 2;
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

  let bestScale = 1.0;
  const targetBudget = 9800; // Force layout to fit inside single page landscape bounds while fully utilizing it

  // Linear scan to find the exact scale that sits below the target Budget
  for (let s = 1.5; s >= 0.0; s -= 0.02) {
    if (estimateHeight(s) <= targetBudget) {
      bestScale = s;
      break;
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
  
  const propSpaceVertical = lerp(2, 20, S);
  const probHeaderSpaceBeforeAfter = lerp(10, 45, S);
  const probCellSpaceBeforeAfter = lerp(1, 12, S);
  
  const signBefore = lerp(10, 40, S);
  const signAfter = lerp(10, 40, S);
  
  const pmSigSpaceBefore = lerp(100, 400, S);
  const remarksCellSpaceBeforeAfter = lerp(30, 160, S);

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
        ["Date", ":", cleanText(report.date || "")],
        ["Time in", ":", cleanText(report.timeIn || "")],
        ["Time out", ":", cleanText(report.timeOut || "")],
        ["Name of the office attended", ":", toSentenceCase(report.officeAttended || "")],
        ["Call given by", ":", toSentenceCase(report.callGivenBy || "")],
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
                  const sentenceCased = toSentenceCase(trimmed);
                  const hasBullet = sentenceCased.startsWith('❖') || sentenceCased.startsWith('*') || sentenceCased.startsWith('•');
                  const displayLine = hasBullet ? sentenceCased : `❖ ${sentenceCased}`;
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
                  const sentenceCased = toSentenceCase(trimmed);
                  const hasBullet = sentenceCased.startsWith('❖') || sentenceCased.startsWith('*') || sentenceCased.startsWith('•');
                  const displayLine = hasBullet ? sentenceCased : `❖ ${sentenceCased}`;
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
                  const sentenceCased = toSentenceCase(trimmed);
                  return new Paragraph({
                    spacing: { before: probCellSpaceBeforeAfter, after: probCellSpaceBeforeAfter },
                    children: [
                      new TextRun({ text: sentenceCased, size: sizeMain, font: "Calibri" })
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
        new TextRun({ text: "Replacement of spares, if any required : ", bold: true, size: sizeMain, font: "Calibri" }),
        new TextRun({ text: toSentenceCase(report.replacementOfSpares || "None"), size: sizeMain, font: "Calibri" }),
      ]
    }),
    new Paragraph({
      spacing: { before: propSpaceVertical, after: signAfter },
      children: [
        new TextRun({ text: "Amount of purchase of spare (approx) : ", bold: true, size: sizeMain, font: "Calibri" }),
        new TextRun({ text: toSentenceCase(report.amountOfSpares || "None"), size: sizeMain, font: "Calibri" }),
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
        new TextRun({ text: toSentenceCase(report.otherIssues || "NSP 2"), bold: true, size: sizeMain, font: "Calibri" }),
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
                  spacing: { before: Math.max(15, remarksCellSpaceBeforeAfter / 4), after: Math.max(15, remarksCellSpaceBeforeAfter / 4) },
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
    new Paragraph({})
  ];
};

export const getServiceCallReportBlob = async (
  metadata: DiaryMetadata,
  headquarters: string,
  report: ServiceCallReport
): Promise<{ blob: Blob; fileName: string }> => {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE,
            size: {
              width: 16838, // A4 landscape width (29.7 cm) in dxa
              height: 11906, // A4 landscape height (21 cm) in dxa
              code: 9,       // A4 paper size code
            },
            margin: {
              top: 250,
              right: 400,
              bottom: 250,
              left: 400,
            },
          },
        },
        children: [
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
                    width: { size: 48, type: WidthType.PERCENTAGE },
                    children: compileCopyChildrenForReport("ORIGINAL", metadata, headquarters, report),
                  }),
                  new TableCell({
                    width: { size: 4, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun(" ")] })],
                  }),
                  new TableCell({
                    width: { size: 48, type: WidthType.PERCENTAGE },
                    children: compileCopyChildrenForReport("DUPLICATE", metadata, headquarters, report),
                  }),
                ],
              }),
            ],
          }),
        ],
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
  reports: ServiceCallReport[]
): Promise<{ blob: Blob; fileName: string } | null> => {
  if (reports.length === 0) return null;

  const sections = reports.map(report => {
    return {
      properties: {
        page: {
          orientation: PageOrientation.LANDSCAPE,
          size: {
            width: 16838, // A4 landscape width (29.7 cm) in dxa
            height: 11906, // A4 landscape height (21 cm) in dxa
            code: 9,       // A4 paper size code
          },
          margin: {
            top: 250,
            right: 400,
            bottom: 250,
            left: 400,
          },
        },
      },
      children: [
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
                  width: { size: 48, type: WidthType.PERCENTAGE },
                  children: compileCopyChildrenForReport("ORIGINAL", metadata, headquarters, report),
                }),
                new TableCell({
                  width: { size: 4, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun(" ")] })],
                }),
                new TableCell({
                  width: { size: 48, type: WidthType.PERCENTAGE },
                  children: compileCopyChildrenForReport("DUPLICATE", metadata, headquarters, report),
                }),
              ],
            }),
          ],
        }),
      ]
    };
  });

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  const formattedDate = cleanText(reports[0].date).replace(/[\s\.]+/g, '_');
  const fileName = `Merged_Service_Call_Reports_${formattedDate}_All.docx`;
  return { blob, fileName };
};

export const generateMultipleServiceCallReportsDoc = async (
  metadata: DiaryMetadata,
  headquarters: string,
  reports: ServiceCallReport[]
) => {
  const result = await getMultipleServiceCallReportsBlob(metadata, headquarters, reports);
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
  if (headquarters === "Cuddalore HO" || headquarters === "Kurinjipadi SO" || headquarters === "Kurinjipadi S.O") {
    headquarters = "Kurinjipadi S.O";
  }

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
      height: { value: 567, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
      children: [
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Period of stay (From - To)", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Name of Hotel", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Daily rate of lodging (Rs)", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "Total amount paid (Rs)", bold: true, size: 18, font: DEFAULT_FONT })] })] }),
      ],
    }),
    new TableRow({
      height: { value: 227, rule: HeightRule.AT_LEAST },
      children: ["1", "2", "3", "4"].map((num, i) => new TableCell({
        width: { size: table9ColWidths[i], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: num, size: 16, font: DEFAULT_FONT })] })]
      })),
    }),
  ];
  for (let i = 0; i < 8; i++) {
    table9Rows.push(
      new TableRow({
        height: { value: 227, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
      children: ["1", "2", "3", "4", "5", "6", "7"].map((num, i) => new TableCell({
        width: { size: table10ColWidths[i], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: num, size: 16, font: DEFAULT_FONT })] })]
      })),
    }),
  ];
  for (let i = 0; i < 7; i++) {
    table10Rows.push(
      new TableRow({
        height: { value: 227, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
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
      height: { value: 227, rule: HeightRule.AT_LEAST },
      children: ["1", "2", "3", "4"].map((num, i) => new TableCell({
        width: { size: table11ColWidths[i], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: num, size: 16, font: DEFAULT_FONT })] })]
      })),
    }),
  ];
  for (let i = 0; i < 5; i++) {
    table11Rows.push(
      new TableRow({
        height: { value: 227, rule: HeightRule.AT_LEAST },
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
    styles: {
      default: {
        paragraph: {
          spacing: {
            line: 360,
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

