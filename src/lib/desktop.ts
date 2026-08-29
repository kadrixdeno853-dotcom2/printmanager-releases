import { invoke } from "@tauri-apps/api/core";
import { notifyActivity } from "./activity";

export type BusinessProfile = {
  id?: string | null;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  tin: string;
  currency: string;
  ownerName: string;
  logoData?: string;
};

export type Customer = {
  id?: string | null;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  tin: string;
  creditLimit: number;
  notes: string;
};

export type Product = {
  id?: string | null;
  name: string;
  category: string;
  description: string;
  unit: string;
  pricingMethod: string;
  sellingPrice: number;
  estimatedCost: number;
  minimumCharge: number;
  isActive: boolean;
};

export type QuotationItem = {
  id?: string | null;
  productId?: string | null;
  description: string;
  quantity: number;
  width?: number | null;
  height?: number | null;
  unit: string;
  unitPrice: number;
  total: number;
};

export type Quotation = {
  id?: string | null;
  quotationNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  status: string;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  terms: string;
  items: QuotationItem[];
};

export type JobItem = {id?:string|null;title:string;workType:string;description:string;width?:number|null;height?:number|null;unit:string;quantity:number;unitPrice:number;total:number;inventoryItemId?:string|null;materialUsed:number;materialWaste:number};
export type Job = {
  id?: string | null;
  jobNumber?: string | null;
  quotationId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline?: string | null;
  deliveryDate?: string | null;
  assignedTo: string;
  machineName: string;
  artworkStatus: string;
  deliveryMethod: string;
  deliveryAddress: string;
  deliveryNotes: string;
  totalAmount: number;
  depositAmount: number;
  createdAt?: string | null;
  items?: JobItem[];
};
export type Machine = {
  id?: string | null;
  name: string;
  machineType: string;
  model: string;
  status: string;
  notes: string;
  isActive: boolean;
};

export type InvoiceItem = {
  id?: string | null;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};
export type Invoice = {
  id?: string | null;
  invoiceNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  jobId?: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes: string;
  items: InvoiceItem[];
};
export type Payment = {
  id?: string | null;
  receiptNumber?: string | null;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  paidAt: string;
  notes: string;
};
export type Expense = {
  id?: string | null;
  expenseNumber?: string | null;
  jobId?: string | null;
  jobNumber?: string | null;
  purchaseId?: string | null;
  category: string;
  payee: string;
  description: string;
  amount: number;
  amountPaid?: number;
  dueDate?: string;
  paymentStatus?: string;
  expenseDate: string;
  paymentMethod: string;
  reference: string;
  notes: string;
};
export type CategoryTotal = { category: string; amount: number };
export type FinanceSummary = {
  fromDate: string;
  toDate: string;
  invoiced: number;
  collected: number;
  expenses: number;
  netCash: number;
  outstanding: number;
  jobCosts: number;
  categories: CategoryTotal[];
};
export type Supplier = {
  id?: string | null;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  tin: string;
  notes: string;
  isActive: boolean;
};
export type InventoryItem = {
  id?: string | null;
  sku?: string | null;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  isActive: boolean;
  totalPurchased?: number;
  totalPrinted?: number;
  totalWaste?: number;
  totalRevenue?: number;
};
export type PurchaseItem = {
  id?: string | null;
  inventoryItemId: string;
  itemName?: string | null;
  quantity: number;
  unitCost: number;
  total: number;
  materialName?: string;
  materialCategory?: string;
  materialUnit?: string;
  materialReorderLevel?: number;
  rollCount?: number;
  metresPerRoll?: number;
};
export type Purchase = {
  id?: string | null;
  purchaseNumber?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  purchaseDate: string;
  paymentStatus: string;
  paymentMethod: string;
  reference: string;
  total: number;
  amountPaid?: number;
  dueDate?: string;
  notes: string;
  items: PurchaseItem[];
};
export type StockUsage = {
  inventoryItemId: string;
  jobId: string;
  printedQuantity: number;
  wasteQuantity: number;
  revenue: number;
  reason: string;
};
export type User = {
  id?: string | null;
  fullName: string;
  username: string;
  role: string;
  phone: string;
  isActive: boolean;
  lastLoginAt?: string | null;
};
export type UserInput = {
  id?: string | null;
  fullName: string;
  username: string;
  password: string;
  role: string;
  phone: string;
  isActive: boolean;
};
export type DashboardSummary = {
  salesToday: number;
  salesMonth: number;
  expensesToday: number;
  expensesMonth: number;
  netCashMonth: number;
  outstanding: number;
  activeJobs: number;
  jobsDueToday: number;
  overdueJobs: number;
  completedJobs: number;
  recentJobs: Job[];
};
export type BackupInfo = {
  fileName: string;
  path: string;
  size: number;
  createdAt: string;
  encrypted: boolean;
};
export type AuditEntry = {
  id: string;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
};
export type CompanyNetworkStatus = { mode:string; serverAddress:string; joinCode:string; connected:boolean; message:string };
export async function getCompanyNetworkStatus():Promise<CompanyNetworkStatus>{if(isDesktop())return invoke<CompanyNetworkStatus>("get_company_network_status");return{mode:"local",serverAddress:"",joinCode:"",connected:false,message:"Available in the installed application"}}
export async function configureCompanyNetwork(mode:string,serverAddress:string,joinCode:string):Promise<CompanyNetworkStatus>{if(isDesktop())return invoke<CompanyNetworkStatus>("configure_company_network",{mode,serverAddress,joinCode});throw new Error("Company networking is available in the installed application.")}

