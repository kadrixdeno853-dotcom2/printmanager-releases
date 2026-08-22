CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);

CREATE TABLE IF NOT EXISTS business_profile (
    id TEXT PRIMARY KEY NOT NULL,
    business_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    tin TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'UGX',
    owner_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    tin TEXT NOT NULL DEFAULT '',
    credit_limit INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT 'piece',
    pricing_method TEXT NOT NULL DEFAULT 'fixed',
    selling_price INTEGER NOT NULL DEFAULT 0,
    estimated_cost INTEGER NOT NULL DEFAULT 0,
    minimum_charge INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY NOT NULL,
    quotation_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'draft',
    issue_date TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    tax INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    terms TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY NOT NULL,
    quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    width REAL,
    height REAL,
    unit TEXT NOT NULL DEFAULT 'piece',
    unit_price INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id),
    job_id TEXT REFERENCES jobs(id),
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid',
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    tax INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY NOT NULL,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    invoice_id TEXT NOT NULL REFERENCES invoices(id),
    amount INTEGER NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    paid_at TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    reversed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    expense_number TEXT NOT NULL UNIQUE,
    job_id TEXT REFERENCES jobs(id),
    category TEXT NOT NULL,
    payee TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    expense_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    tin TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    reorder_level REAL NOT NULL DEFAULT 0,
    unit_cost INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY NOT NULL,
    purchase_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT REFERENCES suppliers(id),
    purchase_date TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    payment_method TEXT NOT NULL DEFAULT 'cash',
    reference TEXT NOT NULL DEFAULT '',
    total INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY NOT NULL,
    purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
    quantity REAL NOT NULL CHECK(quantity > 0),
    unit_cost INTEGER NOT NULL CHECK(unit_cost >= 0),
    total INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY NOT NULL,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
    job_id TEXT REFERENCES jobs(id),
    purchase_id TEXT REFERENCES purchases(id),
    movement_type TEXT NOT NULL,
    quantity_delta REAL NOT NULL,
    unit_cost INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    recovery_hash TEXT,
    role TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY NOT NULL,
    job_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new_order',
    priority TEXT NOT NULL DEFAULT 'normal',
    deadline TEXT,
    delivery_date TEXT,
    assigned_to TEXT NOT NULL DEFAULT '',
    machine_name TEXT NOT NULL DEFAULT '',
    artwork_status TEXT NOT NULL DEFAULT 'not_received',
    delivery_method TEXT NOT NULL DEFAULT 'collection',
    delivery_address TEXT NOT NULL DEFAULT '',
    delivery_notes TEXT NOT NULL DEFAULT '',
    total_amount INTEGER NOT NULL DEFAULT 0,
    deposit_amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    machine_type TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'available',
    notes TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_items (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    work_type TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    width REAL,
    height REAL,
    unit TEXT NOT NULL DEFAULT 'm',
    quantity REAL NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    inventory_item_id TEXT REFERENCES inventory_items(id),
    material_used REAL NOT NULL DEFAULT 0,
    material_waste REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_stock_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_job ON stock_movements(job_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_machines_name ON machines(name);
CREATE TRIGGER IF NOT EXISTS audit_customers_insert AFTER INSERT ON customers BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'created','customer',NEW.id,NEW.name); END;
CREATE TRIGGER IF NOT EXISTS audit_customers_update AFTER UPDATE ON customers BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'updated','customer',NEW.id,NEW.name); END;
CREATE TRIGGER IF NOT EXISTS audit_jobs_insert AFTER INSERT ON jobs BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'created','job',NEW.id,NEW.job_number||' • '||NEW.title); END;
CREATE TRIGGER IF NOT EXISTS audit_jobs_update AFTER UPDATE ON jobs BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'updated','job',NEW.id,NEW.job_number||' • '||NEW.title); END;
CREATE TRIGGER IF NOT EXISTS audit_invoices_insert AFTER INSERT ON invoices BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'created','invoice',NEW.id,NEW.invoice_number); END;
CREATE TRIGGER IF NOT EXISTS audit_payments_insert AFTER INSERT ON payments BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'payment recorded','payment',NEW.id,NEW.receipt_number); END;
CREATE TRIGGER IF NOT EXISTS audit_expenses_insert AFTER INSERT ON expenses BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'created','expense',NEW.id,NEW.expense_number); END;
CREATE TRIGGER IF NOT EXISTS audit_users_insert AFTER INSERT ON users BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'created','employee',NEW.id,NEW.full_name); END;
CREATE TRIGGER IF NOT EXISTS audit_users_update AFTER UPDATE ON users BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'updated','employee',NEW.id,NEW.full_name); END;
CREATE TRIGGER IF NOT EXISTS audit_machines_insert AFTER INSERT ON machines BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'created','machine',NEW.id,NEW.name); END;
CREATE TRIGGER IF NOT EXISTS audit_machines_update AFTER UPDATE ON machines BEGIN INSERT INTO audit_log(id,action,entity_type,entity_id,details) VALUES(lower(hex(randomblob(16))),'updated','machine',NEW.id,NEW.name); END;
