import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Calculator,
  Eye,
  FilePlus2,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  BusinessProfile,
  Customer,
  Product,
  Quotation,
  QuotationItem,
  convertQuotationToJob,
  deleteRecord,
  getBusinessProfile,
  getQuotation,
  listCustomers,
  listProducts,
  listQuotations,
  saveQuotation,
  updateQuotationStatus,
} from "./lib/desktop";
import QuotationPreview from "./QuotationPreview";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";
import AdvancedPricingCalculator from "./AdvancedPricingCalculator";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const blankItem = (): QuotationItem => ({
  description: "",
  quantity: 1,
  width: null,
  height: null,
  unit: "piece",
  unitPrice: 0,
  total: 0,
});
const blankQuotation = (): Quotation => ({
  status: "draft",
  issueDate: today(),
  validUntil: plusDays(14),
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  notes: "",
  terms: "50% deposit required before production begins.",
  items: [blankItem()],
});

function calculateItem(item: QuotationItem, product?: Product) {
  const area =
    product?.pricingMethod === "area"
      ? Math.max(0, item.width ?? 0) * Math.max(0, item.height ?? 0)
      : 1;
  const raw = area * Math.max(0, item.quantity) * Math.max(0, item.unitPrice);
  return Math.round(Math.max(raw, product?.minimumCharge ?? 0));
}