const browserStorageKey = "printmanager.business-profile";
const customerStorageKey = "printmanager.customers";
const productStorageKey = "printmanager.products";
const quotationStorageKey = "printmanager.quotations";
const jobStorageKey = "printmanager.jobs";
const invoiceStorageKey = "printmanager.invoices";
const paymentStorageKey = "printmanager.payments";
const expenseStorageKey = "printmanager.expenses";
const supplierStorageKey = "printmanager.suppliers";
const inventoryStorageKey = "printmanager.inventory";
const purchaseStorageKey = "printmanager.purchases";
const userStorageKey = "printmanager.users";
const sessionStorageKey = "printmanager.session-user";
const machineStorageKey = "printmanager.machines";

function isDesktop() {
  return "__TAURI_INTERNALS__" in window;
}
async function companyRpc<T>(action:string,payload:unknown={}):Promise<{remote:boolean;data?:T}>{
  if(!isDesktop())return{remote:false};
  const status=await invoke<CompanyNetworkStatus>("get_company_network_status");
  if(status.mode!=="client")return{remote:false};
  return{remote:true,data:await invoke<T>("company_network_rpc",{action,payload})};
}
async function requireOwnerComputer(operation:string){if(!isDesktop())return;const status=await invoke<CompanyNetworkStatus>("get_company_network_status");if(status.mode==="client")throw new Error(`${operation} must be completed on the owner computer because it stores the company database.`)}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  if (isDesktop()){const remote=await companyRpc<BusinessProfile|null>("business.get");if(remote.remote)return remote.data??null;return invoke<BusinessProfile | null>("get_business_profile");}
  const saved = localStorage.getItem(browserStorageKey);
  return saved ? (JSON.parse(saved) as BusinessProfile) : null;
}

export async function saveBusinessProfile(
  profile: BusinessProfile,
): Promise<BusinessProfile> {
  if (isDesktop()){const remote=await companyRpc<BusinessProfile>("business.save",profile);if(remote.remote)return remote.data!;return invoke<BusinessProfile>("save_business_profile", { profile });}
  const saved = { ...profile, id: profile.id ?? crypto.randomUUID() };
  localStorage.setItem(browserStorageKey, JSON.stringify(saved));
  return saved;
}
export async function listAuditEntries(limit = 100): Promise<AuditEntry[]> {
  if (isDesktop()){const remote=await companyRpc<AuditEntry[]>("audit.list",{limit});if(remote.remote)return remote.data??[];return invoke<AuditEntry[]>("list_audit_entries", { limit });}
  return [];
}

export async function createLocalBackup(): Promise<string> {
  if (isDesktop()){await requireOwnerComputer("Backup");return invoke<string>("create_local_backup");}
  throw new Error(
    "Backup creation is available in the installed desktop application.",
  );
}
export async function listBackups(): Promise<BackupInfo[]> {
  if (isDesktop()){await requireOwnerComputer("Backup history");return invoke<BackupInfo[]>("list_backups");}
  return [];
}
export async function restoreLocalBackup(fileName: string): Promise<void> {
  if (isDesktop()){await requireOwnerComputer("Restore");return invoke<void>("restore_local_backup", { fileName });}
  throw new Error("Restore is available in the installed desktop application.");
}
export async function restoreEncryptedBackup(
  fileName: string,
  password: string,
): Promise<void> {
  if (isDesktop()){await requireOwnerComputer("Restore");return invoke<void>("restore_encrypted_backup", { fileName, password });}
  throw new Error("Restore is available in the installed desktop application.");
}
export async function recoverEncryptedPackage(packageBytes:number[],password:string):Promise<void>{if(isDesktop())return invoke<void>("recover_encrypted_package",{package:packageBytes,password});throw new Error("Company recovery is available in the installed desktop application.");}
export async function recoverDatabaseFile(databaseBytes:number[]):Promise<void>{if(isDesktop())return invoke<void>("recover_database_file",{databaseFile:databaseBytes});throw new Error("Company recovery is available in the installed desktop application.");}
export async function createEncryptedBackup(
  password: string,
  syncFolder: string,
): Promise<string> {
  if (isDesktop()){await requireOwnerComputer("Encrypted backup");
    return invoke<string>("create_encrypted_backup", {
      password,
      syncFolder: syncFolder || null,
    });}
  throw new Error(
    "Encrypted backup is available in the installed desktop application.",
  );
}

export type DropboxConnection = { connected: boolean; displayName?: string | null; email?: string | null };
export type DropboxBackup = { name: string; size: number; modified: string };
export async function getDropboxStatus():Promise<DropboxConnection>{if(isDesktop())return invoke<DropboxConnection>("dropbox_status");return{connected:false}}
export async function connectDropbox():Promise<DropboxConnection>{if(isDesktop())return invoke<DropboxConnection>("connect_dropbox");throw new Error("Dropbox connection is available in the installed desktop application.")}
export async function disconnectDropbox():Promise<void>{if(isDesktop()){await requireOwnerComputer("Dropbox connection");return invoke<void>("disconnect_dropbox")}}
export async function createDropboxBackup(password:string):Promise<DropboxBackup>{if(isDesktop()){await requireOwnerComputer("Dropbox backup");return invoke<DropboxBackup>("create_dropbox_backup",{password})}throw new Error("Dropbox backup is available in the installed desktop application.")}
export async function listDropboxBackups():Promise<DropboxBackup[]>{if(isDesktop())return invoke<DropboxBackup[]>("list_dropbox_backups");return[]}
export async function restoreDropboxBackup(name:string,password:string):Promise<void>{if(isDesktop())return invoke<void>("restore_dropbox_backup",{name,password});throw new Error("Dropbox restore is available in the installed desktop application.")}
export async function recoverDropboxBackup(name:string,password:string):Promise<void>{if(isDesktop())return invoke<void>("recover_dropbox_backup",{name,password});throw new Error("Dropbox recovery is available in the installed desktop application.")}

