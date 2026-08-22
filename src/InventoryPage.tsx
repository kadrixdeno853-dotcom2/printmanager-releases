import { FormEvent, useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  PackagePlus,
  Plus,
  ShoppingCart,
  TriangleAlert,
  Trash2,
  X,
} from "lucide-react";
import {
  InventoryItem,
  Job,
  Purchase,
  PurchaseItem,
  StockUsage,
  Supplier,
  consumeStock,
  deleteRecord,
  listInventory,
  listJobs,
  listPurchases,
  listSuppliers,
  recordPurchase,
  recordSupplierPayment,
  saveInventoryItem,
  saveSupplier,
} from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";
import "./inventory-delete.css";
import "./inventory-calculations.css";
function localInventoryDate(){const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10)}
const emptyItem = (): InventoryItem => ({
  name: "",
  category: "",
  unit: "sheet",
  quantity: 0,
  reorderLevel: 0,
  unitCost: 0,
  isActive: true,
});
const emptySupplier = (): Supplier => ({
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  tin: "",
  notes: "",
  isActive: true,
});
const emptyPurchase = (): Purchase => ({
  purchaseDate: localInventoryDate(),
  paymentStatus: "paid",
  paymentMethod: "cash",
  reference: "",
  total: 0,
  amountPaid: 0,
  dueDate: "",
  notes: "",
  items: [emptyPurchaseLine()],
});
const emptyPurchaseLine = (): PurchaseItem => ({ inventoryItemId: "", quantity: 1, unitCost: 0, total: 0, materialName: "", materialCategory: "", materialUnit: "metre", materialReorderLevel: 0 });
const materialCategories = ["Banner & vinyl", "Sticker material", "Paper & card", "Ink & toner", "Fabric & canvas", "Lamination", "Finishing supplies", "Packaging", "Other"];
const purchaseLineUnit=(line:PurchaseItem,items:InventoryItem[])=>line.inventoryItemId==="__new__"?(line.materialUnit||"metre"):(items.find(item=>item.id===line.inventoryItemId)?.unit||"");
export default function InventoryPage() {
  const [tab, setTab] = useState<"materials" | "suppliers" | "purchases">(
    "purchases",
  );
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [usage, setUsage] = useState<StockUsage | null>(null);
  const [supplierPayment, setSupplierPayment] = useState<{ purchase: Purchase; amount: number; paymentMethod: string; reference: string } | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<{ entity: "purchase" | "material" | "supplier"; id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const load = async () => {
    const [a, b, c, d] = await Promise.all([
      listInventory(),
      listSuppliers(),
      listPurchases(),
      listJobs(),
    ]);
    setItems(a);
    setSuppliers(b);
    setPurchases(c);
    setJobs(d);
  };
  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("printmanager:data-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("printmanager:data-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const saveMat = async (e: FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    await saveInventoryItem(editItem);
    setEditItem(null);
    await load();
  };
  const saveSup = async (e: FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;
    await saveSupplier(editSupplier);
    setEditSupplier(null);
    await load();
  };
  const savePur = async (e: FormEvent) => {
    e.preventDefault();
    if (!purchase) return;
    setError("");
    try {
      const purchaseTotal=purchase.items.reduce((sum,line)=>sum+line.total,0);
      if(purchaseTotal<=0)throw new Error("Enter the total purchase cost for the material");
      if((purchase.amountPaid??0)>purchaseTotal)throw new Error("Amount paid cannot be greater than the purchase total");
      if(purchase.items.some(line=>line.quantity<=0))throw new Error("Enter a purchased quantity or complete the roll and metre calculation");
      const resolvedItems: PurchaseItem[] = [];
      for (const line of purchase.items) {
        if (line.inventoryItemId === "__new__") {
          if (!line.materialName?.trim()) throw new Error("Enter the new material name");
          const material = await saveInventoryItem({ name: line.materialName.trim(), category: line.materialCategory ?? "", unit: line.materialUnit || "metre", quantity: 0, reorderLevel: line.materialReorderLevel ?? 0, unitCost: line.unitCost, isActive: true });
          if (!material.id) throw new Error("The new material could not be created");
          resolvedItems.push({ ...line, inventoryItemId: material.id });
        } else {
          if (!line.inventoryItemId) throw new Error("Select an existing material or create a new one");
          resolvedItems.push(line);
        }
      }
      await recordPurchase({ ...purchase, items: resolvedItems });
      setPurchase(null);
      await load();
    } catch (reason) {
      setError(String(reason));
    }
  };
  const updatePurchaseLine=(index:number,changes:Partial<PurchaseItem>)=>{if(!purchase)return;const lines=[...purchase.items];const next={...lines[index],...changes};if("rollCount" in changes||"metresPerRoll" in changes)next.quantity=Math.max(0,next.rollCount??0)*Math.max(0,next.metresPerRoll??0);next.unitCost=next.quantity>0?next.total/next.quantity:0;lines[index]=next;setPurchase({...purchase,items:lines})};
  const useStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!usage) return;
    setError("");
    try {
      await consumeStock(usage);
      setUsage(null);
      const refreshed = await listInventory();
      setItems(refreshed);
      const result = refreshed.find(item => item.id === usage.inventoryItemId);
      if (result) {
        const finished = result.quantity <= 0;
        const low = !finished && result.quantity <= result.reorderLevel;
        const cost = Math.round(((result.totalPrinted ?? 0) + (result.totalWaste ?? 0)) * result.unitCost);
        const profit = (result.totalRevenue ?? 0) - cost;
        notifyActivity({ title: finished ? `${result.name} is finished` : low ? `${result.name} is running low` : `${result.name} usage recorded`, detail: finished ? `${result.totalPrinted ?? 0} ${result.unit} printed · ${result.totalWaste ?? 0} ${result.unit} lost · UGX ${(result.totalRevenue ?? 0).toLocaleString("en-UG")} revenue · UGX ${profit.toLocaleString("en-UG")} estimated profit` : `${usage.printedQuantity} ${result.unit} printed + ${usage.wasteQuantity} ${result.unit} waste · ${result.quantity} ${result.unit} remaining`, page: "Inventory", tone: finished || low ? "warning" : "info" });
      }
    } catch (reason) {
      setError(String(reason));
    }
  };
  const saveSupplierPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierPayment?.purchase.id) return;
    setError("");
    try {
      await recordSupplierPayment({ purchaseId: supplierPayment.purchase.id, amount: supplierPayment.amount, paymentMethod: supplierPayment.paymentMethod, reference: supplierPayment.reference });
      setSupplierPayment(null);
      await load();
    } catch (reason) { setError(String(reason)); }
  };
  const removeRecord = async () => {
    if (!deleting) return;
    setDeleteBusy(true); setDeleteError("");
    try {
      await deleteRecord(deleting.entity, deleting.id);
      notifyActivity({ title: `${deleting.name} deleted`, detail: deleting.entity === "purchase" ? "The purchase and its unused stock were reversed." : `The ${deleting.entity} was removed permanently.`, page: "Inventory", tone: "warning" });
      if (deleting.entity === "material") setEditItem(null);
      if (deleting.entity === "supplier") setEditSupplier(null);
      setDeleting(null); await load();
    } catch (reason) { setDeleteError(String(reason)); }
    finally { setDeleteBusy(false); }
  };
  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  );
  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">MATERIAL CONTROL</p>
          <h1>Inventory & purchasing</h1>
          <p>Every purchase and job usage updates live stock quantities.</p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            tab === "materials"
              ? setEditItem(emptyItem())
              : tab === "suppliers"
                ? setEditSupplier(emptySupplier())
                : setPurchase(emptyPurchase())
          }
        >
          <Plus size={17} />{" "}
          {tab === "materials"
            ? "New material"
            : tab === "suppliers"
              ? "New supplier"
              : "New purchase"}
        </button>
      </section>
      <div className="inventory-tabs">
        <button
          className={tab === "purchases" ? "active" : ""}
          onClick={() => setTab("purchases")}
        >
          <ShoppingCart /> Purchases
        </button>
        <button
          className={tab === "materials" ? "active" : ""}
          onClick={() => setTab("materials")}
        >
          <Boxes /> Materials
        </button>
        <button
          className={tab === "suppliers" ? "active" : ""}
          onClick={() => setTab("suppliers")}
        >
          <Building2 /> Suppliers
        </button>
      </div>
      {tab === "materials" && (
        <>
          <section className="inventory-summary">
            <div>
              <strong>{items.length}</strong>
              <span>Materials</span>
            </div>
            <div>
              <strong>
                {items.filter((i) => i.quantity <= i.reorderLevel).length}
              </strong>
              <span>Low stock</span>
            </div>
            <div>
              <strong>
                UGX {Math.round(totalValue).toLocaleString("en-UG")}
              </strong>
              <span>Estimated remaining stock value</span>
            </div>
          </section>
          <section className="material-grid">
            {items.length === 0 ? (
              <Empty
                icon={<Boxes />}
                title="Add your first material"
                text="Paper, vinyl, ink and finishing materials will appear here."
              />
            ) : (
              items.map((item) => (
                <article
                  className={item.quantity <= item.reorderLevel ? "low" : ""}
                  key={item.id}
                >
                  <header>
                    <span>{item.sku}</span>
                    {item.quantity <= item.reorderLevel && (
                      <i>
                        <TriangleAlert /> Low stock
                      </i>
                    )}
                  </header>
                  <h3>{item.name}</h3>
                  <p>{item.category || "Uncategorized"}</p>
                  <div>
                    <strong>
                      {item.quantity.toLocaleString("en-UG")}{" "}
                      <small>{item.unit}</small>
                    </strong>
                    <span>Reorder at {item.reorderLevel}</span>
                  </div>
                  <section className="material-performance"><span><small>Printed</small><strong>{(item.totalPrinted ?? 0).toLocaleString("en-UG")} {item.unit}</strong></span><span><small>Waste</small><strong>{(item.totalWaste ?? 0).toLocaleString("en-UG")} {item.unit}</strong></span><span><small>Revenue</small><strong>UGX {(item.totalRevenue ?? 0).toLocaleString("en-UG")}</strong></span><span><small>Remaining value</small><strong>UGX {Math.round(item.quantity*item.unitCost).toLocaleString("en-UG")}</strong></span></section>
                  <footer>
                    <span>
                      UGX {item.unitCost.toLocaleString("en-UG")} / {item.unit}
                    </span>
                    <button
                      onClick={() =>
                        setUsage({
                          inventoryItemId: item.id!,
                          jobId: "",
                          printedQuantity: 1,
                          wasteQuantity: 0,
                          revenue: 0,
                          reason: "Production usage",
                        })
                      }
                    >
                      Use for job
                    </button>
                    <button onClick={() => setEditItem(item)}>Edit</button>
                    <button className="inventory-delete-button" aria-label={`Delete ${item.name}`} onClick={() => item.id && setDeleting({entity:"material",id:item.id,name:item.name})}><Trash2/></button>
                  </footer>
                </article>
              ))
            )}
          </section>
        </>
      )}
      {tab === "suppliers" && (
        <section className="supplier-list">
          {suppliers.length === 0 ? (
            <Empty
              icon={<Building2 />}
              title="Add your first supplier"
              text="Store companies that provide printing materials and services."
            />
          ) : (
            suppliers.map((supplier) => (
              <button
                key={supplier.id}
                onClick={() => setEditSupplier(supplier)}
              >
                <span>
                  <Building2 />
                </span>
                <div>
                  <strong>{supplier.name}</strong>
                  <small>{supplier.contactPerson || "No contact person"}</small>
                </div>
                <div>
                  <strong>{supplier.phone || "No phone"}</strong>
                  <small>{supplier.email}</small>
                </div>
                <i>{supplier.isActive ? "Active" : "Inactive"}</i>
              </button>
            ))
          )}
        </section>
      )}
      {tab === "purchases" && (
        <><section className="supplier-payable-summary"><div><small>Total supplier purchases</small><strong>UGX {purchases.reduce((sum,item)=>sum+item.total,0).toLocaleString("en-UG")}</strong></div><div><small>Paid to suppliers</small><strong>UGX {purchases.reduce((sum,item)=>sum+(item.amountPaid??(item.paymentStatus==="paid"?item.total:0)),0).toLocaleString("en-UG")}</strong></div><div className="owed"><small>Still owed to suppliers</small><strong>UGX {purchases.reduce((sum,item)=>sum+Math.max(0,item.total-(item.amountPaid??(item.paymentStatus==="paid"?item.total:0))),0).toLocaleString("en-UG")}</strong></div></section><section className="purchase-list">
          {purchases.length === 0 ? (
            <Empty
              icon={<ShoppingCart />}
              title="No purchases recorded"
              text="Purchases increase material stock automatically."
            />
          ) : (
            purchases.map((entry) => (
              <div key={entry.id}>
                <span>
                  <strong>{entry.purchaseNumber}</strong>
                  <small>{entry.purchaseDate}</small>
                </span>
                <span>{entry.supplierName || "No supplier"}</span>
                <i>{entry.paymentStatus}</i>
                <span><strong>UGX {entry.total.toLocaleString("en-UG")}</strong><small>Balance: UGX {Math.max(0,entry.total-(entry.amountPaid??(entry.paymentStatus==="paid"?entry.total:0))).toLocaleString("en-UG")}</small></span>
                {entry.paymentStatus!=="paid"&&<button className="supplier-payment-button" onClick={()=>setSupplierPayment({purchase:entry,amount:Math.max(0,entry.total-(entry.amountPaid??0)),paymentMethod:"cash",reference:""})}>Record payment</button>}
                <button className="inventory-delete-button" aria-label={`Delete ${entry.purchaseNumber}`} onClick={()=>entry.id&&setDeleting({entity:"purchase",id:entry.id,name:entry.purchaseNumber||"Purchase"})}><Trash2/></button>
              </div>
            ))
          )}
        </section></>
      )}
      {editItem && (
        <SideForm
          title={editItem.id ? "Edit material" : "New material"}
          onClose={() => setEditItem(null)}
          onSubmit={saveMat}
        >
          <label>
            Material name
            <input
              required
              autoFocus
              value={editItem.name}
              onChange={(e) =>
                setEditItem({ ...editItem, name: e.target.value })
              }
            />
          </label>
          <div className="form-row">
            <label>
              Category
              <select
                value={editItem.category}
                onChange={(e) =>
                  setEditItem({ ...editItem, category: e.target.value })
                }
              ><option value="">Select category</option>{materialCategories.map(category=><option value={category} key={category}>{category}</option>)}{editItem.category&&!materialCategories.includes(editItem.category)&&<option value={editItem.category}>{editItem.category}</option>}</select>
            </label>
            <label>
              Unit
              <select
                value={editItem.unit}
                onChange={(e) =>
                  setEditItem({ ...editItem, unit: e.target.value })
                }
              >
                <option value="sheet">Sheets</option>
                <option value="roll">Rolls</option>
                <option value="metre">Metres</option>
                <option value="litre">Litres</option>
                <option value="piece">Pieces</option>
                <option value="ream">Reams</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Opening quantity ({editItem.unit})
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!!editItem.id}
                value={editItem.quantity}
                onChange={(e) =>
                  setEditItem({ ...editItem, quantity: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Low-stock level
              <input
                type="number"
                min="0"
                step="0.01"
                value={editItem.reorderLevel}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    reorderLevel: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <label>
            Cost per unit (UGX)
            <input
              type="number"
              min="0"
              value={editItem.unitCost}
              onChange={(e) =>
                setEditItem({ ...editItem, unitCost: Number(e.target.value) })
              }
            />
          </label>
          <div className="stock-value-explainer"><small>Estimated opening stock value</small><strong>UGX {Math.round(editItem.quantity*editItem.unitCost).toLocaleString("en-UG")}</strong><span>{editItem.quantity.toLocaleString("en-UG")} {editItem.unit} × UGX {editItem.unitCost.toLocaleString("en-UG",{maximumFractionDigits:2})} per {editItem.unit}</span></div>
        </SideForm>
      )}
      {editSupplier && (
        <SideForm
          title={editSupplier.id ? "Edit supplier" : "New supplier"}
          onClose={() => setEditSupplier(null)}
          onSubmit={saveSup}
        >
          <label>
            Supplier name
            <input
              required
              autoFocus
              value={editSupplier.name}
              onChange={(e) =>
                setEditSupplier({ ...editSupplier, name: e.target.value })
              }
            />
          </label>
          <label>
            Contact person
            <input
              value={editSupplier.contactPerson}
              onChange={(e) =>
                setEditSupplier({
                  ...editSupplier,
                  contactPerson: e.target.value,
                })
              }
            />
          </label>
          <div className="form-row">
            <label>
              Phone
              <input
                value={editSupplier.phone}
                onChange={(e) =>
                  setEditSupplier({ ...editSupplier, phone: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={editSupplier.email}
                onChange={(e) =>
                  setEditSupplier({ ...editSupplier, email: e.target.value })
                }
              />
            </label>
          </div>
          <label>
            Address
            <input
              value={editSupplier.address}
              onChange={(e) =>
                setEditSupplier({ ...editSupplier, address: e.target.value })
              }
            />
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={editSupplier.notes}
              onChange={(e) =>
                setEditSupplier({ ...editSupplier, notes: e.target.value })
              }
            />
          </label>
          {editSupplier.id&&<button type="button" className="inventory-modal-delete" onClick={()=>setDeleting({entity:"supplier",id:editSupplier.id!,name:editSupplier.name})}><Trash2/> Delete supplier</button>}
        </SideForm>
      )}
      {purchase && (
        <SideForm
          title="New material purchase"
          onClose={() => setPurchase(null)}
          onSubmit={savePur}
        >
          <label>
            Supplier
            <select
              value={purchase.supplierId ?? ""}
              onChange={(e) =>
                setPurchase({ ...purchase, supplierId: e.target.value || null })
              }
            >
              <option value="">No supplier selected</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id!}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purchase date
            <input
              type="date"
              value={purchase.purchaseDate}
              onChange={(e) =>
                setPurchase({ ...purchase, purchaseDate: e.target.value })
              }
            />
          </label>
          <div className="form-row"><label>Amount paid now (UGX)<input type="number" min="0" step="any" value={purchase.amountPaid??0} onChange={e=>setPurchase({...purchase,amountPaid:Number(e.target.value)})}/></label><label>Payment due date<input type="date" value={purchase.dueDate??""} onChange={e=>setPurchase({...purchase,dueDate:e.target.value})}/></label></div>
          {purchase.items.map((line, index) => (
            <div className="purchase-line" key={index}>
              <label>
                Material
                <select
                  required
                  value={line.inventoryItemId}
                  onChange={(e) => {
                    const lines = [...purchase.items];
                    lines[index] = { ...line, inventoryItemId: e.target.value };
                    setPurchase({ ...purchase, items: lines });
                  }}
                >
                  <option value="">Select material</option>
                  <option value="__new__">＋ Create a new material with this purchase</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id!}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              {line.inventoryItemId === "__new__" && <div className="purchase-new-material"><div><strong>New inventory material</strong><small>Created and stocked automatically when this purchase is saved.</small></div><div className="form-row"><label>Material name<input required value={line.materialName??""} onChange={e=>updatePurchaseLine(index,{materialName:e.target.value})} placeholder="e.g. Glossy sticker roll"/></label><label>Category<select value={line.materialCategory??""} onChange={e=>updatePurchaseLine(index,{materialCategory:e.target.value})}><option value="">Select category</option>{materialCategories.map(category=><option value={category} key={category}>{category}</option>)}</select></label></div><div className="form-row"><label>Measured in<select value={line.materialUnit??"metre"} onChange={e=>updatePurchaseLine(index,{materialUnit:e.target.value,rollCount:undefined,metresPerRoll:undefined})}><option value="metre">Metres</option><option value="roll">Rolls</option><option value="sheet">Sheets</option><option value="piece">Pieces</option><option value="litre">Litres</option><option value="ream">Reams</option></select></label><label>Low-stock alert at<input type="number" min="0" step="any" value={line.materialReorderLevel??0} onChange={e=>updatePurchaseLine(index,{materialReorderLevel:Number(e.target.value)})}/></label></div></div>}
              {purchaseLineUnit(line,items)==="metre"&&<section className="roll-metre-calculator"><header><strong>Roll and metre calculation</strong><small>Inventory is stored in metres so job dimensions can subtract automatically.</small></header><div><label>Number of rolls<input type="number" min="0.01" step="any" value={line.rollCount??""} onChange={e=>updatePurchaseLine(index,{rollCount:Number(e.target.value)})} placeholder="e.g. 2"/></label><label>Metres per roll<input type="number" min="0.01" step="any" value={line.metresPerRoll??""} onChange={e=>updatePurchaseLine(index,{metresPerRoll:Number(e.target.value)})} placeholder="e.g. 50"/></label><span><small>Total added to stock</small><strong>{line.quantity.toLocaleString("en-UG")} metres</strong></span></div></section>}
              <div className="form-row">
                <label>
                  {purchaseLineUnit(line,items)==="metre"?"Total metres":"Quantity purchased"}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    readOnly={purchaseLineUnit(line,items)==="metre"&&!!(line.rollCount||line.metresPerRoll)}
                    value={line.quantity}
                    onChange={(e) => updatePurchaseLine(index,{quantity:Number(e.target.value)})}
                  />
                </label>
                <label>
                  Total purchase cost (UGX)
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={line.total}
                    onChange={(e) => updatePurchaseLine(index,{total:Number(e.target.value)})}
                  />
                </label>
              </div>
              <div className="purchase-cost-breakdown"><span><small>Cost per {purchaseLineUnit(line,items)||"unit"}</small><strong>UGX {line.unitCost.toLocaleString("en-UG",{maximumFractionDigits:2})}</strong></span><span><small>Stock value added</small><strong>UGX {line.total.toLocaleString("en-UG")}</strong></span></div>
            </div>
          ))}
          <button
            type="button"
            className="add-line"
            onClick={() =>
              setPurchase({
                ...purchase,
                items: [
                  ...purchase.items,
                  emptyPurchaseLine(),
                ],
              })
            }
          >
            <Plus /> Add material
          </button>
          <div className="purchase-total">
            Total{" "}
            <strong>
              UGX{" "}
              {purchase.items
                .reduce((s, i) => s + i.total, 0)
                .toLocaleString("en-UG")}
            </strong>
          </div>
          {error && <p className="setup-error">{error}</p>}
        </SideForm>
      )}
      {supplierPayment && <SideForm title="Record supplier payment" onClose={()=>setSupplierPayment(null)} onSubmit={saveSupplierPayment}><div className="supplier-bill-detail"><small>{supplierPayment.purchase.purchaseNumber} · {supplierPayment.purchase.supplierName||"Supplier"}</small><strong>UGX {Math.max(0,supplierPayment.purchase.total-(supplierPayment.purchase.amountPaid??0)).toLocaleString("en-UG")} remaining</strong></div><label>Amount paid<input required autoFocus type="number" min="1" step="any" max={Math.max(0,supplierPayment.purchase.total-(supplierPayment.purchase.amountPaid??0))} value={supplierPayment.amount||""} onChange={e=>setSupplierPayment({...supplierPayment,amount:Number(e.target.value)})}/></label><label>Payment method<select value={supplierPayment.paymentMethod} onChange={e=>setSupplierPayment({...supplierPayment,paymentMethod:e.target.value})}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank transfer</option><option value="card">Card</option></select></label><label>Reference<input value={supplierPayment.reference} onChange={e=>setSupplierPayment({...supplierPayment,reference:e.target.value})} placeholder="Transaction or receipt number"/></label>{error&&<p className="setup-error">{error}</p>}</SideForm>}
      {usage && (
        <SideForm
          title="Use material for a job"
          onClose={() => setUsage(null)}
          onSubmit={useStock}
        >
          <label>
            Print job
            <select
              required
              value={usage.jobId}
              onChange={(e) => setUsage({ ...usage, jobId: e.target.value })}
            >
              <option value="">Select job</option>
              {jobs
                .filter((j) => j.status !== "delivered")
                .map((j) => (
                  <option key={j.id} value={j.id!}>
                    {j.jobNumber} — {j.title}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-row"><label>
            Printed quantity
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={usage.printedQuantity}
              onChange={(e) =>
                setUsage({ ...usage, printedQuantity: Number(e.target.value) })
              }
            />
          </label><label>Waste / lost quantity<input type="number" min="0" step="0.01" value={usage.wasteQuantity} onChange={e=>setUsage({...usage,wasteQuantity:Number(e.target.value)})}/></label></div>
          <label>Revenue from this job (UGX)<input type="number" min="0" step="100" value={usage.revenue} onChange={e=>setUsage({...usage,revenue:Number(e.target.value)})}/></label>
          <label>
            Reason
            <input
              value={usage.reason}
              onChange={(e) => setUsage({ ...usage, reason: e.target.value })}
            />
          </label>
          {error && <p className="setup-error">{error}</p>}
        </SideForm>
      )}
      {deleting&&<DeleteConfirm name={deleting.name} kind={deleting.entity} busy={deleteBusy} error={deleteError} onCancel={()=>setDeleting(null)} onConfirm={()=>void removeRecord()}/>} 
    </>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="inventory-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
function SideForm({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <form className="customer-modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <span>
              <PackagePlus />
            </span>
            <div>
              <h2>{title}</h2>
              <p>Saved to the local database</p>
            </div>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" className="setup-back" onClick={onClose}>
            Cancel
          </button>
          <button className="setup-next">Save</button>
        </div>
      </form>
    </div>
  );
}
