export const BI_TEMPLATE_HEADERS =
  "Date,Customer,Rebar Grade,Tonnage,Unit Price,Status,Conversion,Sales Rep,Region,Cost";

export const BI_TEMPLATE_CSV = `${BI_TEMPLATE_HEADERS}
2026-01-05,Alborz Construction,A615 Gr60,42,650,Closed,1,Sara Ahmadi,Tehran,590
2026-01-12,Pars Steel Traders,A706,18,690,Closed,1,Reza Karimi,Isfahan,610
2026-01-20,Kian Builders,A615 Gr60,25,640,Open,0,Sara Ahmadi,Tehran,
`;

/** A richer, multi-month demo dataset used for the "Try sample data" onboarding
 * action — exercises trends, forecasting, customer concentration, rep/region
 * breakdowns, and margin so a first-time visitor can see the full feature set. */
export const BI_SAMPLE_CSV = `${BI_TEMPLATE_HEADERS}
2025-09-03,Alborz Construction,A615 Gr60,60,610,Closed,1,Sara Ahmadi,Tehran,555
2025-09-10,Pars Steel Traders,A706,22,650,Closed,1,Reza Karimi,Isfahan,590
2025-09-18,Kian Builders,A615 Gr60,35,600,Closed,1,Sara Ahmadi,Tehran,550
2025-09-25,Damavand Rebar Co,B500B,15,670,Open,0,Reza Karimi,Isfahan,
2025-10-02,Alborz Construction,A615 Gr60,55,615,Closed,1,Sara Ahmadi,Tehran,558
2025-10-09,Zagros Metal Group,A706,30,660,Closed,1,Leila Moradi,Shiraz,600
2025-10-16,Pars Steel Traders,A615 Gr60,20,620,Closed,1,Reza Karimi,Isfahan,560
2025-10-23,Kian Builders,B500B,18,675,Lost,0,Sara Ahmadi,Tehran,
2025-11-01,Alborz Construction,A615 Gr60,58,625,Closed,1,Sara Ahmadi,Tehran,562
2025-11-08,Damavand Rebar Co,B500B,25,690,Closed,1,Reza Karimi,Isfahan,610
2025-11-15,Zagros Metal Group,A706,33,665,Closed,1,Leila Moradi,Shiraz,605
2025-11-22,Kian Builders,A615 Gr60,28,630,Closed,1,Sara Ahmadi,Tehran,565
2025-12-01,Alborz Construction,A615 Gr60,62,635,Closed,1,Sara Ahmadi,Tehran,570
2025-12-08,Pars Steel Traders,A706,24,670,Closed,1,Reza Karimi,Isfahan,615
2025-12-15,Damavand Rebar Co,B500B,20,700,Closed,1,Reza Karimi,Isfahan,620
2025-12-22,Zagros Metal Group,A615 Gr60,31,640,Open,0,Leila Moradi,Shiraz,
2026-01-05,Alborz Construction,A615 Gr60,65,645,Closed,1,Sara Ahmadi,Tehran,575
2026-01-12,Pars Steel Traders,A706,26,680,Closed,1,Reza Karimi,Isfahan,620
2026-01-19,Kian Builders,A615 Gr60,34,650,Closed,1,Sara Ahmadi,Tehran,580
2026-01-26,Damavand Rebar Co,B500B,22,710,Closed,1,Reza Karimi,Isfahan,625
2026-02-02,Alborz Construction,A615 Gr60,40,900,Closed,1,Sara Ahmadi,Tehran,578
2026-02-09,Zagros Metal Group,A706,29,690,Closed,1,Leila Moradi,Shiraz,610
2026-02-16,Kian Builders,A615 Gr60,20,300,Closed,1,Sara Ahmadi,Tehran,582
2026-02-23,Pars Steel Traders,B500B,18,715,Open,0,Reza Karimi,Isfahan,
`;

export function csvToFile(csv: string, filename: string): File {
  return new File([csv], filename, { type: "text/csv" });
}