export async function listCustomers(search = ""): Promise<Customer[]> {
  if (isDesktop()){const remote=await companyRpc<Customer[]>("customers.list",{search});if(remote.remote)return remote.data??[];return invoke<Customer[]>("list_customers", { search });}
  const customers = JSON.parse(
    localStorage.getItem(customerStorageKey) ?? "[]",
  ) as Customer[];
  const query = search.trim().toLowerCase();
  return customers
    .filter(
      (customer) =>
        !query ||
        [customer.name, customer.company, customer.phone].some((value) =>
          value.toLowerCase().includes(query),
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  if (isDesktop()){const remote=await companyRpc<Customer>("customers.save",customer);if(remote.remote)return remote.data!;return invoke<Customer>("save_customer", { customer });}
  const customers = JSON.parse(
    localStorage.getItem(customerStorageKey) ?? "[]",
  ) as Customer[];
  const saved = { ...customer, id: customer.id ?? crypto.randomUUID() };
  const index = customers.findIndex((item) => item.id === saved.id);
  if (index >= 0) customers[index] = saved;
  else customers.push(saved);
  localStorage.setItem(customerStorageKey, JSON.stringify(customers));
  return saved;
}

export async function deleteRecord(entity: string, id: string): Promise<void> {
  if (isDesktop()){const remote=await companyRpc<void>("records.delete",{entity,id});if(remote.remote)return;return invoke<void>("delete_record", { entity, id });}
  const keys: Record<string, string> = {
    customer: customerStorageKey,
    product: productStorageKey,
    quotation: quotationStorageKey,
    job: jobStorageKey,
    invoice: invoiceStorageKey,
    expense: expenseStorageKey,
    material: inventoryStorageKey,
    supplier: supplierStorageKey,
    purchase: purchaseStorageKey,
    machine: machineStorageKey,
  };
  const key = keys[entity];
  if (!key) throw new Error("This record type cannot be deleted");
  const list = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
    id?: string | null;
  }>;
  localStorage.setItem(
    key,
    JSON.stringify(list.filter((item) => item.id !== id)),
  );
}

export async function listProducts(search = ""): Promise<Product[]> {
  if (isDesktop()){const remote=await companyRpc<Product[]>("products.list",{search});if(remote.remote)return remote.data??[];return invoke<Product[]>("list_products", { search });}
  const products = JSON.parse(
    localStorage.getItem(productStorageKey) ?? "[]",
  ) as Product[];
  const query = search.trim().toLowerCase();
  return products
    .filter(
      (product) =>
        !query ||
        [product.name, product.category].some((value) =>
          value.toLowerCase().includes(query),
        ),
    )
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name),
    );
}

export async function saveProduct(product: Product): Promise<Product> {
  if (isDesktop()){const remote=await companyRpc<Product>("products.save",product);if(remote.remote)return remote.data!;return invoke<Product>("save_product", { product });}
  const products = JSON.parse(
    localStorage.getItem(productStorageKey) ?? "[]",
  ) as Product[];
  const saved = { ...product, id: product.id ?? crypto.randomUUID() };
  const index = products.findIndex((item) => item.id === saved.id);
  if (index >= 0) products[index] = saved;
  else products.push(saved);
  localStorage.setItem(productStorageKey, JSON.stringify(products));
  return saved;
}

export async function listQuotations(): Promise<Quotation[]> {
  if (isDesktop()){const remote=await companyRpc<Quotation[]>("quotations.list");if(remote.remote)return remote.data??[];return invoke<Quotation[]>("list_quotations");}
  return (
    JSON.parse(localStorage.getItem(quotationStorageKey) ?? "[]") as Quotation[]
  ).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export async function saveQuotation(quotation: Quotation): Promise<Quotation> {
  if (isDesktop()){const remote=await companyRpc<Quotation>("quotations.save",quotation);if(remote.remote)return remote.data!;return invoke<Quotation>("save_quotation", { quotation });}
  const quotations = JSON.parse(
    localStorage.getItem(quotationStorageKey) ?? "[]",
  ) as Quotation[];
  const index = quotations.findIndex((item) => item.id === quotation.id);
  const saved = {
    ...quotation,
    id: quotation.id ?? crypto.randomUUID(),
    quotationNumber:
      quotation.quotationNumber ??
      `QT-${String(index >= 0 ? index + 1 : quotations.length + 1).padStart(5, "0")}`,
    items: quotation.items.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
    })),
  };
  if (index >= 0) quotations[index] = saved;
  else quotations.push(saved);
  localStorage.setItem(quotationStorageKey, JSON.stringify(quotations));
  return saved;
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  if (isDesktop()){const remote=await companyRpc<Quotation|null>("quotations.get",{id});if(remote.remote)return remote.data??null;return invoke<Quotation | null>("get_quotation", { id });}
  const quotations = JSON.parse(
    localStorage.getItem(quotationStorageKey) ?? "[]",
  ) as Quotation[];
  return quotations.find((quotation) => quotation.id === id) ?? null;
}

export async function updateQuotationStatus(
  id: string,
  status: string,
): Promise<void> {
  if (isDesktop()){const remote=await companyRpc<void>("quotations.status",{id,status});if(remote.remote)return;return invoke<void>("update_quotation_status", { id, status });}
  const quotations = JSON.parse(
    localStorage.getItem(quotationStorageKey) ?? "[]",
  ) as Quotation[];
  const quotation = quotations.find((item) => item.id === id);
  if (quotation) quotation.status = status;
  localStorage.setItem(quotationStorageKey, JSON.stringify(quotations));
}