type PickerOption = {
  value: string;
  label: string;
  detail: string;
  keywords?: string;
};
function SearchPicker({
  value,
  options,
  placeholder,
  onSelect,
  customLabel,
  required = false,
}: {
  value: string;
  options: PickerOption[];
  placeholder: string;
  onSelect: (value: string) => void;
  customLabel?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    if (selected && !open) setQuery(selected.label);
  }, [value, options.length, open]);
  const needle = query.trim().toLowerCase();
  const matches = options
    .filter(
      (option) =>
        !needle ||
        `${option.label} ${option.detail} ${option.keywords || ""}`
          .toLowerCase()
          .includes(needle),
    )
    .slice(0, 8);
  return (
    <div className={`quote-search-picker ${open ? "open" : ""}`}>
      <Search />
      <input
        required={required}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          if (value) onSelect("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {value && <span className="quote-picker-selected">✓ Selected</span>}
      {open && (
        <div className="quote-picker-results">
          {customLabel && (
            <button
              type="button"
              className="custom-picker-option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect("");
                setQuery(customLabel);
                setOpen(false);
              }}
            >
              <span>+</span>
              <div>
                <strong>{customLabel}</strong>
                <small>Enter the description and price manually</small>
              </div>
            </button>
          )}
          {matches.length === 0 ? (
            <p>No matching records found</p>
          ) : (
            matches.map((option) => (
              <button
                type="button"
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
              >
                <span>{option.label.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [preview, setPreview] = useState<Quotation | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<Quotation | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [pricingItem, setPricingItem] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    const [quotes, customerList, productList, profile] = await Promise.all([
      listQuotations(),
      listCustomers(),
      listProducts(),
      getBusinessProfile(),
    ]);
    setQuotations(quotes);
    setCustomers(customerList);
    setProducts(productList.filter((product) => product.isActive));
    setBusiness(profile);
  };
  useEffect(() => {
    void load();
  }, []);

  const visible = quotations.filter(
    (quotation) =>
      !search ||
      [
        quotation.quotationNumber,
        quotation.customerName,
        quotation.status,
      ].some((value) => value?.toLowerCase().includes(search.toLowerCase())),
  );
  const totals = useMemo(() => {
    const subtotal =
      editing?.items.reduce((sum, item) => sum + item.total, 0) ?? 0;
    const discount = editing?.discount ?? 0;
    const tax = editing?.tax ?? 0;
    return { subtotal, total: Math.max(0, subtotal - discount + tax) };
  }, [editing]);
  const updateQuote = (field: keyof Quotation, value: string | number) =>
    setEditing((current) =>
      current ? { ...current, [field]: value } : current,
    );
  const updateItem = (
    index: number,
    field: keyof QuotationItem,
    value: string | number | null,
  ) =>
    setEditing((current) => {
      if (!current) return current;
      const items = [...current.items];
      const item = { ...items[index], [field]: value };
      const product = products.find((entry) => entry.id === item.productId);
      item.total = calculateItem(item, product);
      items[index] = item;
      return { ...current, items };
    });
  const chooseProduct = (index: number, productId: string) =>
    setEditing((current) => {
      if (!current) return current;
      const product = products.find((entry) => entry.id === productId);
      const items = [...current.items];
      const item: QuotationItem = {
        ...items[index],
        productId: productId || null,
        description: product?.name ?? "",
        unit: product?.unit ?? "piece",
        unitPrice: product?.sellingPrice ?? 0,
        width: product?.pricingMethod === "area" ? items[index].width : null,
        height: product?.pricingMethod === "area" ? items[index].height : null,
        total: 0,
      };
      item.total = calculateItem(item, product);
      items[index] = item;
      return { ...current, items };
    });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!editing.customerId) {
      setError(
        "Select a customer from the search results before saving the quotation.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const customer = customers.find((item) => item.id === editing.customerId);
      const wasEditing = !!editing.id;
      const saved = await saveQuotation({
        ...editing,
        customerName: customer?.name,
        subtotal: totals.subtotal,
        total: totals.total,
      });
      notifyActivity({
        title: `${saved.quotationNumber || "Quotation"} ${wasEditing ? "updated" : "created"}`,
        detail: `${saved.customerName || "Customer"} · UGX ${saved.total.toLocaleString("en-UG")}`,
        page: "Quotations",
        tone: "info",
      });
      setEditing(null);
      await load();
    } catch {
      setError(
        "The quotation could not be saved. Please review the items and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const openPreview = async (id?: string | null) => {
    if (!id) return;
    const quotation = await getQuotation(id);
    if (quotation) setPreview(quotation);
  };
  const changeStatus = async (status: string) => {
    if (!preview?.id) return;
    await updateQuotationStatus(preview.id, status);
    notifyActivity({
      title: `${preview.quotationNumber || "Quotation"} status updated`,
      detail: `Status changed to ${status.replaceAll("_", " ")}.`,
      page: "Quotations",
      tone: "info",
    });
    setPreview({ ...preview, status });
    await load();
  };
  const createJob = async () => {
    if (!preview?.id) return;
    try {
      const jobNumber = await convertQuotationToJob(preview.id);
      setMessage(`${jobNumber} was created successfully.`);
      notifyActivity({
        title: `${jobNumber} created from quotation`,
        detail: `${preview.customerName || "Customer"} · ready for production planning`,
        page: "Jobs",
        tone: "info",
      });
    } catch (reason) {
      setMessage(String(reason));
    }
  };
  const removeQuotation = async () => {if(!deleting?.id)return;setSaving(true);setDeleteError("");try{await deleteRecord("quotation",deleting.id);notifyActivity({title:`${deleting.quotationNumber||"Quotation"} deleted`,detail:"The quotation was removed permanently.",page:"Quotations",tone:"warning"});setDeleting(null);setPreview(null);await load()}catch(reason){setDeleteError(String(reason))}finally{setSaving(false)}};

  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">SALES DOCUMENTS</p>
          <h1>Quotations</h1>
          <p>
            Price work accurately and turn accepted quotations into print jobs.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setEditing(blankQuotation())}
        >
          <Plus size={17} /> New quotation
        </button>
      </section>
      <section className="quote-stats">
        <div>
          <span>Draft</span>
          <strong>
            {quotations.filter((q) => q.status === "draft").length}
          </strong>
        </div>
        <div>
          <span>Sent</span>
          <strong>
            {quotations.filter((q) => q.status === "sent").length}
          </strong>
        </div>
        <div>
          <span>Accepted</span>
          <strong>
            {quotations.filter((q) => q.status === "accepted").length}
          </strong>
        </div>
        <div>
          <span>Total quoted</span>
          <strong>
            UGX{" "}
            {quotations
              .reduce((sum, q) => sum + q.total, 0)
              .toLocaleString("en-UG")}
          </strong>
        </div>
      </section>
      <section className="customer-toolbar">
        <div>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search quotation, customer or status…"
          />
        </div>
        <span>{visible.length} quotations</span>
      </section>
      <section className="customer-panel">
        {visible.length === 0 ? (
          <div className="customer-empty">
            <div>
              <FileText size={28} />
            </div>
            <h2>
              {search ? "No quotations found" : "Create your first quotation"}
            </h2>
            <p>
              {search
                ? "Try a different quotation number or customer."
                : "Use catalogue prices and printing dimensions to prepare an accurate customer estimate."}
            </p>
            {!search && (
              <button
                className="primary-button"
                onClick={() => setEditing(blankQuotation())}
              >
                <FilePlus2 size={16} /> New quotation
              </button>
            )}
          </div>
        ) : (
          <div className="quote-list">
            <div className="quote-row labels">
              <span>QUOTATION</span>
              <span>CUSTOMER</span>
              <span>VALID UNTIL</span>
              <span>STATUS</span>
              <span>TOTAL</span>
              <span />
            </div>
            {visible.map((quote) => (
              <div className="quote-row" key={quote.id}>
                <span>
                  <strong>{quote.quotationNumber}</strong>
                  <small>Issued {quote.issueDate}</small>
                </span>
                <span>{quote.customerName || "Walk-in customer"}</span>
                <span>{quote.validUntil}</span>
                <span>
                  <i className={`quote-status ${quote.status}`}>
                    {quote.status}
                  </i>
                </span>
                <strong>UGX {quote.total.toLocaleString("en-UG")}</strong>
                <span className="record-actions"><button className="view-quote" onClick={() => void openPreview(quote.id)}><Eye size={14} /> View</button><button className="view-quote record-delete" onClick={() => { setDeleteError(""); setDeleting(quote); }} aria-label={`Delete ${quote.quotationNumber}`}><Trash2 size={14} /></button></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {preview && (
        <QuotationPreview
          quotation={preview}
          business={business}
          customers={customers}
          message={message}
          onClose={() => {
            setPreview(null);
            setMessage("");
          }}
          onStatus={(status) => void changeStatus(status)}
          onCreateJob={() => void createJob()}
          onDismissMessage={() => setMessage("")}
        />
      )}

      {editing && (
        <div className="quote-editor-backdrop">
          <form className="quote-editor" onSubmit={submit}>
            <header>
              <div>
                <span>
                  <FileText size={19} />
                </span>
                <div>
                  <h2>New quotation</h2>
                  <p>Draft • Number assigned when saved</p>
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
                  <SearchPicker
                    required
                    value={editing.customerId ?? ""}
                    placeholder="Search customer by name, company or phone…"
                    onSelect={(value) => updateQuote("customerId", value)}
                    options={customers.map((customer) => ({
                      value: customer.id ?? "",
                      label: customer.name,
                      detail:
                        [customer.company, customer.phone]
                          .filter(Boolean)
                          .join(" · ") || "Customer",
                      keywords: customer.email,
                    }))}
                  />
                </label>
                <label>
                  Issue date
                  <input
                    type="date"
                    required
                    value={editing.issueDate}
                    onChange={(e) => updateQuote("issueDate", e.target.value)}
                  />
                </label>
                <label>
                  Valid until
                  <input
                    type="date"
                    required
                    value={editing.validUntil}
                    onChange={(e) => updateQuote("validUntil", e.target.value)}
                  />
                </label>
              </section>
              <section className="quote-items">
                <div className="quote-items-head">
                  <div>
                    <h3>Quotation items</h3>
                    <p>Choose a catalogue product or enter a custom item.</p>
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
                {editing.items.map((item, index) => {
                  const product = products.find(
                    (entry) => entry.id === item.productId,
                  );
                  const areaPriced = product?.pricingMethod === "area";
                  return (
                    <div className="quote-item" key={item.id ?? index}>
                      <div className="item-number">{index + 1}</div>
                      <label>
                        Product or service
                        <SearchPicker
                          value={item.productId ?? ""}
                          placeholder="Search product or choose custom item…"
                          customLabel="Custom item"
                          onSelect={(value) => chooseProduct(index, value)}
                          options={products.map((entry) => ({
                            value: entry.id ?? "",
                            label: entry.name,
                            detail: `${entry.category || "Product"} · UGX ${entry.sellingPrice.toLocaleString("en-UG")}`,
                            keywords: `${entry.description} ${entry.unit}`,
                          }))}
                        />
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
                      <div className="item-numbers">
                        {areaPriced && (
                          <>
                            <label>
                              Width (m)
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={item.width ?? ""}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "width",
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Height (m)
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={item.height ?? ""}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "height",
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </label>
                          </>
                        )}
                        <label>
                          Quantity
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                        <label>
                          Unit price
                          <input
                            type="number"
                            min="0"
                            step="100"
                            required
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                        <div className="line-total">
                          <small>
                            {areaPriced
                              ? `${((item.width ?? 0) * (item.height ?? 0) * item.quantity).toFixed(2)} m²`
                              : "Line total"}
                          </small>
                          <strong>
                            UGX {item.total.toLocaleString("en-UG")}
                          </strong>
                        </div>
                        <button type="button" className="open-pricing" onClick={() => setPricingItem(index)}><Calculator/> Calculate profitable price</button>
                      </div>
                      {editing.items.length > 1 && (
                        <button
                          className="remove-item"
                          type="button"
                          onClick={() =>
                            setEditing((current) =>
                              current
                                ? {
                                    ...current,
                                    items: current.items.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  }
                                : current,
                            )
                          }
                        >
                          <Trash2 size={15} /> Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
              <section className="quote-bottom">
                <div>
                  <label>
                    Customer notes
                    <textarea
                      rows={3}
                      value={editing.notes}
                      onChange={(e) => updateQuote("notes", e.target.value)}
                      placeholder="Delivery, artwork or production notes…"
                    />
                  </label>
                  <label>
                    Terms
                    <textarea
                      rows={3}
                      value={editing.terms}
                      onChange={(e) => updateQuote("terms", e.target.value)}
                    />
                  </label>
                </div>
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
                      step="100"
                      value={editing.discount}
                      onChange={(e) =>
                        updateQuote("discount", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    <span>Tax</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editing.tax}
                      onChange={(e) =>
                        updateQuote("tax", Number(e.target.value))
                      }
                    />
                  </label>
                  <div>
                    <span>Quotation total</span>
                    <strong>UGX {totals.total.toLocaleString("en-UG")}</strong>
                  </div>
                </div>
              </section>
              {error && <p className="setup-error">{error}</p>}
            </div>
            <footer>
              <div>
                <CalendarDays size={15} /> Valid for 14 days by default
              </div>
              <span>
                <button
                  type="button"
                  className="setup-back"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  className="setup-next"
                  disabled={
                    saving || editing.items.some((item) => !item.description)
                  }
                >
                  {saving ? "Saving…" : "Save quotation"}
                </button>
              </span>
            </footer>
          </form>
        </div>
      )}
      {deleting && <DeleteConfirm name={deleting.quotationNumber || "Quotation"} kind="quotation" busy={saving} error={deleteError} onCancel={() => setDeleting(null)} onConfirm={() => void removeQuotation()} />}
      {editing && pricingItem !== null && editing.items[pricingItem] && <AdvancedPricingCalculator item={editing.items[pricingItem]} product={products.find(product => product.id === editing.items[pricingItem].productId)} onClose={() => setPricingItem(null)} onApply={(result) => { updateItem(pricingItem, "width", result.widthMeters); updateItem(pricingItem, "height", result.heightMeters); updateItem(pricingItem, "quantity", result.quantity); updateItem(pricingItem, "unitPrice", result.unitPrice); setPricingItem(null); }} />}
    </>
  );
}
