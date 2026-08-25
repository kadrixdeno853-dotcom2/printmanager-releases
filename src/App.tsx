import { useEffect, useMemo, useRef, useState } from "react";
import "./delete.css";
import "./material-tracking.css";
import "./advanced-pricing.css";
import "./job-pricing.css";
import "./notification-history.css";
import "./company-branding.css";
import "./printmanager-mark.css";
import "./print-fidelity.css";
import "./logo-sizing.css";
import "./synced-recovery.css";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Cloud,
  FileText,
  Gauge,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  BrainCircuit,
  CircleAlert,
  WifiOff,
  X,
} from "lucide-react";
import SetupWizard from "./SetupWizard";
import CustomersPage from "./CustomersPage";
import ProductsPage from "./ProductsPage";
import QuotationsPage from "./QuotationsPage";
import JobsPage from "./JobsPage";
import SalesPage from "./SalesPage";
import DashboardPage from "./DashboardPage";
import AccountingAssistantPage from "./AccountingAssistantPage";
import ExpensesPage from "./ExpensesPage";
import ReportsPage from "./ReportsPage";
import InventoryPage from "./InventoryPage";
import EmployeesPage from "./EmployeesPage";
import BackupPage from "./BackupPage";
import SettingsPage from "./SettingsPage";
import UpdateManager from "./UpdateManager";
import CustomerProfileDrawer from "./CustomerProfileDrawer";
import CompanyLogo, { saveCompanyLogo } from "./CompanyLogo";
import { ActivityNotice, recentActivities } from "./lib/activity";
import { scheduleSyncedBackup } from "./lib/syncedBackup";
import { checkDailyReport } from "./lib/dailyReport";
import { LoginScreen, OwnerSetup } from "./AuthScreens";
import {
  BusinessProfile,
  Customer,
  InventoryItem,
  Invoice,
  Job,
  User,
  currentUser,
  getBusinessProfile,
  hasUsers,
  listCustomers,
  listInventory,
  listInvoices,
  listJobs,
  listProducts,
  createLocalBackup,
  logout,
} from "./lib/desktop";

type GlobalSearchResult = {
  title: string;
  detail: string;
  page: string;
  icon: typeof Search;
  customer?: Customer;
};
type LiveNotification = {
  id: string;
  title: string;
  detail: string;
  page: string;
  tone: "warning" | "danger" | "info";
};

async function createDailySafetyBackup() {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem("printmanager.daily-backup") === today) return;
  try {
    await createLocalBackup();
    localStorage.setItem("printmanager.daily-backup", today);
  } catch {
    // Backups remain available manually if the local copy cannot be created.
  }
}

const money = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Accounting Assistant", icon: BrainCircuit },
  { label: "Jobs", icon: BriefcaseBusiness },
  { label: "Production", icon: Gauge },
  { label: "Customers", icon: Users },
  { label: "Quotations", icon: FileText },
  { label: "Invoices", icon: ShoppingCart },
  { label: "Products", icon: PackagePlus },
  { label: "Expenses", icon: WalletCards },
  { label: "Reports", icon: ReceiptText },
  { label: "Inventory", icon: Boxes },
  { label: "Employees", icon: Users },
  { label: "Backup", icon: Cloud },
  { label: "Settings", icon: Settings },
];

const accessByRole: Record<string, string[]> = {
  owner: navItems.map((item) => item.label),
  manager: navItems.map((item) => item.label),
  accountant: ["Dashboard", "Accounting Assistant", "Invoices", "Customers", "Expenses", "Reports"],
  sales: ["Dashboard", "Invoices", "Jobs", "Customers", "Quotations", "Products"],
  designer: [
    "Dashboard",
    "Jobs",
    "Production",
    "Customers",
    "Quotations",
    "Products",
  ],
  operator: ["Jobs", "Production", "Inventory"],
  quality: ["Dashboard", "Jobs", "Production"],
  storekeeper: ["Dashboard", "Jobs", "Expenses", "Inventory"],
  delivery: ["Dashboard", "Jobs", "Production", "Customers"],
  cashier: ["Dashboard", "Invoices", "Customers", "Quotations"],
};