export async function convertQuotationToJob(id: string): Promise<string> {
  if (isDesktop()){const remote=await companyRpc<string>("quotations.convert",{id});if(remote.remote)return remote.data!;return invoke<string>("convert_quotation_to_job", { id });}
  const jobs = JSON.parse(localStorage.getItem(jobStorageKey) ?? "[]") as Job[];
  const existing = jobs.find((job) => job.quotationId === id);
  if (existing) return existing.jobNumber ?? "Existing job";
  const quotations = JSON.parse(
    localStorage.getItem(quotationStorageKey) ?? "[]",
  ) as Quotation[];
  const quotation = quotations.find((item) => item.id === id);
  const jobNumber = `JOB-${String(jobs.length + 1).padStart(5, "0")}`;
  jobs.push({
    id: crypto.randomUUID(),
    jobNumber,
    quotationId: id,
    customerId: quotation?.customerId,
    customerName: quotation?.customerName,
    title:
      quotation?.items
        .map((item) => item.description)
        .slice(0, 3)
        .join(", ") || "Print job",
    description: "Created from accepted quotation",
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
    totalAmount: quotation?.total ?? 0,
    depositAmount: 0,
  });
  localStorage.setItem(jobStorageKey, JSON.stringify(jobs));
  return jobNumber;
}

export async function listJobs(search = ""): Promise<Job[]> {
  if (isDesktop()){const remote=await companyRpc<Job[]>("jobs.list",{search});if(remote.remote)return remote.data??[];return invoke<Job[]>("list_jobs", { search });}
  const jobs = JSON.parse(localStorage.getItem(jobStorageKey) ?? "[]") as Job[];
  const query = search.trim().toLowerCase();
  return jobs.filter(
    (job) =>
      !query ||
      [job.jobNumber, job.title, job.customerName].some((value) =>
        value?.toLowerCase().includes(query),
      ),
  );
}

export async function saveJob(job: Job): Promise<Job> {
  if (isDesktop()){const remote=await companyRpc<Job>("jobs.save",job);if(remote.remote)return remote.data!;return invoke<Job>("save_job", { job });}
  const jobs = JSON.parse(localStorage.getItem(jobStorageKey) ?? "[]") as Job[];
  const index = jobs.findIndex((item) => item.id === job.id);
  const id = job.id ?? crypto.randomUUID();
  let jobNumber = job.jobNumber?.trim() ?? "";
  const numberTaken = (value: string) => jobs.some((item) => item.jobNumber === value && item.id !== id);
  if (!jobNumber || numberTaken(jobNumber)) { let next = jobs.reduce((max, item) => { const match = /^JOB-(\d+)$/.exec(item.jobNumber ?? ""); return match ? Math.max(max, Number(match[1])) : max; }, 0) + 1; do { jobNumber = `JOB-${String(next++).padStart(5, "0")}`; } while (numberTaken(jobNumber)); }
  const saved = {
    ...job,
    title:job.items?.map(item=>item.title).filter(Boolean).slice(0,3).join(", ")||job.title,
    description:job.items?.length?`${job.items.length} work item${job.items.length===1?"":"s"}`:job.description,
    totalAmount:job.items?.length?job.items.reduce((sum,item)=>sum+item.total,0):job.totalAmount,
    id,
    createdAt:job.createdAt??new Date().toISOString(),
    jobNumber,
  };
  if (index >= 0) jobs[index] = saved;
  else jobs.push(saved);
  localStorage.setItem(jobStorageKey, JSON.stringify(jobs));
  return saved;
}

export async function updateJobStatus(
  id: string,
  status: string,
): Promise<void> {
  if (isDesktop()){const remote=await companyRpc<void>("jobs.status",{id,status});if(remote.remote)return;return invoke<void>("update_job_status", { id, status });}
  const jobs = JSON.parse(localStorage.getItem(jobStorageKey) ?? "[]") as Job[];
  const job = jobs.find((item) => item.id === id);
  if (job) job.status = status;
  localStorage.setItem(jobStorageKey, JSON.stringify(jobs));
}
export async function listMachines(): Promise<Machine[]> {
  if (isDesktop()){const remote=await companyRpc<Machine[]>("machines.list");if(remote.remote)return remote.data??[];return invoke<Machine[]>("list_machines");}
  return JSON.parse(
    localStorage.getItem(machineStorageKey) ?? "[]",
  ) as Machine[];
}
export async function saveMachine(machine: Machine): Promise<Machine> {
  if (isDesktop()){const remote=await companyRpc<Machine>("machines.save",machine);if(remote.remote)return remote.data!;return invoke<Machine>("save_machine", { machine });}
  const list = await listMachines();
  const saved = { ...machine, id: machine.id ?? crypto.randomUUID() };
  const index = list.findIndex((item) => item.id === saved.id);
  if (index >= 0) list[index] = saved;
  else list.push(saved);
  localStorage.setItem(machineStorageKey, JSON.stringify(list));
  return saved;
}

export async function listInvoices(): Promise<Invoice[]> {
  if (isDesktop()){const remote=await companyRpc<Invoice[]>("invoices.list");if(remote.remote)return remote.data??[];return invoke<Invoice[]>("list_invoices");}
  const invoices = JSON.parse(
    localStorage.getItem(invoiceStorageKey) ?? "[]",
  ) as Invoice[];
  const payments = JSON.parse(
    localStorage.getItem(paymentStorageKey) ?? "[]",
  ) as Payment[];
  return invoices.map((invoice) => {
    const paid = payments
      .filter((payment) => payment.invoiceId === invoice.id)
      .reduce((sum, payment) => sum + payment.amount, 0);
    return {
      ...invoice,
      amountPaid: paid,
      balance: invoice.total - paid,
      status:
        paid >= invoice.total ? "paid" : paid > 0 ? "part_paid" : "unpaid",
    };
  });
}

