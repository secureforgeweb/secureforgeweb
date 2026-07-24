import {
  fetchHttpSecuritySnapshot,
  assessHttpSecurityItems,
} from "../backend/src/services/checklistAssessor.js";

const items = [
  { id: 1, code: "HEADER-01" },
  { id: 2, code: "HEADER-02" },
  { id: 3, code: "HEADER-03" },
  { id: 4, code: "HEADER-04" },
  { id: 5, code: "DATA-01" },
];

for (const url of [
  "https://localhost:5173/",
  "https://localhost:3000/api/health",
  "https://localhost:3000/",
]) {
  try {
    const snap = await fetchHttpSecuritySnapshot(url);
    const assessed = assessHttpSecurityItems(snap, items);
    console.log("OK", url);
    console.log("  final", snap.finalUrl, "status", snap.statusCode);
    console.log(
      "  csp",
      snap.headers["content-security-policy"]?.slice(0, 80) ?? "(none)"
    );
    console.log("  hsts", snap.headers["strict-transport-security"] ?? "(none)");
    console.log("  xfo", snap.headers["x-frame-options"] ?? "(none)");
    console.log("  nosniff", snap.headers["x-content-type-options"] ?? "(none)");
    console.log(
      "  result",
      assessed.map((a) => `${a.itemCode}:${a.compliance}`).join(", ")
    );
  } catch (e) {
    console.log("FAIL", url, e instanceof Error ? e.message : e);
  }
}
