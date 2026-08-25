import { FormEvent, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Calculator,
  ChevronRight,
  CircleAlert,
  Gauge,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import {
  Customer,
  Job,
  JobItem,
  InventoryItem,
  Machine,
  User,
  listCustomers,
  listJobs,
  listMachines,
  listInventory,
  listUsers,
  deleteRecord,
  saveJob,
  updateJobStatus,
} from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import DeleteConfirm from "./DeleteConfirm";
import AdvancedPricingCalculator from "./AdvancedPricingCalculator";

export const productionStages = [
  ["new_order", "New order"],
  ["designing", "Designing"],
  ["approval", "Customer approval"],
  ["ready_to_print", "Ready to print"],
  ["printing", "Printing"],
  ["finishing", "Finishing"],
  ["quality_check", "Quality check"],
  ["ready", "Ready for collection"],
  ["delivered", "Delivered"],
] as const;
const emptyItem = (): JobItem => ({
  title: "",
  workType: "",
  description: "",
  width: null,
  height: null,
  unit: "cm",
  quantity: 1,
  unitPrice: 0,
  total: 0,
  inventoryItemId: null,
  materialUsed: 0,
  materialWaste: 0,
});
const emptyJob = (): Job => ({
  title: "",
  description: "",
  status: "new_order",
  priority: "normal",
  deadline: null,
  deliveryDate: null,
  assignedTo: "",
  machineName: "",
  artworkStatus: "not_received",
  deliveryMethod: "collection",
  deliveryAddress: "",
  deliveryNotes: "",
  totalAmount: 0,
  depositAmount: 0,
  items: [emptyItem()],
});
const stageLabel = (status: string) =>
  productionStages.find(([value]) => value === status)?.[1] ?? status;
const paymentState = (job: Job) =>
  job.totalAmount > 0 && job.depositAmount >= job.totalAmount
    ? "paid"
    : job.depositAmount > 0
      ? "part-paid"
      : "unpaid";
const automaticMaterialUsage=(item:JobItem,material?:InventoryItem)=>{if(!material)return 0;const quantity=Math.max(0,item.quantity||0);if(["piece","sheet","roll","ream"].includes(material.unit))return quantity;if(material.unit==="metre"){const factor=item.unit==="mm"?.001:item.unit==="cm"?.01:1;const width=(item.width??0)*factor;const height=(item.height??0)*factor;return Math.round(Math.max(width,height)*quantity*1000)/1000}return 0};
const materialKeywords:Record<string,string[]>={banner:["banner","flex","vinyl"],sticker:["sticker","vinyl","adhesive"],poster:["poster","paper","photo"],card:["card","paper","board"],brochure:["brochure","paper"],flyer:["flyer","paper"],shirt:["shirt","textile","vinyl"],tshirt:["shirt","textile","vinyl"],mug:["mug","sublimation"],canvas:["canvas"],reflective:["reflective","vinyl"],lamination:["lamination","film"]};
const words=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(word=>word.length>1);
const intelligentMaterialMatch=(title:string,workType:string,inventory:InventoryItem[])=>{const query=`${title} ${workType}`.trim().toLowerCase();const queryWords=words(query);if(!queryWords.length)return undefined;const expanded=new Set(queryWords);queryWords.forEach(word=>materialKeywords[word]?.forEach(keyword=>expanded.add(keyword)));return inventory.filter(material=>material.isActive&&material.quantity>0&&material.id).map(material=>{const target=`${material.name} ${material.category}`.toLowerCase();const targetWords=words(target);let score=0;if(target.includes(query)&&query.length>2)score+=80;expanded.forEach(keyword=>{if(targetWords.includes(keyword))score+=24;else if(target.includes(keyword))score+=10});if(queryWords.some(word=>material.name.toLowerCase().includes(word)))score+=20;return{material,score}}).filter(result=>result.score>=20).sort((a,b)=>b.score-a.score||b.material.quantity-a.material.quantity)[0]?.material};

type Props = {
  board?: boolean;
  createRequest?: number;
  initialCustomerId?: string;
};

export default function JobsPage({
  board = false,
  createRequest = 0,
  initialCustomerId,
}: Props) {
  const [showPricing, setShowPricing] = useState(false);
  const [pricingIndex, setPricingIndex] = useState(0);
  const [allJobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [materials, setMaterials] = useState<InventoryItem[]>([]);
  const manualMaterialIndexes=useRef(new Set<number>());
  const [staff, setStaff] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [createdFilter, setCreatedFilter] = useState("all");
  const [customCreatedDate, setCustomCreatedDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [editing, setEditing] = useState<Job | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [deleteError, setDeleteError] = useState("");
  useEffect(()=>{if(!editing)manualMaterialIndexes.current.clear()},[!!editing]);
  const load = async (query = search) => {
    const [jobList, customerList, machineList, materialList, staffList] =
      await Promise.all([
        listJobs(query),
        listCustomers(),
        listMachines(),
        listInventory(),
        listUsers(),
      ]);
    setJobs(jobList);
    setCustomers(customerList);
    setMachines(machineList);
    setMaterials(materialList);
    setStaff(staffList.filter((employee) => employee.isActive));
  };
  useEffect(() => {
    void load("");
  }, []);
  useEffect(() => {
    if (createRequest > 0)
      setEditing({ ...emptyJob(), customerId: initialCustomerId });
  }, [createRequest, initialCustomerId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(search), 180);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!editing) {
      setCustomerQuery("");
      setCustomerPickerOpen(false);
      return;
    }
    const selected = customers.find(
      (customer) => customer.id === editing.customerId,
    );
    setCustomerQuery(selected?.name ?? "");
  }, [!!editing, editing?.id, customers]);
  const update = (field: keyof Job, value: string | number | null) =>
    setEditing((current) =>
      current ? { ...current, [field]: value } : current,
    );
  const persistJob = async () => {
    if (!editing) return;
    if (!editing.customerId) {
      setError(
        "Select a customer from the search results before saving this print job.",
      );
      return;
    }
    const draftItems = editing.items?.length
      ? editing.items
      : [
          {
            ...emptyItem(),
            title: editing.title,
            description: editing.description,
            unitPrice: editing.totalAmount,
            total: editing.totalAmount,
          },
        ];
    // Recalculate at the save boundary so inventory never receives a stale
    // materialUsed value from an earlier render or partially edited item.
    const items = draftItems.map((item) => ({
      ...item,
      materialUsed: automaticMaterialUsage(
        item,
        materials.find((material) => material.id === item.inventoryItemId),
      ),
      materialWaste: 0,
    }));
    if (items.some((item) => !item.title.trim())) {
      setError("Give every work item a title before saving this order.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const customer = customers.find((item) => item.id === editing.customerId);
      const wasEditing = !!editing.id;
      const total = items.reduce((sum, item) => sum + item.total, 0);
      const title = items
        .map((item) => item.title)
        .slice(0, 3)
        .join(", ");
      const saved = await saveJob({
        ...editing,
        items,
        title,
        description: `${items.length} work item${items.length === 1 ? "" : "s"}`,
        totalAmount: total,
        customerName: customer?.name,
      });
      notifyActivity({
        title: `${saved.jobNumber || "Print job"} ${wasEditing ? "updated" : "created"}`,
        detail: `${saved.customerName || "Walk-in customer"} · ${saved.title}`,
        page: "Jobs",
        tone: "info",
      });
      const usedMaterialIds=new Set(items.map(item=>item.inventoryItemId).filter(Boolean));
      if(usedMaterialIds.size){const refreshed=await listInventory();setMaterials(refreshed);for(const material of refreshed.filter(item=>usedMaterialIds.has(item.id))){const low=material.quantity<=material.reorderLevel;notifyActivity({title:low?`${material.name} is running low`:`${material.name} stock updated`,detail:`${material.quantity.toLocaleString("en-UG")} ${material.unit} remaining · ${(material.totalPrinted??0).toLocaleString("en-UG")} ${material.unit} printed · ${(material.totalWaste??0).toLocaleString("en-UG")} ${material.unit} lost`,page:"Inventory",tone:low?"warning":"info"});}}
      setEditing(null);
      await load();
    } catch (reason) {
      const detail = String(reason).replace(/^Error:\s*/, "");
      setError(
        detail && detail !== "[object Object]"
          ? detail
          : "The print job could not be saved. Please check its details and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await persistJob();
  };
  const removeJob = async () => { if(!deleting?.id)return;setSaving(true);setDeleteError("");try{await deleteRecord("job",deleting.id);notifyActivity({title:`${deleting.jobNumber||"Print job"} deleted`,detail:"The print job was removed permanently.",page:"Jobs",tone:"warning"});setDeleting(null);setEditing(null);await load()}catch(reason){setDeleteError(String(reason))}finally{setSaving(false)}};
  const updateItem = (
    index: number,
    field: keyof JobItem,
    value: string | number | null,
  ) =>
    setEditing((current) => {
      if (!current) return current;
      const items = [
        ...(current.items?.length ? current.items : [emptyItem()]),
      ];
      items[index] = { ...items[index], [field]: value };
      if((field==="title"||field==="workType")&&!manualMaterialIndexes.current.has(index)){
        const match=intelligentMaterialMatch(items[index].title,items[index].workType,materials);
        if(match?.id)items[index].inventoryItemId=match.id;
      }
      if (field === "quantity" || field === "unitPrice")
        items[index].total = Math.round(
          Number(items[index].quantity) * Number(items[index].unitPrice),
        );
      const selectedMaterial=materials.find(material=>material.id===items[index].inventoryItemId);
      items[index].materialUsed=automaticMaterialUsage(items[index],selectedMaterial);
      items[index].materialWaste=0;
      return {
        ...current,
        items,
        totalAmount: items.reduce((sum, item) => sum + item.total, 0),
      };
    });
  const addItem = () =>
    setEditing((current) =>
      current
        ? {
            ...current,
            items: [
              ...(current.items?.length ? current.items : [emptyItem()]),
              emptyItem(),
            ],
          }
        : current,
    );
  const removeItem = (index: number) =>
    setEditing((current) => {
      if (!current || !current.items || current.items.length <= 1)
        return current;
      const items = current.items.filter((_, position) => position !== index);
      return {
        ...current,
        items,
        totalAmount: items.reduce((sum, item) => sum + item.total, 0),
      };
    });
  const move = async (job: Job, status: string) => {
    if (!job.id || job.status === status) return;
    await updateJobStatus(job.id, status);
    notifyActivity({
      id: `job-update-${job.id}-${status}`,
      title: `${job.jobNumber || "Print job"} was updated`,
      detail: `${job.title} moved to ${status.replaceAll("_", " ")}.`,
      page: "Jobs",
      tone: "info",
    });
    setJobs((current) =>
      current.map((item) => (item.id === job.id ? { ...item, status } : item)),
    );
  };
  const dueTone = (date?: string | null) => {
    if (!date) return "";
    const difference = new Date(`${date}T23:59:59`).getTime() - Date.now();
    return difference < 0 ? "overdue" : difference < 86400000 ? "today" : "";
  };
  const filteredJobs = allJobs.filter(
    (job) =>
      (statusFilter === "all" || job.status === statusFilter) &&
      (priorityFilter === "all" || job.priority === priorityFilter) &&
      matchesCreatedDate(job.createdAt, createdFilter, customCreatedDate) &&
      (paymentFilter === "all" || paymentState(job) === paymentFilter),
  );
  const jobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "oldest") return (a.createdAt || "").localeCompare(b.createdAt || "");
    if (sortBy === "number-asc" || sortBy === "number-desc") {
      const number = (job: Job) => Number((job.jobNumber || "").match(/\d+/)?.[0] || 0);
      return (sortBy === "number-asc" ? 1 : -1) * (number(a) - number(b));
    }
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  const matchingCustomers = customers
    .filter((customer) => {
      const query = customerQuery.trim().toLowerCase();
      return (
        !query ||
        [customer.name, customer.company, customer.phone].some((value) =>
          value.toLowerCase().includes(query),
        )
      );
    })
    .slice(0, 8);
  const filterBar = (
    <section className="customer-toolbar filtered-toolbar jobs-filter-toolbar">
      <div>
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search job, customer or description…"
        />
      </div>
      <div className="toolbar-filters">
        <select
          aria-label="Filter by production stage"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All stages</option>
          {productionStages.map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by job creation date"
          value={createdFilter}
          onChange={(event) => setCreatedFilter(event.target.value)}
        >
          <option value="all">Created anytime</option>
          <option value="today">Created today</option>
          <option value="yesterday">Created yesterday</option>
          <option value="7days">Last 7 days</option>
          <option value="3months">Last 3 months</option>
          <option value="custom">Custom date…</option>
        </select>
        {createdFilter === "custom" && (
          <input
            className="jobs-custom-date"
            type="date"
            aria-label="Choose job creation date"
            value={customCreatedDate}
            onChange={(event) => setCustomCreatedDate(event.target.value)}
          />
        )}
        <select
          aria-label="Filter by payment status"
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
        >
          <option value="all">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="part-paid">Part paid</option>
          <option value="paid">Paid</option>
        </select>
        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          aria-label="Sort jobs"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="newest">Sort: Newest jobs</option>
          <option value="oldest">Sort: Oldest jobs</option>
          <option value="number-desc">Sort: Job number (high to low)</option>
          <option value="number-asc">Sort: Job number (low to high)</option>
        </select>
      </div>
      <span>{jobs.length} jobs</span>
    </section>
  );

  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">
            {board ? "WORKSHOP FLOW" : "JOB MANAGEMENT"}
          </p>
          <h1>{board ? "Production board" : "Print Jobs"}</h1>
          <p>
            {board
              ? "See every job’s current stage and move work through production."
              : "Plan, assign and track work from order to delivery."}
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setEditing(emptyJob())}
        >
          <Plus size={17} /> New print job
        </button>
      </section>
      <section className="jobs-summary">
        <div>
          <span>
            <Gauge size={18} />
          </span>
          <p>
            <strong>
              {jobs.filter((job) => job.status !== "delivered").length}
            </strong>
            Active jobs
          </p>
        </div>
        <div>
          <span>
            <CalendarClock size={18} />
          </span>
          <p>
            <strong>
              {jobs.filter((job) => dueTone(job.deadline) === "today").length}
            </strong>
            Due today
          </p>
        </div>
        <div>
          <span>
            <CircleAlert size={18} />
          </span>
          <p>
            <strong>
              {
                jobs.filter(
                  (job) =>
                    dueTone(job.deadline) === "overdue" &&
                    job.status !== "delivered",
                ).length
              }
            </strong>
            Overdue
          </p>
        </div>
        <div>
          <span>
            <Wrench size={18} />
          </span>
          <p>
            <strong>
              {
                jobs.filter(
                  (job) =>
                    job.status === "printing" || job.status === "finishing",
                ).length
              }
            </strong>
            In production
          </p>
        </div>
      </section>
      {filterBar}
      <section className="customer-toolbar">
        <div>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search job, customer or description…"
          />
        </div>
        <span>{jobs.length} jobs</span>
      </section>
      {board ? (
        <section className="production-board">
          {productionStages.map(([status, label]) => (
            <div className="board-column" key={status}>
              <header>
                <span className={`board-dot ${status}`} />
                <strong>{label}</strong>
                <i>{jobs.filter((job) => job.status === status).length}</i>
              </header>
              <div>
                {jobs
                  .filter((job) => job.status === status)
                  .map((job) => (
                    <article
                      className={`board-card ${job.priority}`}
                      key={job.id}
                      onClick={() => setEditing(job)}
                    >
                      <div>
                        <strong>{job.jobNumber}</strong>
                        <i>{job.priority}</i>
                      </div>
                      <h3>{job.title}</h3>
                      <p>{job.customerName || "Walk-in customer"}</p>
                      {job.deadline && (
                        <span className={dueTone(job.deadline)}>
                          <CalendarClock size={12} /> Due {job.deadline}
                        </span>
                      )}
                      <footer>
                        <small>
                          {job.assignedTo ? (
                            <>
                              <UserRound size={12} /> {job.assignedTo}
                            </>
                          ) : (
                            "Unassigned"
                          )}
                        </small>
                        <select
                          value={job.status}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            event.stopPropagation();
                            void move(job, event.target.value);
                          }}
                        >
                          {productionStages.map(([value, stage]) => (
                            <option value={value} key={value}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </footer>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="customer-panel">
          {jobs.length === 0 ? (
            <div className="customer-empty">
              <div>
                <Gauge size={28} />
              </div>
              <h2>Create your first print job</h2>
              <p>
                Jobs connect customers, deadlines, production assignments and
                delivery status.
              </p>
              <button
                className="primary-button"
                onClick={() => setEditing(emptyJob())}
              >
                <Plus size={16} /> New print job
              </button>
            </div>
          ) : (
            <div className="jobs-table">
              <div className="jobs-row labels">
                <span>JOB</span>
                <span>CUSTOMER</span>
                <span>STAGE</span>
                <span>ASSIGNMENT</span>
                <span>DEADLINE</span>
                <span>PAYMENT</span>
                <span>VALUE</span>
              </div>
              {jobs.map((job) => (
                <button
                  className="jobs-row"
                  key={job.id}
                  onClick={() => setEditing(job)}
                >
                  <span>
                    <strong>{job.jobNumber}</strong>
                    <small>{job.title}</small>
                  </span>
                  <span>{job.customerName || "Walk-in customer"}</span>
                  <span>
                    <i className={`job-stage ${job.status}`}>
                      {stageLabel(job.status)}
                    </i>
                  </span>
                  <span>
                    <strong>{job.assignedTo || "Unassigned"}</strong>
                    <small>{job.machineName || "No machine"}</small>
                  </span>
                  <span className={dueTone(job.deadline)}>
                    {job.deadline || "No deadline"}
                  </span>
                  <span className="job-payment">
                    <i className={paymentState(job)}>
                      {paymentState(job) === "paid"
                        ? "Paid"
                        : paymentState(job) === "part-paid"
                          ? "Part paid"
                          : "Unpaid"}
                    </i>
                    <small>
                      {paymentState(job) === "paid"
                        ? "Fully settled"
                        : `UGX ${Math.max(0, job.totalAmount - job.depositAmount).toLocaleString("en-UG")} due`}
                    </small>
                  </span>
                  <span>
                    <strong>
                      UGX {job.totalAmount.toLocaleString("en-UG")}
                    </strong>
                    <ChevronRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
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
                  <Settings2 size={18} />
                </span>
                <div>
                  <h2>{editing.id ? editing.jobNumber : "New print job"}</h2>
                  <p>One customer order with independently priced work items</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={19} />
              </button>
            </div>
            <div className="modal-body">
              <label className="customer-combobox-label">
                Customer
                <div
                  className={`customer-combobox ${customerPickerOpen ? "open" : ""}`}
                >
                  <Search size={16} />
                  <input
                    autoFocus
                    required
                    value={customerQuery}
                    onFocus={() => setCustomerPickerOpen(true)}
                    onChange={(event) => {
                      setCustomerQuery(event.target.value);
                      update("customerId", null);
                      setCustomerPickerOpen(true);
                    }}
                    onBlur={() =>
                      window.setTimeout(() => setCustomerPickerOpen(false), 120)
                    }
                    placeholder="Search customer by name, company or phone…"
                    autoComplete="off"
                  />
                  {editing.customerId && (
                    <span className="customer-selected-check">✓ Selected</span>
                  )}
                  {customerPickerOpen && (
                    <div className="customer-combobox-results">
                      {matchingCustomers.length === 0 ? (
                        <p>No customers match “{customerQuery}”</p>
                      ) : (
                        matchingCustomers.map((customer) => (
                          <button
                            type="button"
                            key={customer.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              update("customerId", customer.id ?? null);
                              setCustomerQuery(customer.name);
                              setCustomerPickerOpen(false);
                            }}
                          >
                            <span>
                              {customer.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <strong>{customer.name}</strong>
                              <small>
                                {[customer.company, customer.phone]
                                  .filter(Boolean)
                                  .join(" · ") || "Customer"}
                              </small>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </label>
              <section className="job-work-items">
                <header>
                  <div>
                    <strong>Work items</strong>
                    <small>
                      Add every size or type of work in this customer order.
                    </small>
                  </div>
                  <span>
                    {editing.items?.length || 1}{" "}
                    {(editing.items?.length || 1) === 1 ? "item" : "items"}
                  </span>
                </header>
                {(editing.items?.length
                  ? editing.items
                  : [
                      {
                        ...emptyItem(),
                        title: editing.title,
                        description: editing.description,
                        unitPrice: editing.totalAmount,
                        total: editing.totalAmount,
                      },
                    ]
                ).map((item, index) => (
                  <article key={item.id || index}>
                    <div className="work-item-head">
                      <span>{index + 1}</span>
                      <strong>Work item {index + 1}</strong>
                      {(editing.items?.length || 1) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          aria-label={`Remove work item ${index + 1}`}
                        >
                          <Trash2 />
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <label>
                        Work title
                        <input
                          required
                          value={item.title}
                          onChange={(event) =>
                            updateItem(index, "title", event.target.value)
                          }
                          placeholder="e.g. Outdoor banner"
                        />
                      </label>
                      <label>
                        Work type
                        <input
                          value={item.workType}
                          onChange={(event) =>
                            updateItem(index, "workType", event.target.value)
                          }
                          placeholder="Banner, stickers, cards…"
                        />
                      </label>
                    </div>
                    <label>
                      Specifications
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(event) =>
                          updateItem(index, "description", event.target.value)
                        }
                        placeholder="Material, finishing, artwork and production instructions…"
                      />
                    </label>
                    <div className="work-item-measures">
                      <label>
                        Width
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.width ?? ""}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "width",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                        />
                      </label>
                      <label>
                        Height / length
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.height ?? ""}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "height",
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                        />
                      </label>
                      <label>
                        Unit
                        <select
                          value={item.unit}
                          onChange={(event) =>
                            updateItem(index, "unit", event.target.value)
                          }
                        >
                          <option value="cm">Centimetres (cm)</option>
                          <option value="m">Metres (m)</option>
                          <option value="mm">Millimetres</option>
                          <option value="piece">Pieces</option>
                        </select>
                      </label>
                      <label>
                        Quantity
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className="work-item-material automatic">
                      <label>
                        Material from inventory
                        <select
                          value={item.inventoryItemId ?? ""}
                          onChange={(event) => {manualMaterialIndexes.current.add(index);updateItem(index, "inventoryItemId", event.target.value || null)}}
                        >
                          <option value="">No stock material selected</option>
                          {materials.filter(material=>material.isActive).map(material=><option key={material.id} value={material.id ?? ""}>{material.name} · {material.quantity.toLocaleString("en-UG")} {material.unit} remaining</option>)}
                        </select>
                      </label>
                      {item.inventoryItemId&&(()=>{const material=materials.find(entry=>entry.id===item.inventoryItemId);const used=automaticMaterialUsage(item,material);const smart=!manualMaterialIndexes.current.has(index);return <div className="automatic-material-preview">{smart&&<em className="smart-material-match"><Sparkles/> Smart inventory match</em>}<small>Automatic material calculation</small><strong>{used.toLocaleString("en-UG")} {material?.unit} will be used</strong><span>{Math.max(0,(material?.quantity??0)-used).toLocaleString("en-UG")} {material?.unit} remaining after this job</span></div>})()}
                    </div>
                    <div className="work-item-price">
                      <label>
                        Price per unit (UGX)
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "unitPrice",
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                      <div>
                        <small>Item total</small>
                        <strong>
                          UGX {item.total.toLocaleString("en-UG")}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPricingIndex(index);
                          setShowPricing(true);
                        }}
                      >
                        <Calculator /> Advanced calculator
                      </button>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  className="add-work-item"
                  onClick={addItem}
                >
                  <Plus /> Add another work item
                </button>
              </section>
              <label className="legacy-job-field">
                Job title
                <input
                  value={editing.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. Outdoor banner — 3 copies"
                />
              </label>
              <label className="legacy-job-field">
                Production description
                <textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Materials, finishing and artwork instructions…"
                />
              </label>
              <div className="form-row">
                <label>
                  Production stage
                  <select
                    value={editing.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    {productionStages.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={editing.priority}
                    onChange={(e) => update("priority", e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Production deadline
                  <input
                    type="date"
                    value={editing.deadline ?? ""}
                    onChange={(e) => update("deadline", e.target.value || null)}
                  />
                </label>
                <label>
                  Collection / delivery date
                  <input
                    type="date"
                    value={editing.deliveryDate ?? ""}
                    onChange={(e) =>
                      update("deliveryDate", e.target.value || null)
                    }
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Assigned staff
                  <select
                    value={editing.assignedTo}
                    onChange={(e) => update("assignedTo", e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((employee) => (
                      <option key={employee.id || employee.username} value={employee.fullName}>
                        {employee.fullName} · {employee.role.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Machine
                  <input
                    value={editing.machineName}
                    onChange={(e) => update("machineName", e.target.value)}
                    placeholder="e.g. Epson SureColor"
                  />
                </label>
              </div>
              <div className="form-row">
                <div className="job-order-total">
                  <small>Combined order total</small>
                  <strong>
                    UGX {editing.totalAmount.toLocaleString("en-UG")}
                  </strong>
                  <span>
                    {editing.items?.length || 1} work{" "}
                    {(editing.items?.length || 1) === 1 ? "item" : "items"}
                  </span>
                </div>
                <label className="legacy-job-field">
                  Job value (UGX)
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editing.totalAmount}
                    onChange={(e) =>
                      update("totalAmount", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Deposit received (UGX)
                  <input
                    type="number"
                    min="0"
                    step="100"
                    max={editing.totalAmount || undefined}
                    value={editing.depositAmount}
                    onChange={(e) =>
                      update("depositAmount", Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="job-pricing-button legacy-job-field"
                onClick={() => setShowPricing(true)}
              >
                <Calculator /> Calculate from dimensions, metres and production
                costs
              </button>
              {error && <p className="setup-error">{error}</p>}
            </div>
            <div className="modal-actions">
              {editing.id&&<button type="button" className="delete-link" onClick={()=>setDeleting(editing)}><Trash2/> Delete job</button>}
              <button
                type="button"
                className="setup-back"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button type="submit" className="setup-next" disabled={saving}>
                {saving ? "Saving…" : "Save print job"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleting&&<DeleteConfirm name={deleting.jobNumber||deleting.title||"Print job"} kind="print job" busy={saving} error={deleteError} onCancel={()=>setDeleting(null)} onConfirm={()=>void removeJob()}/>} 
      {editing &&
        showPricing &&
        (() => {
          const item = editing.items?.[pricingIndex] || emptyItem();
          const unit =
            item.unit === "mm" || item.unit === "cm" || item.unit === "m"
              ? item.unit
              : "cm";
          const factor = { mm: 0.001, cm: 0.01, m: 1 }[unit];
          return (
            <AdvancedPricingCalculator
              title={`Pricing · Work item ${pricingIndex + 1}`}
              initialDimensionUnit={unit}
              item={{
                description: item.title || "New work item",
                quantity: item.quantity,
                width: item.width ?? null,
                height: item.height ?? null,
                unit: item.unit,
                unitPrice: item.unitPrice,
                total: item.total,
              }}
              onClose={() => setShowPricing(false)}
              onApply={(result) => {
                updateItem(pricingIndex, "width", result.widthMeters / factor);
                updateItem(
                  pricingIndex,
                  "height",
                  result.heightMeters / factor,
                );
                updateItem(pricingIndex, "quantity", result.quantity);
                updateItem(
                  pricingIndex,
                  "unitPrice",
                  result.quantity
                    ? Math.round(result.total / result.quantity)
                    : result.total,
                );
                updateItem(pricingIndex, "total", result.total);
                setShowPricing(false);
              }}
            />
          );
        })()}
    </>
  );
}

function localDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function matchesCreatedDate(
  createdAt: string | null | undefined,
  filter: string,
  custom: string,
) {
  if (filter === "all") return true;
  if (!createdAt) return false;
  const key = localTimestampDate(createdAt);
  const now = new Date();
  const today = localDateKey(now);
  if (filter === "today") return key === today;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (filter === "yesterday") return key === localDateKey(yesterday);
  if (filter === "custom") return !!custom && key === custom;
  const start = new Date(now);
  if (filter === "7days") start.setDate(start.getDate() - 6);
  else if (filter === "3months") start.setMonth(start.getMonth() - 3);
  return key >= localDateKey(start) && key <= today;
}
function localTimestampDate(value:string){
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const normalized=value.includes(" ")&&!value.includes("T")?value.replace(" ","T"):value;
  const date=new Date(/Z$|[+-]\d\d:?\d\d$/.test(normalized)?normalized:`${normalized}Z`);
  return Number.isNaN(date.getTime())?value.slice(0,10):localDateKey(date);
}