export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  if (isDesktop()){const remote=await companyRpc<Invoice>("invoices.save",invoice);if(remote.remote)return remote.data!;return invoke<Invoice>("save_invoice", { invoice });}
  const invoices = JSON.parse(
    localStorage.getItem(invoiceStorageKey) ?? "[]",
  ) as Invoice[];
  const saved = {
    ...invoice,
    id: invoice.id ?? crypto.randomUUID(),
    invoiceNumber:
      invoice.invoiceNumber ??
      `INV-${String(invoices.length + 1).padStart(5, "0")}`,
    status: "unpaid",
    amountPaid: 0,
    balance: invoice.total,
    items: invoice.items.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
    })),
  };
  const index = invoices.findIndex((item) => item.id === saved.id);
  if (index >= 0) invoices[index] = saved;
  else invoices.push(saved);
  localStorage.setItem(invoiceStorageKey, JSON.stringify(invoices));
  return saved;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (isDesktop()){const remote=await companyRpc<Invoice|null>("invoices.get",{id});if(remote.remote)return remote.data??null;return invoke<Invoice | null>("get_invoice", { id });}
  return (await listInvoices()).find((invoice) => invoice.id === id) ?? null;
}

export async function listPayments(invoiceId: string): Promise<Payment[]> {
  if (isDesktop()){const remote=await companyRpc<Payment[]>("payments.list",{invoiceId});if(remote.remote)return remote.data??[];return invoke<Payment[]>("list_payments", { invoiceId });}
  return (
    JSON.parse(localStorage.getItem(paymentStorageKey) ?? "[]") as Payment[]
  )
    .filter((payment) => payment.invoiceId === invoiceId)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function recordPayment(payment: Payment): Promise<Payment> {
  if (isDesktop()){const remote=await companyRpc<Payment>("payments.save",payment);if(remote.remote)return remote.data!;return invoke<Payment>("record_payment", { payment });}
  const payments = JSON.parse(
    localStorage.getItem(paymentStorageKey) ?? "[]",
  ) as Payment[];
  const saved = {
    ...payment,
    id: crypto.randomUUID(),
    receiptNumber: `RCT-${String(payments.length + 1).padStart(5, "0")}`,
  };
  payments.push(saved);
  localStorage.setItem(paymentStorageKey, JSON.stringify(payments));
  return saved;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (isDesktop()){const remote=await companyRpc<DashboardSummary>("dashboard.get");if(remote.remote)return remote.data!;return invoke<DashboardSummary>("get_dashboard_summary");}
  const invoices = await listInvoices();
  const jobs = await listJobs();
  const payments = JSON.parse(
    localStorage.getItem(paymentStorageKey) ?? "[]",
  ) as Payment[];
  const now = todayKey();
  const month = now.slice(0, 7);
  const expenses = await listExpenses();
  const salesToday = payments
    .filter((payment) => payment.paidAt.slice(0, 10) === now)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const salesMonth = payments
    .filter((payment) => payment.paidAt.slice(0, 7) === month)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const expensesToday = expenses
    .filter((expense) => expense.expenseDate === now)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const expensesMonth = expenses
    .filter((expense) => expense.expenseDate.slice(0, 7) === month)
    .reduce((sum, expense) => sum + expense.amount, 0);
  return {
    salesToday,
    salesMonth,
    expensesToday,
    expensesMonth,
    netCashMonth: salesMonth - expensesMonth,
    outstanding: invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
    activeJobs: jobs.filter((job) => job.status !== "delivered").length,
    jobsDueToday: jobs.filter(
      (job) => job.status !== "delivered" && job.deadline === now,
    ).length,
    overdueJobs: jobs.filter(
      (job) => job.status !== "delivered" && job.deadline && job.deadline < now,
    ).length,
    completedJobs: jobs.filter((job) => job.status === "delivered").length,
    recentJobs: jobs.slice(0, 5),
  };
}

export async function listExpenses(search = ""): Promise<Expense[]> {
  if (isDesktop()){const remote=await companyRpc<Expense[]>("expenses.list",{search});if(remote.remote)return remote.data??[];return invoke<Expense[]>("list_expenses", { search });}
  const expenses = JSON.parse(
    localStorage.getItem(expenseStorageKey) ?? "[]",
  ) as Expense[];
  const query = search.toLowerCase();
  return expenses
    .filter(
      (expense) =>
        !query ||
        [
          expense.expenseNumber,
          expense.category,
          expense.payee,
          expense.description,
        ].some((value) => value?.toLowerCase().includes(query)),
    )
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
}
export async function saveExpense(expense: Expense): Promise<Expense> {
  if (isDesktop()){const remote=await companyRpc<Expense>("expenses.save",expense);if(remote.remote)return remote.data!;return invoke<Expense>("save_expense", { expense });}
  if((expense.amountPaid??0)<0||(expense.amountPaid??0)>expense.amount)throw new Error("Amount paid must be between zero and the total expense");
  const expenses = JSON.parse(
    localStorage.getItem(expenseStorageKey) ?? "[]",
  ) as Expense[];
  const id = expense.id ?? crypto.randomUUID();
  let expenseNumber = expense.expenseNumber?.trim() ?? "";
  const numberTaken = (value: string) => expenses.some((item) => item.expenseNumber === value && item.id !== id);
  if (!expenseNumber || numberTaken(expenseNumber)) {
    const highest = expenses.reduce((max, item) => {
      const match = /^EXP-(\d+)$/.exec(item.expenseNumber ?? "");
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    let next = highest + 1;
    do { expenseNumber = `EXP-${String(next++).padStart(5, "0")}`; } while (numberTaken(expenseNumber));
  }
  const saved = {
    ...expense,
    id,
    expenseNumber,
  };
  saved.paymentStatus=(saved.amountPaid??0)<=0?"unpaid":(saved.amountPaid??0)>=saved.amount?"paid":"part-paid";
  const index = expenses.findIndex((item) => item.id === saved.id);
  if (index >= 0) expenses[index] = saved;
  else expenses.push(saved);
  localStorage.setItem(expenseStorageKey, JSON.stringify(expenses));
  return saved;
}
export async function getFinanceSummary(
  fromDate: string,
  toDate: string,
): Promise<FinanceSummary> {
  if (isDesktop()){const remote=await companyRpc<FinanceSummary>("finance.get",{fromDate,toDate});if(remote.remote)return remote.data!;return invoke<FinanceSummary>("get_finance_summary", { fromDate, toDate });}
  const invoices = (await listInvoices()).filter(
    (invoice) => invoice.issueDate >= fromDate && invoice.issueDate <= toDate,
  );
  const payments = (
    JSON.parse(localStorage.getItem(paymentStorageKey) ?? "[]") as Payment[]
  ).filter(
    (payment) =>
      payment.paidAt.slice(0, 10) >= fromDate &&
      payment.paidAt.slice(0, 10) <= toDate,
  );
  const expenses = (await listExpenses()).filter(
    (expense) =>
      expense.expenseDate >= fromDate && expense.expenseDate <= toDate,
  );
  const categories = Array.from(
    expenses.reduce(
      (map, expense) =>
        map.set(
          expense.category,
          (map.get(expense.category) ?? 0) + expense.amount,
        ),
      new Map<string, number>(),
    ),
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    fromDate,
    toDate,
    invoiced: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    collected,
    expenses: spent,
    netCash: collected - spent,
    outstanding: (await listInvoices()).reduce(
      (sum, invoice) => sum + invoice.balance,
      0,
    ),
    jobCosts: expenses
      .filter((expense) => expense.jobId)
      .reduce((sum, expense) => sum + expense.amount, 0),
    categories,
  };
}

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export async function listSuppliers(): Promise<Supplier[]> {
  if (isDesktop()){const remote=await companyRpc<Supplier[]>("suppliers.list");if(remote.remote)return remote.data??[];return invoke<Supplier[]>("list_suppliers");}
  return JSON.parse(
    localStorage.getItem(supplierStorageKey) ?? "[]",
  ) as Supplier[];
}
export async function saveSupplier(supplier: Supplier): Promise<Supplier> {
  const wasEditing = !!supplier.id;
  let saved: Supplier;
  if (isDesktop()){const remote=await companyRpc<Supplier>("suppliers.save",supplier);saved=remote.remote?remote.data!:await invoke<Supplier>("save_supplier", { supplier });}
  else {
    const list = await listSuppliers();
    saved = { ...supplier, id: supplier.id ?? crypto.randomUUID() };
    const index = list.findIndex((item) => item.id === saved.id);
    if (index >= 0) list[index] = saved;
    else list.push(saved);
    localStorage.setItem(supplierStorageKey, JSON.stringify(list));
  }
  notifyActivity({
    title: `Supplier ${wasEditing ? "updated" : "created"}`,
    detail: saved.name,
    page: "Inventory",
    tone: "info",
  });
  return saved;
}
export async function listInventory(): Promise<InventoryItem[]> {
  if (isDesktop()){const remote=await companyRpc<InventoryItem[]>("inventory.list");if(remote.remote)return remote.data??[];return invoke<InventoryItem[]>("list_inventory");}
  return JSON.parse(
    localStorage.getItem(inventoryStorageKey) ?? "[]",
  ) as InventoryItem[];
}
export async function saveInventoryItem(
  item: InventoryItem,
): Promise<InventoryItem> {
  const wasEditing = !!item.id;
  let saved: InventoryItem;
  if (isDesktop()){const remote=await companyRpc<InventoryItem>("inventory.save",item);saved=remote.remote?remote.data!:await invoke<InventoryItem>("save_inventory_item", { item });}
  else {
    const list = await listInventory();
    saved = {
      ...item,
      id: item.id ?? crypto.randomUUID(),
      sku: item.sku ?? `MAT-${String(list.length + 1).padStart(4, "0")}`,
    };
    const index = list.findIndex((entry) => entry.id === saved.id);
    if (index >= 0) list[index] = saved;
    else list.push(saved);
    localStorage.setItem(inventoryStorageKey, JSON.stringify(list));
  }
  notifyActivity({
    title: `Material ${wasEditing ? "updated" : "created"}`,
    detail: `${saved.name}  ${saved.quantity} ${saved.unit}`,
    page: "Inventory",
    tone: "info",
  });
  return saved;
}
export async function listPurchases(): Promise<Purchase[]> {
  if (isDesktop()){const remote=await companyRpc<Purchase[]>("purchases.list");if(remote.remote)return remote.data??[];return invoke<Purchase[]>("list_purchases");}
  return JSON.parse(
    localStorage.getItem(purchaseStorageKey) ?? "[]",
  ) as Purchase[];
}
export async function recordPurchase(purchase: Purchase): Promise<Purchase> {
  let saved: Purchase;
  if (isDesktop()){const remote=await companyRpc<Purchase>("purchases.save",purchase);saved=remote.remote?remote.data!:await invoke<Purchase>("record_purchase", { purchase });}
  else {
    const purchases = await listPurchases();
    const inventory = await listInventory();
    saved = {
      ...purchase,
      id: crypto.randomUUID(),
      purchaseNumber: `PUR-${String(purchases.length + 1).padStart(5, "0")}`,
      total: purchase.items.reduce((sum, item) => sum + item.total, 0),
    };
    saved.amountPaid = Math.min(saved.total, Math.max(0, purchase.amountPaid ?? 0));
    saved.paymentStatus = saved.amountPaid === 0 ? "unpaid" : saved.amountPaid >= saved.total ? "paid" : "part-paid";
    for (const line of purchase.items) {
      const item = inventory.find((entry) => entry.id === line.inventoryItemId);
      if (item) {
        const oldValue=item.quantity*item.unitCost;
        item.quantity += line.quantity;
        item.unitCost = item.quantity>0?(oldValue+line.total)/item.quantity:line.unitCost;
      }
    }
    purchases.push(saved);
    localStorage.setItem(purchaseStorageKey, JSON.stringify(purchases));
    localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
    const expenses=JSON.parse(localStorage.getItem(expenseStorageKey)??"[]") as Expense[];expenses.push({id:crypto.randomUUID(),expenseNumber:`EXP-${String(expenses.length+1).padStart(5,"0")}`,purchaseId:saved.id,category:"Materials",payee:saved.supplierName||"Material supplier",description:`Material purchase ${saved.purchaseNumber}`,amount:saved.total,amountPaid:saved.amountPaid??0,dueDate:saved.dueDate??"",paymentStatus:saved.paymentStatus,expenseDate:saved.purchaseDate,paymentMethod:saved.paymentMethod,reference:saved.reference,notes:`Automatically recorded from purchasing  UGX ${(saved.amountPaid??0).toLocaleString("en-UG")} paid  UGX ${(saved.total-(saved.amountPaid??0)).toLocaleString("en-UG")} payable`});localStorage.setItem(expenseStorageKey,JSON.stringify(expenses));
  }
  notifyActivity({
    title: `${saved.purchaseNumber || "Purchase"} recorded`,
    detail: `Stock increased  UGX ${saved.total.toLocaleString("en-UG")} added to Expenses`,
    page: "Inventory",
    tone: "info",
  });
  return saved;
}
export async function recordSupplierPayment(payment: { purchaseId: string; amount: number; paymentMethod: string; reference: string }): Promise<void> {
  if (isDesktop()){const remote=await companyRpc<void>("purchases.payment",payment);if(!remote.remote)await invoke<void>("record_supplier_payment", { payment });}
  else {
    const purchases = await listPurchases();
    const purchase = purchases.find((entry) => entry.id === payment.purchaseId);
    if (!purchase) throw new Error("Supplier purchase could not be found");
    const remaining = purchase.total - (purchase.amountPaid ?? 0);
    if (payment.amount <= 0 || payment.amount > remaining) throw new Error(`Only UGX ${remaining.toLocaleString("en-UG")} remains on this supplier bill`);
    purchase.amountPaid = (purchase.amountPaid ?? 0) + payment.amount;
    purchase.paymentStatus = purchase.amountPaid >= purchase.total ? "paid" : "part-paid";
    purchase.paymentMethod = payment.paymentMethod;
    if (payment.reference) purchase.reference = payment.reference;
    localStorage.setItem(purchaseStorageKey, JSON.stringify(purchases));
    const expenses=JSON.parse(localStorage.getItem(expenseStorageKey)??"[]") as Expense[];const linked=expenses.find(expense=>expense.purchaseId===purchase.id);if(linked){linked.amountPaid=purchase.amountPaid;linked.paymentStatus=purchase.paymentStatus;linked.paymentMethod=payment.paymentMethod;if(payment.reference)linked.reference=payment.reference;localStorage.setItem(expenseStorageKey,JSON.stringify(expenses));}
  }
  notifyActivity({ title: "Supplier payment recorded", detail: `UGX ${payment.amount.toLocaleString("en-UG")} paid  supplier balance updated`, page: "Inventory", tone: "info" });
}
export async function consumeStock(usage: StockUsage): Promise<void> {
  const inventory = await listInventory();
  const namedItem = inventory.find(
    (entry) => entry.id === usage.inventoryItemId,
  );
  const consumed = usage.printedQuantity + usage.wasteQuantity;
  if (isDesktop()){const remote=await companyRpc<void>("stock.consume",usage);if(!remote.remote)await invoke<void>("consume_stock", { usage });}
  else {
    if (!namedItem || consumed > namedItem.quantity)
      throw new Error(
        `Only ${namedItem?.quantity ?? 0} units are currently available`,
      );
    namedItem.quantity -= consumed;
    namedItem.totalPrinted = (namedItem.totalPrinted ?? 0) + usage.printedQuantity;
    namedItem.totalWaste = (namedItem.totalWaste ?? 0) + usage.wasteQuantity;
    namedItem.totalRevenue = (namedItem.totalRevenue ?? 0) + usage.revenue;
    localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
  }
}
export async function hasUsers(): Promise<boolean> {
  if (isDesktop()){const remote=await companyRpc<boolean>("users.has");if(remote.remote)return remote.data??false;return invoke<boolean>("has_users");}
  return (
    (
      JSON.parse(localStorage.getItem(userStorageKey) ?? "[]") as Array<
        UserInput & { passwordHash: string }
      >
    ).length > 0
  );
}
async function browserHash(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
export async function createFirstOwner(input: UserInput): Promise<User> {
  if (isDesktop()) return invoke<User>("create_first_owner", { input });
  if (await hasUsers())
    throw new Error("The owner account has already been created");
  return browserSaveUser(input);
}
async function browserSaveUser(input: UserInput): Promise<User> {
  const stored = JSON.parse(
    localStorage.getItem(userStorageKey) ?? "[]",
  ) as Array<UserInput & { passwordHash: string }>;
  const id = input.id ?? crypto.randomUUID();
  const index = stored.findIndex((item) => item.id === id);
  const prior = index >= 0 ? stored[index] : undefined;
  const record = {
    ...input,
    id,
    password: "",
    passwordHash: input.password
      ? await browserHash(input.password)
      : (prior?.passwordHash ?? ""),
  };
  if (index >= 0) stored[index] = record;
  else stored.push(record);
  localStorage.setItem(userStorageKey, JSON.stringify(stored));
  const { password: _, passwordHash: __, ...user } = record;
  return user;
}
export async function login(username: string, password: string): Promise<User> {
  if (isDesktop()){const remote=await companyRpc<User>("login",{username,password});if(remote.remote){sessionStorage.setItem(sessionStorageKey,JSON.stringify(remote.data));return remote.data!}return invoke<User>("login", { username, password });}
  const users = JSON.parse(
    localStorage.getItem(userStorageKey) ?? "[]",
  ) as Array<UserInput & { passwordHash: string }>;
  const record = users.find(
    (item) => item.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (!record || record.passwordHash !== (await browserHash(password)))
    throw new Error("Incorrect username or password");
  if (!record.isActive) throw new Error("This account has been disabled");
  const { password: _, passwordHash: __, ...user } = record;
  sessionStorage.setItem(sessionStorageKey, JSON.stringify(user));
  return user;
}
export async function logout(): Promise<void> {
  if (isDesktop()){const status=await invoke<CompanyNetworkStatus>("get_company_network_status");if(status.mode==="client")await invoke<void>("clear_company_network_session");else await invoke<void>("logout");}
  sessionStorage.removeItem(sessionStorageKey);
}
export async function resetWorkspace(): Promise<void> {
  if (isDesktop()) {
    await invoke<void>("reset_workspace");
  } else {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("printmanager.")) localStorage.removeItem(key);
    }
    sessionStorage.removeItem(sessionStorageKey);
  }
}
export async function currentUser(): Promise<User | null> {
  if (isDesktop()){const status=await invoke<CompanyNetworkStatus>("get_company_network_status");if(status.mode!=="client")return invoke<User | null>("current_user");}
  const value = sessionStorage.getItem(sessionStorageKey);
  return value ? (JSON.parse(value) as User) : null;
}
export async function listUsers(): Promise<User[]> {
  if (isDesktop()){const remote=await companyRpc<User[]>("users.list");if(remote.remote)return remote.data??[];return invoke<User[]>("list_users");}
  const stored = JSON.parse(
    localStorage.getItem(userStorageKey) ?? "[]",
  ) as Array<UserInput & { passwordHash: string }>;
  return stored.map(({ password: _, passwordHash: __, ...user }) => user);
}
export async function saveUser(input: UserInput): Promise<User> {
  const wasEditing = !!input.id;
  const remote=isDesktop()?await companyRpc<User>("users.save",input):{remote:false};
  const saved = remote.remote?remote.data!:isDesktop()?await invoke<User>("save_user", { input }):await browserSaveUser(input);
  notifyActivity({
    title: `Employee ${wasEditing ? "updated" : "account created"}`,
    detail: `${saved.fullName}  ${saved.role}`,
    page: "Employees",
    tone: "info",
  });
  return saved;
}
export async function generateRecoveryCode(): Promise<string> {
  if (isDesktop()){const remote=await companyRpc<string>("recovery.generate");if(remote.remote)return remote.data!;return invoke<string>("generate_recovery_code");}
  const user = await currentUser();
  if (!user?.id || user.role !== "owner")
    throw new Error("Sign in as the owner first");
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const raw = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const code = `${raw.slice(0, 8)}-${raw.slice(8, 16)}`;
  const users = JSON.parse(
    localStorage.getItem(userStorageKey) ?? "[]",
  ) as Array<UserInput & { passwordHash: string; recoveryHash?: string }>;
  const owner = users.find((item) => item.id === user.id);
  if (!owner) throw new Error("Owner account was not found");
  owner.recoveryHash = await browserHash(code);
  localStorage.setItem(userStorageKey, JSON.stringify(users));
  return code;
}
export async function resetPasswordWithRecovery(
  username: string,
  recoveryCode: string,
  newPassword: string,
): Promise<void> {
  if (isDesktop()){const remote=await companyRpc<void>("password.reset",{username,recoveryCode,newPassword});if(remote.remote)return;return invoke<void>("reset_password_with_recovery", {username,recoveryCode,newPassword});}
  if (newPassword.length < 6)
    throw new Error("New password must contain at least 6 characters");
  const users = JSON.parse(
    localStorage.getItem(userStorageKey) ?? "[]",
  ) as Array<UserInput & { passwordHash: string; recoveryHash?: string }>;
  const owner = users.find(
    (item) =>
      item.role === "owner" &&
      item.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (
    !owner?.recoveryHash ||
    owner.recoveryHash !==
      (await browserHash(recoveryCode.trim().toUpperCase()))
  )
    throw new Error("Owner account or recovery code is incorrect");
  owner.passwordHash = await browserHash(newPassword);
  localStorage.setItem(userStorageKey, JSON.stringify(users));
}
export async function ownerCreateAccount(
  ownerUsername: string,
  ownerPassword: string,
  input: UserInput,
): Promise<User> {
  if (isDesktop()){const remote=await companyRpc<User>("account.owner_create",{ownerUsername,ownerPassword,input});if(remote.remote)return remote.data!;return invoke<User>("owner_create_account", {ownerUsername,ownerPassword,input});}
  const users = JSON.parse(
    localStorage.getItem(userStorageKey) ?? "[]",
  ) as Array<UserInput & { passwordHash: string }>;
  const owner = users.find(
    (item) =>
      item.role === "owner" &&
      item.username.toLowerCase() === ownerUsername.trim().toLowerCase(),
  );
  if (!owner || owner.passwordHash !== (await browserHash(ownerPassword)))
    throw new Error("Owner username or password is incorrect");
  return browserSaveUser({
    ...input,
    role: input.role === "owner" ? "manager" : input.role,
  });
}
