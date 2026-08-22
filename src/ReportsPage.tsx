import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Banknote, BriefcaseBusiness, CircleDollarSign, Download, WalletCards } from "lucide-react";
import { FinanceSummary, getFinanceSummary } from "./lib/desktop";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;
const empty: FinanceSummary = { fromDate: monthStart(), toDate: today(), invoiced: 0, collected: 0, expenses: 0, netCash: 0, outstanding: 0, jobCosts: 0, categories: [] };

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [report, setReport] = useState(empty);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setReport(await getFinanceSummary(fromDate, toDate)); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [fromDate, toDate]);
  const money = (value: number) => `UGX ${value.toLocaleString("en-UG")}`;
  const max = Math.max(...report.categories.map(item => item.amount), 1);

  const exportExecutiveReport = () => {
    const rows: Array<Array<string | number>> = [
      ["PRINTMANAGER EXECUTIVE FINANCIAL REPORT"],
      ["Reporting period", `${fromDate} to ${toDate}`],
      ["Generated", new Date().toLocaleString("en-UG")],
      [],
      ["FINANCIAL SUMMARY", "AMOUNT (UGX)"],
      ["Invoiced", report.invoiced],
      ["Cash collected", report.collected],
      ["Expenses", report.expenses],
      ["Net cash movement", report.netCash],
      ["Outstanding customer balance", report.outstanding],
      ["Job-linked expenses", report.jobCosts],
      [],
      ["EXPENSE CATEGORY", "AMOUNT (UGX)"],
      ...report.categories.map(item => [item.category, item.amount] as Array<string | number>),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `PrintManager-Executive-Report-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <section className="list-heading"><div><p className="eyebrow">LIVE FINANCIALS</p><h1>Cash flow & profit</h1><p>Calculated from saved invoices, payments and expenses—not estimates.</p></div><div className="report-controls"><div className="report-dates"><label>From<input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label><label>To<input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></label></div><button className="primary-button report-export" onClick={exportExecutiveReport} disabled={loading}><Download /> Export executive report</button></div></section>
    <section className="report-metrics"><article><span><CircleDollarSign /></span><small>Invoiced</small><strong>{money(report.invoiced)}</strong></article><article><span><Banknote /></span><small>Cash collected</small><strong>{money(report.collected)}</strong></article><article><span><ArrowDownRight /></span><small>Expenses</small><strong>{money(report.expenses)}</strong></article><article className={report.netCash < 0 ? "negative" : "positive"}><span>{report.netCash < 0 ? <ArrowDownRight /> : <ArrowUpRight />}</span><small>Net cash movement</small><strong>{money(report.netCash)}</strong></article></section>
    <section className="report-grid"><div className="panel"><div className="panel-head"><div><h2>Expense breakdown</h2><p>{fromDate} to {toDate}</p></div></div>{loading ? <div className="live-empty">Calculating…</div> : report.categories.length === 0 ? <div className="live-empty"><WalletCards size={24} /><strong>No expenses in this period</strong><p>Recorded expenses will appear here.</p></div> : <div className="category-bars">{report.categories.map(item => <div key={item.category}><p><span>{item.category}</span><strong>{money(item.amount)}</strong></p><i><span style={{ width: `${(item.amount / max) * 100}%` }} /></i></div>)}</div>}</div><div className="panel report-side"><div className="panel-head"><div><h2>Business position</h2><p>Current balances and tracked costs</p></div></div><div><span><WalletCards /></span><p><small>Outstanding customer balance</small><strong>{money(report.outstanding)}</strong></p></div><div><span><BriefcaseBusiness /></span><p><small>Expenses linked to jobs</small><strong>{money(report.jobCosts)}</strong></p></div><div className="report-note"><strong>How profit is shown</strong><p>Net cash is money collected minus expenses paid during the selected period. Invoiced amounts are shown separately because customers may not have paid them yet.</p></div></div></section>
  </>;
}
