import { FormEvent, useEffect, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  Plus,
  ReceiptText,
  Search,
  X,
  Trash2,
} from "lucide-react";
import {
  Expense,
  Job,
  listExpenses,
  listJobs,
  saveExpense,
  deleteRecord,
} from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";
import "./expense-links.css";
import "./vendor-payables.css";

const categories = [
  "Materials",
  "Ink & toner",
  "Paper",
  "Transport",
  "Electricity",
  "Rent",
  "Salaries",
  "Internet",
  "Repairs",
  "Machine maintenance",
  "Outsourced printing",
  "Advertising",
  "Other",
];
const blank = (): Expense => ({
  category: "Materials",
  payee: "",
  description: "",
  amount: 0,
  amountPaid: 0,
  dueDate: "",
  paymentStatus: "unpaid",
  expenseDate: localExpenseDate(),
  paymentMethod: "cash",
  reference: "",
  notes: "",
});
function localExpenseDate(){const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10)}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting,setDeleting]=useState<Expense|null>(null);const[deleteError,setDeleteError]=useState("");
  const load = async (query = search) => {
    const [records, jobList] = await Promise.all([
      listExpenses(query),
      listJobs(),
    ]);
    setExpenses(records);
    setJobs(jobList);
  };
  useEffect(() => {
    void load("");
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(search), 180);
    return () => clearTimeout(timer);
  }, [search]);
  const update = (field: keyof Expense, value: string | number | null) =>
    setEditing((current) =>
      current ? { ...current, [field]: value } : current,
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const wasEditing = !!editing.id;
      const saved = await saveExpense(editing);
      notifyActivity({
        title: `Expense ${wasEditing ? "updated" : "recorded"}`,
        detail: `${saved.description} · UGX ${saved.amount.toLocaleString("en-UG")}`,
        page: "Expenses",
        tone: "info",
      });
      setEditing(null);
      await load();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  };
  const removeExpense=async()=>{if(!deleting?.id)return;setSaving(true);setDeleteError("");try{await deleteRecord("expense",deleting.id);notifyActivity({title:`${deleting.expenseNumber||"Expense"} deleted`,detail:"The expense was removed permanently.",page:"Expenses",tone:"warning"});setDeleting(null);setEditing(null);await load()}catch(reason){setDeleteError(String(reason))}finally{setSaving(false)}};
  const today = localExpenseDate();
  const month = today.slice(0, 7);
  const visibleExpenses = expenses.filter(
    (item) =>
      (categoryFilter === "all" || item.category === categoryFilter) &&
      (paymentFilter === "all" || item.paymentStatus === paymentFilter) &&
      (periodFilter === "all" ||
        (periodFilter === "today" && item.expenseDate === today) ||
        (periodFilter === "month" && item.expenseDate.startsWith(month)) ||
        (periodFilter === "custom" && !!customDate && item.expenseDate === customDate) ||
        (periodFilter === "job" && !!item.jobId)),
  );

  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">MONEY OUT</p>
          <h1>Expenses</h1>
          <p>
            Record operating expenses and costs belonging to individual print
            jobs.
          </p>
        </div>
        <button className="primary-button" onClick={() => setEditing(blank())}>
          <Plus size={17} /> New expense
        </button>
      </section>
      <section className="finance-cards vendor-finance-cards">
        <div>
          <span>
            <Banknote size={18} />
          </span>
          <p>
            <small>Spent today</small>
            <strong>
              UGX{" "}
              {expenses
                .filter((item) => item.expenseDate === today)
                .reduce((sum, item) => sum + item.amount, 0)
                .toLocaleString("en-UG")}
            </strong>
          </p>
        </div>
        <div className="vendor-owed-card"><span><Banknote size={18}/></span><p><small>Total owed to vendors</small><strong>UGX {expenses.reduce((sum,item)=>sum+Math.max(0,item.amount-(item.amountPaid??(item.paymentStatus==="paid"?item.amount:0))),0).toLocaleString("en-UG")}</strong></p></div>
        <div>
          <span>
            <ReceiptText size={18} />
          </span>
          <p>
            <small>Spent this month</small>
            <strong>
              UGX{" "}
              {expenses
                .filter((item) => item.expenseDate.slice(0, 7) === month)
                .reduce((sum, item) => sum + item.amount, 0)
                .toLocaleString("en-UG")}
            </strong>
          </p>
        </div>
        <div>
          <span>
            <BriefcaseBusiness size={18} />
          </span>
          <p>
            <small>Job-specific costs shown</small>
            <strong>
              UGX{" "}
              {expenses
                .filter((item) => item.jobId)
                .reduce((sum, item) => sum + item.amount, 0)
                .toLocaleString("en-UG")}
            </strong>
          </p>
        </div>
      </section>
      <section className="customer-toolbar filtered-toolbar">
        <div>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search expense, category, payee or description…"
          />
        </div>
        <div className="toolbar-filters">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="month">This month</option>
            <option value="custom">Custom date…</option>
            <option value="job">Job-related only</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            aria-label="Filter expenses by payment status"
          >
            <option value="all">All payment statuses</option>
            <option value="paid">Paid</option>
            <option value="part-paid">Part-paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          {periodFilter === "custom" && <input className="expenses-custom-date" type="date" value={customDate} onChange={event => setCustomDate(event.target.value)} aria-label="Choose expense date" />}
        </div>
        <span>{visibleExpenses.length} expenses</span>
      </section>
      <section className="customer-panel">
        {visibleExpenses.length === 0 ? (
          <div className="customer-empty">
            <div>
              <ReceiptText size={28} />
            </div>
            <h2>
              {search || categoryFilter !== "all" || paymentFilter !== "all" || periodFilter !== "all"
                ? "No expenses found"
                : "Record your first expense"}
            </h2>
            <p>Expenses feed cash-flow and profit reports immediately.</p>
            {!search && categoryFilter === "all" && paymentFilter === "all" && periodFilter === "all" && (
              <button
                className="primary-button"
                onClick={() => setEditing(blank())}
              >
                <Plus size={16} /> New expense
              </button>
            )}
          </div>
        ) : (
          <div className="expense-list">
            <div className="expense-row labels">
              <span>EXPENSE</span>
              <span>DESCRIPTION</span>
              <span>CATEGORY</span>
              <span>PAYEE</span>
              <span>JOB</span>
              <span>PAYMENT</span>
              <span>AMOUNT</span>
            </div>
            {visibleExpenses.map((expense) => (
              <button
                className={`expense-row ${expense.purchaseId?"purchase-linked":""}`}
                key={expense.id}
                onClick={() => !expense.purchaseId && setEditing(expense)}
              >
                <span>
                  <strong>{expense.expenseNumber}</strong>
                  <small>{expense.expenseDate}</small>
                </span>
                <span>{expense.description}{expense.purchaseId&&<small>Linked to material purchase</small>}</span>
                <span>{expense.category}</span>
                <span>{expense.payee || "Not specified"}</span>
                <span>{expense.jobNumber || "General"}</span>
                <span className="expense-payment-state"><i className={expense.paymentStatus||"paid"}>{(expense.paymentStatus||"paid").replace("-"," ")}</i><small>Balance: UGX {Math.max(0,expense.amount-(expense.amountPaid??(expense.paymentStatus==="paid"?expense.amount:0))).toLocaleString("en-UG")}</small></span>
                <strong>UGX {expense.amount.toLocaleString("en-UG")}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <div className="modal-backdrop">
          <form className="customer-modal" onSubmit={submit}>
            <div className="modal-head">
              <div>
                <span>
                  <ReceiptText size={18} />
                </span>
                <div>
                  <h2>{editing.id ? editing.expenseNumber : "New expense"}</h2>
                  <p>Operating or job-specific cost</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={19} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>
                  Category
                  <select
                    value={editing.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Expense date
                  <input
                    type="date"
                    required
                    value={editing.expenseDate}
                    onChange={(e) => update("expenseDate", e.target.value)}
                  />
                </label>
              </div>
              <section className="vendor-payment-box"><header><div><strong>Vendor payment</strong><small>Track credit, partial payments and the remaining balance.</small></div><i className={editing.amountPaid&&editing.amountPaid>=editing.amount?"paid":editing.amountPaid?"part-paid":"unpaid"}>{editing.amountPaid&&editing.amountPaid>=editing.amount?"Paid":editing.amountPaid?"Part paid":"Unpaid"}</i></header><div className="form-row"><label>Amount paid so far (UGX)<input type="number" min="0" step="any" max={editing.amount||undefined} value={editing.amountPaid??0} onChange={e=>update("amountPaid",Number(e.target.value))}/></label><label>Payment due date<input type="date" value={editing.dueDate??""} onChange={e=>update("dueDate",e.target.value)}/></label></div><div className="vendor-balance"><span><small>Total expense</small><strong>UGX {editing.amount.toLocaleString("en-UG")}</strong></span><span><small>Paid</small><strong>UGX {(editing.amountPaid??0).toLocaleString("en-UG")}</strong></span><span><small>Remaining</small><strong>UGX {Math.max(0,editing.amount-(editing.amountPaid??0)).toLocaleString("en-UG")}</strong></span></div><div className="expense-payment-presets"><button type="button" onClick={()=>update("amountPaid",0)}>Mark unpaid</button><button type="button" onClick={()=>update("amountPaid",editing.amount/2)}>Half paid</button><button type="button" onClick={()=>update("amountPaid",editing.amount)}>Mark fully paid</button></div></section>
              <label>
                Description
                <input
                  autoFocus
                  required
                  value={editing.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What was paid for?"
                />
              </label>
              <div className="form-row">
                <label>
                  Amount (UGX)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    required
                    value={editing.amount || ""}
                    onChange={(e) => update("amount", Number(e.target.value))}
                    placeholder="e.g. 50000"
                  />
                </label>
                <label>
                  Paid to <small>(optional)</small>
                  <input
                    value={editing.payee}
                    onChange={(e) => update("payee", e.target.value)}
                    placeholder="Supplier or person"
                  />
                </label>
              </div>
              <label>
                Related print job <small>(optional)</small>
                <select
                  value={editing.jobId ?? ""}
                  onChange={(e) => update("jobId", e.target.value || null)}
                >
                  <option value="">General business expense</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id ?? ""}>
                      {job.jobNumber} — {job.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Payment method
                  <select
                    value={editing.paymentMethod}
                    onChange={(e) => update("paymentMethod", e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="mtn_momo">MTN Mobile Money</option>
                    <option value="airtel_money">Airtel Money</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </label>
                <label>
                  Reference <small>(optional)</small>
                  <input
                    value={editing.reference}
                    onChange={(e) => update("reference", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Notes <small>(optional)</small>
                <textarea
                  rows={3}
                  value={editing.notes}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </label>
              {error && <p className="setup-error">{error}</p>}
            </div>
            <div className="modal-actions">
              {editing.id&&<button type="button" className="delete-link" onClick={()=>setDeleting(editing)}><Trash2/> Delete expense</button>}
              <button
                type="button"
                className="setup-back"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="setup-next" disabled={saving}>
                {saving ? "Saving…" : "Save expense"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleting&&<DeleteConfirm name={deleting.expenseNumber||deleting.description||"Expense"} kind="expense" busy={saving} error={deleteError} onCancel={()=>setDeleting(null)} onConfirm={()=>void removeExpense()}/>} 
    </>
  );
}
