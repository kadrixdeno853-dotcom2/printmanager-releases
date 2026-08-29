import { FormEvent, useEffect, useState } from "react";
import { Calculator, Check, Package, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { Product, deleteRecord, listProducts, saveProduct } from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";

const emptyProduct: Product = { name: "", category: "", description: "", unit: "piece", pricingMethod: "fixed", sellingPrice: 0, estimatedCost: 0, minimumCharge: 0, isActive: true };
const units: Record<string, string> = { piece: "Per piece", square_metre: "Per square metre", sheet: "Per sheet", metre: "Per metre", page: "Per page", job: "Per job" };
const methods: Record<string, string> = { fixed: "Fixed unit price", area: "Width  height  quantity", quantity: "Quantity-based", custom: "Entered for each quotation" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting,setDeleting]=useState<Product|null>(null);const[deleteError,setDeleteError]=useState("");

  const load = async (query = search) => { setLoading(true); try { setProducts(await listProducts(query)); } finally { setLoading(false); } };
  useEffect(() => { void load(""); }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(search), 180); return () => clearTimeout(timer); }, [search]);
  const update = (field: keyof Product, value: string | number | boolean) => setEditing(current => current ? { ...current, [field]: value } : current);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!editing) return; setSaving(true); setError("");
    try { const wasEditing = !!editing.id; const saved = await saveProduct(editing); notifyActivity({ title: `Product ${wasEditing ? "updated" : "created"}`, detail: `${saved.name}  UGX ${saved.sellingPrice.toLocaleString("en-UG")}`, page: "Products", tone: "info" }); setEditing(null); await load(); }
    catch { setError("The product could not be saved. Please check the details and try again."); }
    finally { setSaving(false); }
  };
  const removeProduct=async()=>{if(!deleting?.id)return;setSaving(true);setDeleteError("");try{await deleteRecord("product",deleting.id);notifyActivity({title:`${deleting.name} deleted`,detail:"The product was removed permanently.",page:"Products",tone:"warning"});setDeleting(null);setEditing(null);await load()}catch(reason){setDeleteError(String(reason))}finally{setSaving(false)}};

  return <>
    <section className="list-heading"><div><p className="eyebrow">PRICING CATALOGUE</p><h1>Products & services</h1><p>Set up common print products once and reuse them in quotations and sales.</p></div><button className="primary-button" onClick={() => setEditing({ ...emptyProduct })}><Plus size={17} /> Add product</button></section>
    <section className="catalog-summary"><div><span><Package size={18} /></span><p><strong>{products.filter(product => product.isActive).length}</strong>Active products</p></div><div><span><Tag size={18} /></span><p><strong>{new Set(products.map(product => product.category).filter(Boolean)).size}</strong>Categories</p></div><div><span><Calculator size={18} /></span><p><strong>{products.filter(product => product.pricingMethod === "area").length}</strong>Area-priced items</p></div></section>
    <section className="customer-toolbar"><div><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products or categories" /></div><span>{products.length} {products.length === 1 ? "item" : "items"}</span></section>
    <section className="customer-panel">
      {loading ? <div className="customer-empty"><p>Loading catalogue</p></div> : products.length === 0 ? <div className="customer-empty"><div><Package size={28} /></div><h2>{search ? "No products found" : "Build your printing catalogue"}</h2><p>{search ? "Try a different product name or category." : "Add products such as banners, business cards, flyers, stickers and design services."}</p>{!search && <button className="primary-button" onClick={() => setEditing({ ...emptyProduct })}><Plus size={16} /> Add first product</button>}</div> : <div className="product-grid">{products.map(product => <button className={`product-card ${!product.isActive ? "inactive" : ""}`} key={product.id} onClick={() => setEditing(product)}><div className="product-card-head"><span><Package size={18} /></span><i>{product.isActive ? "Active" : "Inactive"}</i></div><h3>{product.name}</h3><p>{product.category || "Uncategorized"}</p><div className="product-price"><small>Selling price</small><strong>UGX {product.sellingPrice.toLocaleString("en-UG")}</strong><span>{units[product.unit] ?? product.unit}</span></div><footer><span>{methods[product.pricingMethod] ?? product.pricingMethod}</span><span>Cost: UGX {product.estimatedCost.toLocaleString("en-UG")}</span></footer></button>)}</div>}
    </section>
    {editing && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><form className="customer-modal" onSubmit={submit}><div className="modal-head"><div><span><Package size={18} /></span><div><h2>{editing.id ? "Edit product" : "New product or service"}</h2><p>Pricing and costing defaults</p></div></div><button type="button" onClick={() => setEditing(null)}><X size={19} /></button></div><div className="modal-body"><label>Product or service name<input autoFocus required value={editing.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Outdoor banner" /></label><div className="form-row"><label>Category<input required value={editing.category} onChange={e => update("category", e.target.value)} placeholder="e.g. Large format" /></label><label>Unit<select value={editing.unit} onChange={e => update("unit", e.target.value)}>{Object.entries(units).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><label>Pricing method<select value={editing.pricingMethod} onChange={e => update("pricingMethod", e.target.value)}>{Object.entries(methods).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><div className="form-row"><label>Selling price (UGX)<input type="number" min="0" step="100" required value={editing.sellingPrice} onChange={e => update("sellingPrice", Number(e.target.value))} /></label><label>Estimated cost (UGX)<input type="number" min="0" step="100" value={editing.estimatedCost} onChange={e => update("estimatedCost", Number(e.target.value))} /></label></div><label>Minimum charge (UGX)<input type="number" min="0" step="100" value={editing.minimumCharge} onChange={e => update("minimumCharge", Number(e.target.value))} /></label><label>Description <small>(optional)</small><textarea value={editing.description} onChange={e => update("description", e.target.value)} rows={3} /></label><label className="active-toggle"><input type="checkbox" checked={editing.isActive} onChange={e => update("isActive", e.target.checked)} /><span><i><Check size={13} /></i><strong>Available for new sales and quotations</strong><small>Inactive products remain in historical records.</small></span></label>{error && <p className="setup-error">{error}</p>}</div><div className="modal-actions"><button type="button" className="setup-back" onClick={() => setEditing(null)}>Cancel</button><button className="setup-next" disabled={saving}>{saving ? "Saving" : "Save product"}</button></div></form></div>}
    {editing?.id&&<button className="floating-record-delete" onClick={()=>setDeleting(editing)}><Trash2/> Delete product</button>}
    {deleting&&<DeleteConfirm name={deleting.name} kind="product" busy={saving} error={deleteError} onCancel={()=>setDeleting(null)} onConfirm={()=>void removeProduct()}/>} 
  </>;
}
