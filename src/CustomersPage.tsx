import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  Customer,
  deleteRecord,
  listCustomers,
  saveCustomer,
} from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";
import "./phone-fields.css";

const emptyCustomer: Customer = {
  name: "",
  company: "",
  phone: "",
  email: "",
  address: "",
  tin: "",
  creditLimit: 0,
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const load = async (query = search) => {
    setLoading(true);
    try {
      setCustomers(await listCustomers(query));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load("");
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(search), 180);
    return () => clearTimeout(timer);
  }, [search]);
  const update = (field: keyof Customer, value: string | number) =>
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
      const saved = await saveCustomer(editing);
      notifyActivity({
        title: `Customer ${wasEditing ? "updated" : "created"}`,
        detail: `${saved.name}${saved.company ? `  ${saved.company}` : ""}`,
        page: "Customers",
        tone: "info",
      });
      setEditing(null);
      await load();
    } catch {
      setError(
        "The customer could not be saved. Please check the details and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleting?.id) return;
    setSaving(true);
    setDeleteError("");
    try {
      await deleteRecord("customer", deleting.id);
      notifyActivity({
        title: "Customer deleted",
        detail: `${deleting.name} was removed.`,
        page: "Customers",
        tone: "warning",
      });
      setDeleting(null);
      setEditing(null);
      await load();
    } catch (reason) {
      setDeleteError(String(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">CUSTOMER DIRECTORY</p>
          <h1>Customers</h1>
          <p>
            Keep contact details, credit information and job history together.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setEditing({ ...emptyCustomer })}
        >
          <Plus size={17} /> Add customer
        </button>
      </section>
      <section className="customer-toolbar">
        <div>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, company or phone"
          />
        </div>
        <span>
          {customers.length} {customers.length === 1 ? "customer" : "customers"}
        </span>
      </section>
      <section className="customer-panel">
        {loading ? (
          <div className="customer-empty">
            <p>Loading customers</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="customer-empty">
            <div>
              <UserRound size={28} />
            </div>
            <h2>{search ? "No customers found" : "Add your first customer"}</h2>
            <p>
              {search
                ? "Try a different name, company or phone number."
                : "Customer profiles connect quotations, print jobs, invoices and payments."}
            </p>
            {!search && (
              <button
                className="primary-button"
                onClick={() => setEditing({ ...emptyCustomer })}
              >
                <Plus size={16} /> Add customer
              </button>
            )}
          </div>
        ) : (
          <div className="customer-table">
            <div className="customer-row labels">
              <span>CUSTOMER</span>
              <span>CONTACT</span>
              <span>LOCATION</span>
              <span>CREDIT LIMIT</span>
            </div>
            {customers.map((customer) => (
              <button
                className="customer-row"
                key={customer.id}
                onClick={() => setEditing(customer)}
              >
                <span className="customer-identity">
                  <i>{customer.name.slice(0, 2).toUpperCase()}</i>
                  <span>
                    <strong>{customer.name}</strong>
                    <small>{customer.company || "Individual customer"}</small>
                  </span>
                </span>
                <span className="contact-details">
                  <small>
                    <Phone size={12} />
                    {customer.phone || "No phone"}
                  </small>
                  <small>
                    <Mail size={12} />
                    {customer.email || "No email"}
                  </small>
                </span>
                <span>{customer.address || "Not provided"}</span>
                <strong>
                  UGX {customer.creditLimit.toLocaleString("en-UG")}
                </strong>
              </button>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <form className="customer-modal" onSubmit={submit}>
            <div className="modal-head">
              <div>
                <span>
                  <Building2 size={18} />
                </span>
                <div>
                  <h2>{editing.id ? "Edit customer" : "New customer"}</h2>
                  <p>Contact and credit information</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={19} />
              </button>
            </div>
            <div className="modal-body">
              <label>
                Customer or contact name
                <input
                  autoFocus
                  required
                  value={editing.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <div className="form-row">
                <label>
                  Company <small>(optional)</small>
                  <input
                    value={editing.company}
                    onChange={(e) => update("company", e.target.value)}
                  />
                </label>
                <label>
                  Phone number
                  <div className="phone-input"><span>+256</span><input required value={editing.phone.replace(/^\+?256\s*/, "")} onChange={(e) => update("phone", e.target.value)} /></div>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Email <small>(optional)</small>
                  <input
                    type="email"
                    value={editing.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </label>
                <label>
                  TIN <small>(optional)</small>
                  <input
                    value={editing.tin}
                    onChange={(e) => update("tin", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Address
                <input
                  value={editing.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </label>
              <label>
                Credit limit (UGX)
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editing.creditLimit}
                  onChange={(e) =>
                    update("creditLimit", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Notes <small>(optional)</small>
                <textarea
                  value={editing.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                />
              </label>
              {error && <p className="setup-error">{error}</p>}
            </div>
            <div className="modal-actions">
              {editing.id && <button type="button" className="delete-link" onClick={() => { setDeleteError(""); setDeleting(editing); }}>Delete customer</button>}
              <button
                type="button"
                className="setup-back"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="setup-next" disabled={saving}>
                {saving ? "Saving" : "Save customer"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleting && <DeleteConfirm name={deleting.name} kind="customer" busy={saving} error={deleteError} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </>
  );
}
