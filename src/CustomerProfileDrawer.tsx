import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BriefcaseBusiness, Building2, FileText, Mail, MapPin, Phone, Plus, ReceiptText, UserRound, X } from "lucide-react";
import { Customer, Invoice, Job, Quotation, listInvoices, listJobs, listQuotations } from "./lib/desktop";

type Props = { customer: Customer; onClose: () => void; onNewOrder: () => void };

export default function CustomerProfileDrawer({ customer, onClose, onNewOrder }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([listJobs(""), listQuotations(), listInvoices()]).then(([allJobs, allQuotes, allInvoices]) => {
      if (cancelled) return;
      setJobs(allJobs.filter(item => item.customerId === customer.id));
      setQuotes(allQuotes.filter(item => item.customerId === customer.id));
      setInvoices(allInvoices.filter(item => item.customerId === customer.id));
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customer.id]);

  const totals = useMemo(() => ({
    orderValue: jobs.reduce((sum, item) => sum + item.totalAmount, 0),
    invoiced: invoices.reduce((sum, item) => sum + item.total, 0),
    balance: invoices.reduce((sum, item) => sum + item.balance, 0),
  }), [jobs, invoices]);
  const money = (value: number) => `UGX ${value.toLocaleString("en-UG")}`;
  const initials = customer.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "CU";

  return <div className="customer-profile-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="customer-profile-drawer">
      <header><div className="customer-profile-title"><span>{initials}</span><div><small>CUSTOMER PROFILE</small><h2>{customer.name}</h2><p>{customer.company || "Individual customer"}</p></div></div><button onClick={onClose} aria-label="Close customer profile"><X /></button></header>
      <div className="customer-profile-actions"><button className="primary-button" onClick={onNewOrder}><Plus /> New order</button><span>{jobs.length} {jobs.length === 1 ? "order" : "orders"} on record</span></div>
      <div className="customer-profile-body">
        <section className="customer-contact-card"><h3><UserRound /> Customer details</h3><div className="customer-contact-grid"><p><Phone /><span><small>Phone</small><strong>{customer.phone || "Not provided"}</strong></span></p><p><Mail /><span><small>Email</small><strong>{customer.email || "Not provided"}</strong></span></p><p><MapPin /><span><small>Address</small><strong>{customer.address || "Not provided"}</strong></span></p><p><Building2 /><span><small>TIN</small><strong>{customer.tin || "Not provided"}</strong></span></p></div>{customer.notes && <p className="customer-profile-notes">{customer.notes}</p>}</section>
        <section className="customer-value-grid"><article><small>Order value</small><strong>{money(totals.orderValue)}</strong></article><article><small>Total invoiced</small><strong>{money(totals.invoiced)}</strong></article><article className={totals.balance > 0 ? "due" : ""}><small>Outstanding</small><strong>{money(totals.balance)}</strong></article></section>
        {loading ? <div className="customer-activity-empty">Loading customer activity</div> : <>
          <ActivitySection title="Orders & jobs" icon={BriefcaseBusiness} empty="No orders created yet.">{jobs.map(item => <article key={item.id}><span><strong>{item.jobNumber || "New job"}</strong><small>{item.title}</small></span><i className={`customer-activity-status ${item.status}`}>{item.status.replaceAll("_", " ")}</i><b>{money(item.totalAmount)}</b></article>)}</ActivitySection>
          <ActivitySection title="Quotations" icon={FileText} empty="No quotations created yet.">{quotes.map(item => <article key={item.id}><span><strong>{item.quotationNumber || "Draft quotation"}</strong><small>Issued {item.issueDate}</small></span><i className="customer-activity-status">{item.status}</i><b>{money(item.total)}</b></article>)}</ActivitySection>
          <ActivitySection title="Invoices" icon={ReceiptText} empty="No invoices created yet.">{invoices.map(item => <article key={item.id}><span><strong>{item.invoiceNumber || "Invoice"}</strong><small>Due {item.dueDate}</small></span><i className={`customer-activity-status ${item.status}`}>{item.status.replaceAll("_", " ")}</i><b>{money(item.total)}</b></article>)}</ActivitySection>
        </>}
      </div>
    </aside>
  </div>;
}

function ActivitySection({ title, icon: Icon, empty, children }: { title: string; icon: typeof BriefcaseBusiness; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="customer-activity"><header><Icon /><h3>{title}</h3></header>{hasItems ? <div>{children}</div> : <p className="customer-activity-empty">{empty}</p>}</section>;
}