const jobs = [
  {
    id: "JOB-0241",
    name: "Outdoor banner",
    customer: "Kampala Hardware Ltd",
    stage: "Printing",
    due: "Today, 4:00 PM",
    value: 480000,
    tone: "amber",
  },
  {
    id: "JOB-0240",
    name: "Company brochures",
    customer: "Asante Tours",
    stage: "Design approval",
    due: "Tomorrow",
    value: 920000,
    tone: "violet",
  },
  {
    id: "JOB-0238",
    name: "Shopfront signage",
    customer: "Mirembe Pharmacy",
    stage: "Finishing",
    due: "19 Aug",
    value: 1350000,
    tone: "blue",
  },
  {
    id: "JOB-0237",
    name: "Business cards",
    customer: "Joel Kato",
    stage: "Ready for collection",
    due: "Today",
    value: 125000,
    tone: "green",
  },
];

const stages = [
  { title: "New orders", count: 4, color: "#4b73e8" },
  { title: "Designing", count: 3, color: "#8b5bd1" },
  { title: "Printing", count: 2, color: "#e59b36" },
  { title: "Finishing", count: 2, color: "#21a0a0" },
  { title: "Ready", count: 5, color: "#3c9a66" },
];

function App() {
  const [profile, setProfile] = useState<BusinessProfile | null | undefined>(
    undefined,
  );
  const [usersExist, setUsersExist] = useState<boolean | undefined>(undefined);
  const [signedInUser, setSignedInUser] = useState<User | null | undefined>(
    undefined,
  );
  const [active, setActive] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [activityNotifications, setActivityNotifications] =
    useState<ActivityNotice[]>(recentActivities);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >(() => {
    try {
      return JSON.parse(
        localStorage.getItem("printmanager.dismissed-notifications") || "[]",
      );
    } catch {
      return [];
    }
  });
  const [toastNotifications, setToastNotifications] = useState<
    LiveNotification[]
  >([]);
  const notificationSnapshot = useRef<{
    invoices: Invoice[];
    jobs: Job[];
    inventory: InventoryItem[];
  } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [newJobRequest, setNewJobRequest] = useState(0);
  const [newJobCustomerId, setNewJobCustomerId] = useState<
    string | undefined
  >();
  const [showNotice, setShowNotice] = useState(true);
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat("en-UG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    void Promise.all([getBusinessProfile(), hasUsers(), currentUser()])
      .then(([business, exists, user]) => {
        if (business?.logoData) saveCompanyLogo(business.logoData);
        setProfile(business);
        setUsersExist(exists);
        setSignedInUser(user);
      })
      .catch(() => {
        setProfile(null);
        setUsersExist(false);
        setSignedInUser(null);
      });
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2 || !signedInUser) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void Promise.all([
        listCustomers(query),
        listJobs(query),
        listProducts(query),
        listInvoices(),
      ])
        .then(([customers, jobs, products, invoices]) => {
          if (cancelled) return;
          const needle = query.toLowerCase();
          const allowed = accessByRole[signedInUser.role] ?? [];
          const results: GlobalSearchResult[] = [
            ...customers.map((item) => ({
              title: item.name,
              detail: item.company || item.phone || "Customer",
              page: "Customers",
              icon: Users,
              customer: item,
            })),
            ...jobs.map((item) => ({
              title: item.jobNumber || item.title,
              detail: `${item.customerName || "Walk-in customer"} Â· ${item.title}`,
              page: "Jobs",
              icon: BriefcaseBusiness,
            })),
            ...invoices
              .filter((item) =>
                [item.invoiceNumber, item.customerName].some((value) =>
                  value?.toLowerCase().includes(needle),
                ),
              )
              .map((item) => ({
                title: item.invoiceNumber || "Invoice",
                detail: `${item.customerName || "Walk-in customer"} Â· UGX ${item.total.toLocaleString("en-UG")}`,
                page: "Sales",
                icon: ReceiptText,
              })),
            ...products.map((item) => ({
              title: item.name,
              detail: item.category || "Product or service",
              page: "Products",
              icon: PackagePlus,
            })),
          ]
            .filter((item) => allowed.includes(item.page))
            .slice(0, 8);
          setSearchResults(results);
          setSearching(false);
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
            setSearching(false);
          }
        });
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, signedInUser]);

  useEffect(() => {
    if (!signedInUser) return;
    let cancelled = false;
    const showToast = (notice: LiveNotification) => {
      setToastNotifications((current) =>
        [...current.filter((item) => item.id !== notice.id), notice].slice(-4),
      );
      window.setTimeout(
        () =>
          setToastNotifications((current) =>
            current.filter((item) => item.id !== notice.id),
          ),
        6500,
      );
    };
    const refreshNotifications = async () => {
      void createDailySafetyBackup();
      void checkDailyReport().catch((error) => { localStorage.setItem("printmanager.daily-report-error", String(error)); });
      try {
        const [invoices, liveJobs, inventory] = await Promise.all([
          listInvoices().catch(() => [] as Invoice[]),
          listJobs("").catch(() => [] as Job[]),
          listInventory().catch(() => [] as InventoryItem[]),
        ]);
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const next: LiveNotification[] = [];
        invoices
          .filter((invoice) => invoice.balance > 0)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
          .slice(0, 8)
          .forEach((invoice) =>
            next.push({
              id: `payment-${invoice.id}`,
              title: `${invoice.invoiceNumber || "Invoice"} payment not received`,
              detail: `${invoice.customerName || "Walk-in customer"} owes UGX ${invoice.balance.toLocaleString("en-UG")} Â· ${invoice.dueDate < today ? `Overdue since ${invoice.dueDate}` : `Due ${invoice.dueDate}`}`,
              page: "Sales",
              tone: invoice.dueDate < today ? "danger" : "warning",
            }),
          );
        liveJobs
          .filter(
            (job) =>
              job.status !== "delivered" &&
              !!job.deadline &&
              job.deadline <= today,
          )
          .slice(0, 5)
          .forEach((job) =>
            next.push({
              id: `job-${job.id}`,
              title: `${job.jobNumber || "Print job"} ${job.deadline! < today ? "is overdue" : "is due today"}`,
              detail: `${job.customerName || "Walk-in customer"} Â· ${job.title}`,
              page: "Jobs",
              tone: job.deadline! < today ? "danger" : "warning",
            }),
          );
        inventory
          .filter((item) => item.isActive && item.quantity <= item.reorderLevel)
          .slice(0, 5)
          .forEach((item) =>
            next.push({
              id: `stock-${item.id}`,
              title: `${item.name} is running low`,
              detail: `${item.quantity} ${item.unit} remaining Â· Reorder level ${item.reorderLevel}`,
              page: "Inventory",
              tone: "warning",
            }),
          );
        const allowed = accessByRole[signedInUser.role] ?? [];
        setNotifications(next.filter((item) => allowed.includes(item.page)));

        const previous = notificationSnapshot.current;
        if (!previous) {
          next
            .filter(
              (item) => item.tone === "danger" && allowed.includes(item.page),
            )
            .slice(0, 2)
            .forEach(showToast);
        } else {
          invoices.forEach((invoice) => {
            const before = previous.invoices.find(
              (item) => item.id === invoice.id,
            );
            if (before && invoice.amountPaid > before.amountPaid)
              showToast({
                id: `paid-${invoice.id}-${invoice.amountPaid}`,
                title: `Payment received for ${invoice.invoiceNumber}`,
                detail: `UGX ${(invoice.amountPaid - before.amountPaid).toLocaleString("en-UG")} was recorded from ${invoice.customerName || "the customer"}.`,
                page: "Sales",
                tone: "info",
              });
            else if (!before)
              showToast({
                id: `invoice-new-${invoice.id}`,
                title: `${invoice.invoiceNumber || "New invoice"} created`,
                detail: `${invoice.customerName || "Walk-in customer"} Â· UGX ${invoice.total.toLocaleString("en-UG")}`,
                page: "Sales",
                tone: "info",
              });
          });
          liveJobs.forEach((job) => {
            const before = previous.jobs.find((item) => item.id === job.id);
            if (before && before.status !== job.status)
              showToast({
                id: `job-update-${job.id}-${job.status}`,
                title: `${job.jobNumber || "Print job"} was updated`,
                detail: `${job.title} moved to ${job.status.replaceAll("_", " ")}.`,
                page: "Jobs",
                tone: "info",
              });
            else if (!before)
              showToast({
                id: `job-new-${job.id}`,
                title: `${job.jobNumber || "New print job"} created`,
                detail: `${job.customerName || "Walk-in customer"} Â· ${job.title}`,
                page: "Jobs",
                tone: "info",
              });
          });
          inventory.forEach((item) => {
            const before = previous.inventory.find(
              (entry) => entry.id === item.id,
            );
            if (
              before &&
              before.quantity > before.reorderLevel &&
              item.quantity <= item.reorderLevel
            )
              showToast({
                id: `stock-low-${item.id}`,
                title: `${item.name} reached low stock`,
                detail: `${item.quantity} ${item.unit} remaining. Reorder soon.`,
                page: "Inventory",
                tone: "warning",
              });
          });
        }
        notificationSnapshot.current = { invoices, jobs: liveJobs, inventory };
      } catch {
        /* Retain the last known state while offline. */
      }
    };
    const handleDataChange = (event: Event) => {
      const notice = (event as CustomEvent<LiveNotification>).detail;
      if (
        notice?.id &&
        accessByRole[signedInUser.role]?.includes(notice.page)
      ) {
        showToast(notice);
        setActivityNotifications((current) => [notice as ActivityNotice, ...current.filter((item) => item.id !== notice.id)]);
      }
      void refreshNotifications();
      scheduleSyncedBackup();
    };
    void refreshNotifications();
    const interval = window.setInterval(
      () => void refreshNotifications(),
      15000,
    );
    window.addEventListener("focus", refreshNotifications);
    window.addEventListener("printmanager:data-changed", handleDataChange);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", refreshNotifications);
      window.removeEventListener("printmanager:data-changed", handleDataChange);
    };
  }, [signedInUser]);

  useEffect(() => {
    const closeOpenMenus = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".new-wrap")) setShowNewMenu(false);
      if (!target.closest(".sidebar-bottom")) setShowAccountMenu(false);
      if (!target.closest(".notification-wrap")) setShowNotifications(false);
      if (!target.closest(".search-wrap")) setSearchQuery("");
    };
    document.addEventListener("mousedown", closeOpenMenus);
    return () => document.removeEventListener("mousedown", closeOpenMenus);
  }, []);

  if (
    profile === undefined ||
    usersExist === undefined ||
    signedInUser === undefined
  )
    return (
      <div className="app-loading">
        <CompanyLogo className="brand-mark" />
        <p>Opening your workspaceâ€¦</p>
      </div>
    );
  if (profile === null && usersExist)
    return <LoginScreen business={{...({businessName:"PrintManager"} as BusinessProfile)} as BusinessProfile} onLogin={async user=>{setSignedInUser(user);const restored=await getBusinessProfile();if(restored)setProfile(restored);}} onReset={()=>setSignedInUser(null)} />;
  if (profile === null)
    return (
      <SetupWizard
        onComplete={(business) => {
          setProfile(business);
          setUsersExist(false);
          setSignedInUser(null);
        }}
      />
    );
  if (!usersExist)
    return (
      <OwnerSetup
        profile={profile}
        onComplete={(user) => {
          setUsersExist(true);
          setSignedInUser(user);
        }}
      />
    );
  if (!signedInUser)
    return (
      <LoginScreen
        business={profile}
        onLogin={(user) => {
          setSignedInUser(user);
          setActive("Dashboard");
        }}
        onReset={() => {
          setProfile(null);
          setUsersExist(false);
          setSignedInUser(null);
          setActive("Dashboard");
        }}
      />
    );

  const firstName = signedInUser.fullName.split(" ")[0] || "there";
  const initials =
    signedInUser.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join("")
      .toUpperCase() || "PM";
  const allowedPages = accessByRole[signedInUser.role] ?? ["Dashboard"];
  const displayedNotifications = [
    ...activityNotifications,
    ...notifications,
  ].filter(
    (item, index, list) =>
      !dismissedNotifications.includes(item.id) &&
      list.findIndex((entry) => entry.id === item.id) === index,
  );
  const deleteNotification = (id: string) => {
    const dismissed = [
      id,
      ...dismissedNotifications.filter((item) => item !== id),
    ];
    setDismissedNotifications(dismissed);
    localStorage.setItem(
      "printmanager.dismissed-notifications",
      JSON.stringify(dismissed),
    );
    const activities = activityNotifications.filter((item) => item.id !== id);
    setActivityNotifications(activities);
    localStorage.setItem(
      "printmanager.recent-notifications",
      JSON.stringify(activities),
    );
    setToastNotifications((current) =>
      current.filter((item) => item.id !== id),
    );
  };
  const openPage = (page: string) => {
    setActive(page);
    setShowNewMenu(false);
    setShowAccountMenu(false);
    setSidebarOpen(false);
    setSearchQuery("");
    setShowNotifications(false);
  };
  const reportIssue = () => {
    setShowAccountMenu(false);
    setShowReportPrompt(true);
  };
  const continueReport = () => {
    setShowReportPrompt(false);
    window.open("https://kadrixdeno853-dotcom2.github.io/printmanager-releases/", "_blank", "noopener,noreferrer");
  };
  const signOut = () =>
    void logout().then(() => {
      setSignedInUser(null);
      setActive("Dashboard");
    });
  const newActions = [
    {
      label: "New sale",
      detail: "Create an invoice",
      page: "Sales",
      icon: ShoppingCart,
    },
    {
      label: "New print job",
      detail: "Start production work",
      page: "Jobs",
      icon: BriefcaseBusiness,
    },
    {
      label: "New quotation",
      detail: "Prepare an estimate",
      page: "Quotations",
      icon: FileText,
    },
    {
      label: "New customer",
      detail: "Add a customer record",
      page: "Customers",
      icon: Users,
    },
  ].filter((item) => allowedPages.includes(item.page));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <CompanyLogo className="brand-mark" />
          <div>
            <strong>{profile.businessName}</strong>
            <small>Printing company workspace</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          <p className="nav-heading">WORKSPACE</p>
          {navItems
            .filter((item) => allowedPages.includes(item.label))
            .map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={active === label ? "active" : ""}
                onClick={() => {
                  setActive(label);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
        </nav>

        <div className="sidebar-bottom">
          {showAccountMenu && (
            <div className="account-menu">
              <div className="account-menu-head">
                <span className="avatar">{initials}</span>
                <div>
                  <strong>{signedInUser.fullName}</strong>
                  <small>Signed in as {signedInUser.role}</small>
                </div>
              </div>
              {allowedPages.includes("Settings") && (
                <button onClick={() => openPage("Settings")}>
                  <Settings size={16} />
                  <span>
                    <strong>Workspace settings</strong>
                    <small>Business and preferences</small>
                  </span>
                </button>
              )}
              {allowedPages.includes("Employees") && (
                <button onClick={() => openPage("Employees")}>
                  <UserRound size={16} />
                  <span>
                    <strong>Account management</strong>
                    <small>Users, roles and access</small>
                  </span>
                </button>
              )}
              <button className="account-report" onClick={reportIssue}>
                <CircleAlert size={16} />
                <span>
                  <strong>Report an issue</strong>
                  <small>Copy errors and contact support</small>
                </span>
              </button>
              <button className="account-signout" onClick={signOut}>
                <LogOut size={16} />
                <span>
                  <strong>Sign out</strong>
                  <small>End this secure session</small>
                </span>
              </button>
            </div>
          )}
          <button
            className={`user-card ${showAccountMenu ? "open" : ""}`}
            onClick={() => setShowAccountMenu((value) => !value)}
            aria-expanded={showAccountMenu}
          >
            <div className="avatar">{initials}</div>
            <div>
              <strong>{signedInUser.fullName}</strong>
              <small>
                {signedInUser.role.replace(/^./, (letter) =>
                  letter.toUpperCase(),
                )}
              </small>
            </div>
            <ChevronDown className="account-chevron" size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="search-wrap">
            <div className={`global-search ${searchQuery ? "active" : ""}`}>
              <Search size={18} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search jobs, customers, invoicesâ€¦"
                aria-label="Search workspace"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>Ctrl K</kbd>
              )}
            </div>
            {searchQuery.trim().length >= 2 && (
              <div className="search-results">
                <header>
                  <strong>Search results</strong>
                  <small>
                    {searching ? "Searchingâ€¦" : `${searchResults.length} found`}
                  </small>
                </header>
                {!searching && searchResults.length === 0 ? (
                  <div className="search-empty">
                    <Search />
                    No matching records
                  </div>
                ) : (
                  searchResults.map((result, index) => {
                    const ResultIcon = result.icon;
                    return (
                      <button
                        key={`${result.page}-${result.title}-${index}`}
                        onClick={() => {
                          if (result.customer) {
                            setSelectedCustomer(result.customer);
                            setSearchQuery("");
                          } else openPage(result.page);
                        }}
                      >
                        <span>
                          <ResultIcon />
                        </span>
                        <div>
                          <strong>{result.title}</strong>
                          <small>{result.detail}</small>
                        </div>
                        <em>
                          {result.customer ? "View profile" : result.page}
                        </em>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="top-actions">
            <div className="connection">
              <WifiOff size={16} />
              <span>Offline â€¢ Working normally</span>
            </div>
            <div className="notification-wrap">
              <button
                className={`icon-button ${showNotifications ? "active" : ""}`}
                onClick={() => setShowNotifications((value) => !value)}
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell size={20} />
                {displayedNotifications.length > 0 && <i />}
              </button>
              {showNotifications && (
                <div
                  className="notification-backdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget)
                      setShowNotifications(false);
                  }}
                >
                  <section
                    className="notification-menu compact-notifications"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Notifications"
                  >
                    <header>
                      <div>
                        <span className="notification-title-icon">
                          <Bell />
                        </span>
                        <div>
                          <strong>Notifications</strong>
                          <small>Saved business activity and reminders</small>
                        </div>
                      </div>
                      <div className="notification-header-actions">
                        <button
                          onClick={() => setShowNotifications(false)}
                          aria-label="Close notifications"
                        >
                          <X />
                        </button>
                      </div>
                    </header>
                    <div className="notification-summary">
                      <span className="notification-total">{displayedNotifications.length}</span>
                      <div><strong>Business activity</strong><p>Notifications remain here until you delete them.</p></div>
                    </div>
                    <div className="notification-list">
                      {displayedNotifications.length === 0 ? (
                        <div className="notification-empty">
                          <span>
                            <Check />
                          </span>
                          <strong>You're all caught up</strong>
                          <small>
                            There are no saved notifications.
                          </small>
                        </div>
                      ) : (
                        displayedNotifications.map((item, index) => (
                          <article className="notification-entry" key={`${item.id}-${index}`}>
                            <button className="notification-open" onClick={() => openPage(item.page)}><i className={item.tone} /><div><strong>{item.title}</strong><small>{item.detail}</small><em>Open {item.page}</em></div><ArrowRight /></button>
                            <button className="notification-delete" onClick={() => deleteNotification(item.id)} aria-label={`Delete ${item.title}`}><Trash2 /></button>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
            <div className="new-wrap">
              <button
                className="primary-button"
                onClick={() => setShowNewMenu(!showNewMenu)}
              >
                <Plus size={18} /> New <ChevronDown size={15} />
              </button>
              {showNewMenu && (
                <div className="new-menu">
                  <div className="new-menu-head">
                    <strong>Create new</strong>
                    <small>Choose what you want to add</small>
                  </div>
                  {newActions.map(({ label, detail, page, icon: Icon }) => (
                    <button key={page} onClick={() => openPage(page)}>
                      <span>
                        <Icon size={17} />
                      </span>
                      <div>
                        <strong>{label}</strong>
                        <small>{detail}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {active === "Dashboard" ? (
            <DashboardPage
              profile={profile}
              userName={signedInUser.fullName}
              onNavigate={setActive}
            />
          ) : active === "Accounting Assistant" ? (
            <AccountingAssistantPage />
          ) : active === "Customers" ? (
            <CustomersPage />
          ) : active === "Products" ? (
            <ProductsPage />
          ) : active === "Quotations" ? (
            <QuotationsPage />
          ) : active === "Jobs" ? (
            <JobsPage
              createRequest={newJobRequest}
              initialCustomerId={newJobCustomerId}
            />
          ) : active === "Production" ? (
            <JobsPage board />
          ) : active === "Invoices" || active === "Sales" ? (
            <SalesPage />
          ) : active === "Expenses" ? (
            <ExpensesPage />
          ) : active === "Reports" ? (
            <ReportsPage />
          ) : active === "Inventory" ? (
            <InventoryPage />
          ) : active === "Employees" ? (
            <EmployeesPage />
          ) : active === "Backup" ? (
            <BackupPage />
          ) : active === "Settings" ? (
            <SettingsPage profile={profile} onSaved={setProfile} />
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">{date}</p>
                  <h1>Good morning, {firstName}.</h1>
                  <p>
                    Hereâ€™s what is happening at {profile.businessName} today.
                  </p>
                </div>
                <button className="secondary-button">
                  <ReceiptText size={18} /> View reports
                </button>
              </section>

              {showNotice && (
                <section className="backup-notice">
                  <div className="backup-icon">
                    <Cloud size={20} />
                  </div>
                  <div>
                    <strong>Online backup waiting for internet</strong>
                    <p>
                      Your work is safe on this computer. Weâ€™ll upload todayâ€™s
                      backup automatically when you reconnect.
                    </p>
                  </div>
                  <div className="local-safe">
                    <HardDrive size={16} />
                    <span>Local backup: 8:42 AM</span>
                    <Check size={15} />
                  </div>
                  <button
                    onClick={() => setShowNotice(false)}
                    aria-label="Dismiss"
                  >
                    <X size={18} />
                  </button>
                </section>
              )}

              <section className="metrics-grid">
                <Metric
                  title="Sales today"
                  value={money.format(2845000)}
                  change="12.5%"
                  positive
                  icon={CircleDollarSign}
                />
                <Metric
                  title="Expenses today"
                  value={money.format(640000)}
                  change="8.2%"
                  icon={ArrowDownRight}
                />
                <Metric
                  title="Estimated profit"
                  value={money.format(2205000)}
                  change="18.4%"
                  positive
                  icon={ArrowUpRight}
                />
                <Metric
                  title="Customers owe"
                  value={money.format(8450000)}
                  note="Across 14 invoices"
                  icon={WalletCards}
                  warning
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel jobs-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Active print jobs</h2>
                      <p>Prioritized by upcoming deadline</p>
                    </div>
                    <button>
                      View all <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="job-table">
                    <div className="table-row table-labels">
                      <span>JOB</span>
                      <span>CUSTOMER</span>
                      <span>STATUS</span>
                      <span>DUE</span>
                      <span>VALUE</span>
                    </div>
                    {jobs.map((job) => (
                      <div className="table-row" key={job.id}>
                        <span className="job-name">
                          <strong>{job.id}</strong>
                          <small>{job.name}</small>
                        </span>
                        <span>{job.customer}</span>
                        <span>
                          <i className={`status-dot ${job.tone}`} />
                          {job.stage}
                        </span>
                        <span
                          className={job.due.includes("Today") ? "due" : ""}
                        >
                          {job.due}
                        </span>
                        <strong>{money.format(job.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel overview-panel">
                  <div className="panel-head">
                    <div>
                      <h2>This month</h2>
                      <p>August performance</p>
                    </div>
                    <button>
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <div className="month-total">
                    <span>Total sales</span>
                    <strong>{money.format(18450000)}</strong>
                    <small>
                      <ArrowUpRight size={14} /> 8.3% from last month
                    </small>
                  </div>
                  <div className="chart" aria-label="Monthly sales chart">
                    {[38, 54, 42, 72, 62, 83, 68, 92, 76, 87, 64, 96].map(
                      (height, index) => (
                        <i key={index} style={{ height: `${height}%` }} />
                      ),
                    )}
                  </div>
                  <div className="chart-labels">
                    <span>1 Aug</span>
                    <span>Today</span>
                  </div>
                  <div className="finance-summary">
                    <div>
                      <i className="income" />
                      <span>Expenses</span>
                      <strong>{money.format(6820000)}</strong>
                    </div>
                    <div>
                      <i className="profit" />
                      <span>Est. profit</span>
                      <strong>{money.format(11630000)}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel production-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Production flow</h2>
                      <p>16 jobs across the workshop</p>
                    </div>
                    <button>
                      Open board <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="stage-list">
                    {stages.map((stage) => (
                      <div key={stage.title}>
                        <span style={{ background: stage.color }}>
                          {stage.count}
                        </span>
                        <strong>{stage.title}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel attention-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Needs attention</h2>
                      <p>Items that may affect todayâ€™s work</p>
                    </div>
                  </div>
                  <div className="attention-item orange">
                    <PackagePlus size={19} />
                    <div>
                      <strong>3 materials are running low</strong>
                      <span>Vinyl, A3 gloss and cyan ink</span>
                    </div>
                    <ArrowRight size={17} />
                  </div>
                  <div className="attention-item red">
                    <CalendarDays size={19} />
                    <div>
                      <strong>2 jobs are due today</strong>
                      <span>One job is still in production</span>
                    </div>
                    <ArrowRight size={17} />
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}
      {selectedCustomer && (
        <CustomerProfileDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onNewOrder={() => {
            setNewJobCustomerId(selectedCustomer.id ?? undefined);
            setNewJobRequest((value) => value + 1);
            setSelectedCustomer(null);
            openPage("Jobs");
          }}
        />
      )}
      <div className="toast-stack" aria-live="polite">
        {toastNotifications.map((notice) => (
          <article className={`live-toast ${notice.tone}`} key={notice.id}>
            <button
              className="toast-content"
              onClick={() => openPage(notice.page)}
            >
              <span>
                <Bell />
              </span>
              <div>
                <strong>{notice.title}</strong>
                <p>{notice.detail}</p>
                <small>Click to open {notice.page}</small>
              </div>
            </button>
            <button
              className="toast-close"
              onClick={() =>
                setToastNotifications((current) =>
                  current.filter((item) => item.id !== notice.id),
                )
              }
              aria-label="Dismiss notification"
            >
              <X />
            </button>
          </article>
        ))}
      </div>
      {showReportPrompt && (
        <div className="report-prompt-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-prompt-title">
          <section className="report-prompt">
            <div className="report-prompt-icon"><CircleAlert size={22} /></div>
            <p className="eyebrow">PRINTMANAGER ADMIN</p>
            <h2 id="report-prompt-title">Before you report an issue</h2>
            <p>If an error is displayed, copy the exact error message and include what you were doing when it happened. This helps our team resolve it faster.</p>
            <div className="report-prompt-actions"><button className="secondary-button" onClick={() => setShowReportPrompt(false)}>Cancel</button><button className="primary-button" onClick={continueReport}>Open support page</button></div>
          </section>
        </div>
      )}
      <UpdateManager />
    </div>
  );
}

type MetricProps = {
  title: string;
  value: string;
  change?: string;
  note?: string;
  positive?: boolean;
  warning?: boolean;
  icon: typeof CircleDollarSign;
};

function Metric({
  title,
  value,
  change,
  note,
  positive,
  warning,
  icon: Icon,
}: MetricProps) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${warning ? "warning" : ""}`}>
        <Icon size={20} />
      </div>
      <div className="metric-title">{title}</div>
      <strong>{value}</strong>
      {change && (
        <small className={positive ? "positive" : "neutral"}>
          {positive ? <ArrowUpRight size={13} /> : null}
          {change} <span>vs yesterday</span>
        </small>
      )}
      {note && <small className="metric-note">{note}</small>}
    </article>
  );
}

export default App;



