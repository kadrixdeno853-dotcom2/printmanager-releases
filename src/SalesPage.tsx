import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CircleDollarSign,
  Eye,
  FileText,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  BusinessProfile,
  Customer,
  Invoice,
  InvoiceItem,
  Payment,
  Product,
  deleteRecord,
  getBusinessProfile,
  getInvoice,
  listCustomers,
  listInvoices,
  listPayments,
  listProducts,
  recordPayment,
  saveInvoice,
} from "./lib/desktop";
import InvoicePreview from "./InvoicePreview";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";

const today = () => new Date().toISOString().slice(0, 10);
const blankItem = (): InvoiceItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
});
const blankInvoice = (): Invoice => ({
  issueDate: today(),
  dueDate: today(),
  status: "unpaid",
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  amountPaid: 0,
  balance: 0,
  notes: "",
  items: [blankItem()],
});
const blankPayment = (invoiceId: string): Payment => ({
  invoiceId,
  amount: 0,
  paymentMethod: "cash",
  reference: "",
  paidAt: new Date().toISOString().slice(0, 16),
  notes: "",
});

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [initialReceipt, setInitialReceipt] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const load = async () => {
    const [invoiceList, customerList, productList, profile] = await Promise.all(
      [listInvoices(), listCustomers(), listProducts(), getBusinessProfile()],
    );
    setInvoices(invoiceList);
    setCustomers(customerList);
    setProducts(productList.filter((product) => product.isActive));
    setBusiness(profile);
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = invoices.filter(
    (invoice) =>
      !search ||
      [invoice.invoiceNumber, invoice.customerName, invoice.status].some(
        (value) => value?.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const totals = useMemo(() => {
    const subtotal =
      editing?.items.reduce((sum, item) => sum + item.total, 0) ?? 0;
    return {
      subtotal,
      total: Math.max(
        0,
        subtotal - (editing?.discount ?? 0) + (editing?.tax ?? 0),
      ),
    };
  }, [editing]);
  const updateInvoice = (field: keyof Invoice, value: string | number) =>
    setEditing((current) =>
      current ? { ...current, [field]: value } : current,
    );
  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number,
  ) =>
    setEditing((current) => {
      if (!current) return current;
      const items = [...current.items];
      const item = { ...items[index], [field]: value };
      item.total = Math.round(
        Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
      );
      items[index] = item;
      return { ...current, items };
    });
  const selectProduct = (index: number, id: string) => {
    const product = products.find((item) => item.id === id);
    setEditing((current) => {
      if (!current) return current;
      const items = [...current.items];
      const item = {
        ...items[index],
        productId: id || null,
        description: product?.name ?? "",
        unitPrice: product?.sellingPrice ?? 0,
      };
      item.total = Math.round(item.quantity * item.unitPrice);
      items[index] = item;
      return { ...current, items };
    });
  };
  const submitInvoice = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const customer = customers.find((item) => item.id === editing.customerId);
      const saved = await saveInvoice({
        ...editing,
        customerName: customer?.name,
        subtotal: totals.subtotal,
        total: totals.total,
        balance: totals.total,
      });
      setEditing(null);
      notifyActivity({
        id: `invoice-new-${saved.id}`,
        title: `${saved.invoiceNumber || "New invoice"} created successfully`,
        detail: `${saved.customerName || "Walk-in customer"} · UGX ${saved.total.toLocaleString("en-UG")}`,
        page: "Sales",
        tone: "info",
      });
      await load();
    } catch {
      setError(
        "The invoice could not be saved. Please check the details and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const openPayment = (invoice: Invoice) => {
    setPaying(invoice);
    setPayment(blankPayment(invoice.id!));
    setError("");
  };
  const openInvoice = async (invoice: Invoice) => {
    if (!invoice.id) return;
    const [full, payments] = await Promise.all([
      getInvoice(invoice.id),
      listPayments(invoice.id),
    ]);
    if (full) {
      setInitialReceipt(null);
      setPreview(full);
      setHistory(payments);
    }
  };
  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!payment || !paying) return;
    setSaving(true);
    setError("");
    try {
      const saved = await recordPayment(payment);
      const invoiceId = paying.id!;
      setPaying(null);
      setPayment(null);
      await load();
      const [full, payments] = await Promise.all([
        getInvoice(invoiceId),
        listPayments(invoiceId),
      ]);
      if (full) {
        setInitialReceipt(saved);
        setPreview(full);
        setHistory(payments);
        notifyActivity({
          id: `paid-${full.id}-${full.amountPaid}`,
          title: `Payment received for ${full.invoiceNumber}`,
          detail: `UGX ${saved.amount.toLocaleString("en-UG")} was recorded from ${full.customerName || "the customer"}.`,
          page: "Sales",
          tone: "info",
        });
      }
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  };
  const removeInvoice = async () => { if(!deleting?.id)return;setSaving(true);setDeleteError("");try{await deleteRecord("invoice",deleting.id);notifyActivity({title:`${deleting.invoiceNumber||"Invoice"} deleted`,detail:"The unpaid invoice was removed permanently.",page:"Sales",tone:"warning"});setDeleting(null);await load()}catch(reason){setDeleteError(String(reason))}finally{setSaving(false)} };
  const collected = invoices.reduce(
    (sum, invoice) => sum + invoice.amountPaid,
    0,
  );
  const outstanding = invoices.reduce(
    (sum, invoice) => sum + invoice.balance,
    0,
  );

  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">SALES & COLLECTIONS</p>
          <h1>Sales and invoices</h1>
          <p>
            Record invoices, deposits and partial payments using live business
            data.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setEditing(blankInvoice())}
        >
          <Plus size={17} /> New invoice
        </button>
      </section>
      <section className="finance-cards">
        <div>
          <span>
            <FileText size={18} />
          </span>
          <p>
            <small>Total invoiced</small>
            <strong>
              UGX{" "}
              {invoices
                .reduce((sum, invoice) => sum + invoice.total, 0)
                .toLocaleString("en-UG")}
            </strong>
          </p>
        </div>
        <div>
          <span>
            <Banknote size={18} />
          </span>
          <p>
            <small>Collected</small>
            <strong>UGX {collected.toLocaleString("en-UG")}</strong>
          </p>
        </div>
        <div>
          <span>
            <CircleDollarSign size={18} />
          </span>
          <p>
            <small>Outstanding</small>
            <strong>UGX {outstanding.toLocaleString("en-UG")}</strong>
          </p>
        </div>
      </section>
      <section className="customer-toolbar">
        <div>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice, customer or status…"
          />
        </div>
        <span>{visible.length} invoices</span>
      </section>
      <section className="customer-panel">
        {visible.length === 0 ? (
          <div className="customer-empty">
            <div>
              <ReceiptText size={28} />
            </div>
            <h2>{search ? "No invoices found" : "Record your first sale"}</h2>
            <p>
              {search
                ? "Try another invoice number or customer."
                : "Create an invoice, then record full or partial customer payments."}
            </p>
            {!search && (
              <button
                className="primary-button"
                onClick={() => setEditing(blankInvoice())}
              >
                <Plus size={16} /> New invoice
              </button>
            )}
          </div>
        ) : (
          <div className="invoice-list">
            <div className="invoice-row labels">
              <span>INVOICE</span>
              <span>CUSTOMER</span>
              <span>DUE DATE</span>
              <span>STATUS</span>
              <span>TOTAL</span>
              <span>BALANCE</span>
              <span />
            </div>
            {visible.map((invoice) => (
              <div className="invoice-row" key={invoice.id}>
                <span>
                  <strong>{invoice.invoiceNumber}</strong>
                  <small>{invoice.issueDate}</small>
                </span>
                <span>{invoice.customerName || "Walk-in customer"}</span>
                <span>{invoice.dueDate}</span>
                <span>
                  <i className={`invoice-status ${invoice.status}`}>
                    {invoice.status.replace("_", " ")}
                  </i>
                </span>
                <strong>UGX {invoice.total.toLocaleString("en-UG")}</strong>
                <strong>UGX {invoice.balance.toLocaleString("en-UG")}</strong>
                <span className="invoice-actions">
                  <button onClick={() => void openInvoice(invoice)}>
                    <Eye size={14} /> View
                  </button>
                  <button
                    disabled={invoice.balance <= 0}
                    onClick={() => openPayment(invoice)}
                  >
                    <Banknote size={14} /> Pay
                  </button>
                  <button className="record-delete" onClick={() => { setDeleteError(""); setDeleting(invoice); }} aria-label={`Delete ${invoice.invoiceNumber}`}><Trash2 size={14} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      {preview && (
        <InvoicePreview
          key={initialReceipt?.id ?? preview.id}
          invoice={preview}
          payments={history}
          business={business}
          customer={customers.find((item) => item.id === preview.customerId)}
          initialReceipt={initialReceipt}
          onClose={() => {
            setPreview(null);
            setInitialReceipt(null);
          }}
          onPay={() => {
            setPreview(null);
            openPayment(preview);
          }}
        />
      )}
      {editing && (
        <div className="quote-editor-backdrop">
          <form
            className="quote-editor invoice-editor"
            onSubmit={submitInvoice}
          >
            <header>
              <div>
                <span>
                  <ReceiptText size={19} />
                </span>
                <div>
                  <h2>New invoice</h2>
                  <p>Number assigned when saved</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={20} />
              </button>
            </header>
            <div className="quote-editor-body">
              <section className="quote-details">
                <label>
                  Customer
                  <select
                    required
                    value={editing.customerId ?? ""}
                    onChange={(e) =>
                      updateInvoice("customerId", e.target.value)
                    }
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id ?? ""}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Issue date
                  <input
                    type="date"
                    value={editing.issueDate}
                    onChange={(e) => updateInvoice("issueDate", e.target.value)}
                  />
                </label>
                <label>
                  Payment due
                  <input
                    type="date"
                    value={editing.dueDate}
                    onChange={(e) => updateInvoice("dueDate", e.target.value)}
                  />
                </label>
              </section>
              <section className="quote-items">
                <div className="quote-items-head">
                  <div>
                    <h3>Invoice items</h3>
                    <p>Select catalogue products or enter custom services.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              items: [...current.items, blankItem()],
                            }
                          : current,
                      )
                    }
                  >
                    <Plus size={15} /> Add item
                  </button>
                </div>
                {editing.items.map((item, index) => (
                  <div className="invoice-item" key={item.id ?? index}>
                    <span>{index + 1}</span>
                    <label>
                      Product
                      <select
                        value={item.productId ?? ""}
                        onChange={(e) => selectProduct(index, e.target.value)}
                      >
                        <option value="">Custom item</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id ?? ""}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Description
                      <input
                        required
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Quantity
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Unit price
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, "unitPrice", Number(e.target.value))
                        }
                      />
                    </label>
                    <strong>UGX {item.total.toLocaleString("en-UG")}</strong>
                    {editing.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditing((current) =>
                            current
                              ? {
                                  ...current,
                                  items: current.items.filter(
                                    (_, i) => i !== index,
                                  ),
                                }
                              : current,
                          )
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </section>
              <section className="invoice-bottom">
                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={editing.notes}
                    onChange={(e) => updateInvoice("notes", e.target.value)}
                  />
                </label>
                <div className="quote-totals">
                  <p>
                    <span>Subtotal</span>
                    <strong>
                      UGX {totals.subtotal.toLocaleString("en-UG")}
                    </strong>
                  </p>
                  <label>
                    <span>Discount</span>
                    <input
                      type="number"
                      min="0"
                      value={editing.discount}
                      onChange={(e) =>
                        updateInvoice("discount", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    <span>Tax</span>
                    <input
                      type="number"
                      min="0"
                      value={editing.tax}
                      onChange={(e) =>
                        updateInvoice("tax", Number(e.target.value))
                      }
                    />
                  </label>
                  <div>
                    <span>Total</span>
                    <strong>UGX {totals.total.toLocaleString("en-UG")}</strong>
                  </div>
                </div>
              </section>
              {error && <p className="setup-error">{error}</p>}
            </div>
            <footer>
              <div>Stored locally when saved</div>
              <span>
                <button
                  type="button"
                  className="setup-back"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="setup-next" disabled={saving}>
                  {saving ? "Saving…" : "Save invoice"}
                </button>
              </span>
            </footer>
          </form>
        </div>
      )}
      {paying && payment && (
        <div className="modal-backdrop">
          <form
            className="customer-modal payment-modal"
            onSubmit={submitPayment}
          >
            <div className="modal-head">
              <div>
                <span>
                  <Banknote size={18} />
                </span>
                <div>
                  <h2>Record payment</h2>
                  <p>
                    {paying.invoiceNumber} • Balance UGX{" "}
                    {paying.balance.toLocaleString("en-UG")}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setPaying(null)}>
                <X size={19} />
              </button>
            </div>
            <div className="modal-body">
              <label>
                Amount received (UGX)
                <input
                  autoFocus
                  required
                  type="number"
                  min="1"
                  max={paying.balance}
                  value={payment.amount || ""}
                  onChange={(e) =>
                    setPayment({ ...payment, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Payment method
                <select
                  value={payment.paymentMethod}
                  onChange={(e) =>
                    setPayment({ ...payment, paymentMethod: e.target.value })
                  }
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
                Transaction reference <small>(optional)</small>
                <input
                  value={payment.reference}
                  onChange={(e) =>
                    setPayment({ ...payment, reference: e.target.value })
                  }
                />
              </label>
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={payment.paidAt}
                  onChange={(e) =>
                    setPayment({ ...payment, paidAt: e.target.value })
                  }
                />
              </label>
              <label>
                Notes <small>(optional)</small>
                <textarea
                  rows={3}
                  value={payment.notes}
                  onChange={(e) =>
                    setPayment({ ...payment, notes: e.target.value })
                  }
                />
              </label>
              {error && <p className="setup-error">{error}</p>}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="setup-back"
                onClick={() => setPaying(null)}
              >
                Cancel
              </button>
              <button className="setup-next" disabled={saving}>
                {saving ? "Saving…" : "Record payment"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleting && <DeleteConfirm name={deleting.invoiceNumber || "Invoice"} kind="invoice" busy={saving} error={deleteError} onCancel={() => setDeleting(null)} onConfirm={() => void removeInvoice()} />}
    </>
  );
}
