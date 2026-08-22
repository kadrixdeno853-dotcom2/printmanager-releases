use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use chrono::Local;
use password_hash::{rand_core::OsRng, SaltString};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Local data could not be opened: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("The PrintManager data folder could not be created: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    InvalidOperation(String),
}

impl From<DatabaseError> for String {
    fn from(error: DatabaseError) -> Self {
        error.to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessProfile {
    pub id: Option<String>,
    pub business_name: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub tin: String,
    pub currency: String,
    pub owner_name: String,
    #[serde(default)]
    pub logo_data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: Option<String>,
    pub name: String,
    pub company: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub tin: String,
    pub credit_limit: i64,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: Option<String>,
    pub name: String,
    pub category: String,
    pub description: String,
    pub unit: String,
    pub pricing_method: String,
    pub selling_price: i64,
    pub estimated_cost: i64,
    pub minimum_charge: i64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotationItem {
    pub id: Option<String>,
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub unit: String,
    pub unit_price: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Quotation {
    pub id: Option<String>,
    pub quotation_number: Option<String>,
    pub customer_id: Option<String>,
    pub customer_name: Option<String>,
    pub status: String,
    pub issue_date: String,
    pub valid_until: String,
    pub subtotal: i64,
    pub discount: i64,
    pub tax: i64,
    pub total: i64,
    pub notes: String,
    pub terms: String,
    pub items: Vec<QuotationItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobItem {
    pub id: Option<String>,
    pub title: String,
    pub work_type: String,
    pub description: String,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub unit: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total: i64,
    pub inventory_item_id: Option<String>,
    pub material_used: f64,
    pub material_waste: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: Option<String>,
    pub job_number: Option<String>,
    pub quotation_id: Option<String>,
    pub customer_id: Option<String>,
    pub customer_name: Option<String>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub deadline: Option<String>,
    pub delivery_date: Option<String>,
    pub assigned_to: String,
    pub machine_name: String,
    pub artwork_status: String,
    pub delivery_method: String,
    pub delivery_address: String,
    pub delivery_notes: String,
    pub total_amount: i64,
    pub deposit_amount: i64,
    pub created_at: Option<String>,
    #[serde(default)]
    pub items: Vec<JobItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Machine {
    pub id: Option<String>,
    pub name: String,
    pub machine_type: String,
    pub model: String,
    pub status: String,
    pub notes: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub file_name: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
    pub encrypted: bool,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub id: String,
    pub actor_name: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: String,
    pub details: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceItem {
    pub id: Option<String>,
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub id: Option<String>,
    pub invoice_number: Option<String>,
    pub customer_id: Option<String>,
    pub customer_name: Option<String>,
    pub job_id: Option<String>,
    pub issue_date: String,
    pub due_date: String,
    pub status: String,
    pub subtotal: i64,
    pub discount: i64,
    pub tax: i64,
    pub total: i64,
    pub amount_paid: i64,
    pub balance: i64,
    pub notes: String,
    pub items: Vec<InvoiceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Payment {
    pub id: Option<String>,
    pub receipt_number: Option<String>,
    pub invoice_id: String,
    pub amount: i64,
    pub payment_method: String,
    pub reference: String,
    pub paid_at: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: Option<String>,
    pub expense_number: Option<String>,
    pub job_id: Option<String>,
    pub job_number: Option<String>,
    #[serde(default)]
    pub purchase_id: Option<String>,
    pub category: String,
    pub payee: String,
    pub description: String,
    pub amount: i64,
    #[serde(default)]
    pub amount_paid: i64,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub payment_status: String,
    pub expense_date: String,
    pub payment_method: String,
    pub reference: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryTotal {
    pub category: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinanceSummary {
    pub from_date: String,
    pub to_date: String,
    pub invoiced: i64,
    pub collected: i64,
    pub expenses: i64,
    pub net_cash: i64,
    pub outstanding: i64,
    pub job_costs: i64,
    pub categories: Vec<CategoryTotal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Supplier {
    pub id: Option<String>,
    pub name: String,
    pub contact_person: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub tin: String,
    pub notes: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub id: Option<String>,
    pub sku: Option<String>,
    pub name: String,
    pub category: String,
    pub unit: String,
    pub quantity: f64,
    pub reorder_level: f64,
    pub unit_cost: f64,
    pub is_active: bool,
    #[serde(default)]
    pub total_purchased: f64,
    #[serde(default)]
    pub total_printed: f64,
    #[serde(default)]
    pub total_waste: f64,
    #[serde(default)]
    pub total_revenue: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseItem {
    pub id: Option<String>,
    pub inventory_item_id: String,
    pub item_name: Option<String>,
    pub quantity: f64,
    pub unit_cost: f64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Purchase {
    pub id: Option<String>,
    pub purchase_number: Option<String>,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub purchase_date: String,
    pub payment_status: String,
    pub payment_method: String,
    pub reference: String,
    pub total: i64,
    #[serde(default)]
    pub amount_paid: i64,
    #[serde(default)]
    pub due_date: String,
    pub notes: String,
    pub items: Vec<PurchaseItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SupplierPayment {
    pub purchase_id: String,
    pub amount: i64,
    pub payment_method: String,
    pub reference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockUsage {
    pub inventory_item_id: String,
    pub job_id: String,
    pub printed_quantity: f64,
    pub waste_quantity: f64,
    pub revenue: i64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Option<String>,
    pub full_name: String,
    pub username: String,
    pub role: String,
    pub phone: String,
    pub is_active: bool,
    pub last_login_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInput {
    pub id: Option<String>,
    pub full_name: String,
    pub username: String,
    pub password: String,
    pub role: String,
    pub phone: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub sales_today: i64,
    pub sales_month: i64,
    pub expenses_today: i64,
    pub expenses_month: i64,
    pub net_cash_month: i64,
    pub outstanding: i64,
    pub active_jobs: i64,
    pub jobs_due_today: i64,
    pub overdue_jobs: i64,
    pub completed_jobs: i64,
    pub recent_jobs: Vec<Job>,
}

pub struct Database {
    connection: Connection,
    path: PathBuf,
}

impl Database {
    pub fn reset_workspace(&mut self) -> Result<(), DatabaseError> {
        let transaction = self.connection.transaction()?;
        transaction.execute_batch(
            "DELETE FROM payments;
             DELETE FROM invoice_items;
             DELETE FROM invoices;
             DELETE FROM quotation_items;
             DELETE FROM quotations;
             DELETE FROM expenses;
             DELETE FROM stock_movements;
             DELETE FROM purchase_items;
             DELETE FROM purchases;
             DELETE FROM jobs;
             DELETE FROM machines;
             DELETE FROM inventory_items;
             DELETE FROM suppliers;
             DELETE FROM products;
             DELETE FROM customers;
             DELETE FROM audit_log;
             DELETE FROM users;
             DELETE FROM business_profile;",
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn open(data_dir: &Path) -> Result<Self, DatabaseError> {
        fs::create_dir_all(data_dir)?;
        let path = data_dir.join("printing.db");
        let connection = Connection::open(&path)?;
        connection.pragma_update(None, "foreign_keys", "ON")?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.pragma_update(None, "synchronous", "NORMAL")?;
        let database = Self { connection, path };
        database.migrate()?;
        Ok(database)
    }

    fn migrate(&self) -> Result<(), DatabaseError> {
        self.connection
            .execute_batch(include_str!("../migrations/001_initial.sql"))?;
        let jobs_have_quotation: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('jobs') WHERE name='quotation_id'",
            [],
            |row| row.get(0),
        )?;
        if !jobs_have_quotation {
            self.connection.execute(
                "ALTER TABLE jobs ADD COLUMN quotation_id TEXT REFERENCES quotations(id)",
                [],
            )?;
        }
        let quotations_have_job: bool = self.connection.query_row("SELECT COUNT(*) > 0 FROM pragma_table_info('quotations') WHERE name='converted_job_id'", [], |row| row.get(0))?;
        if !quotations_have_job {
            self.connection.execute(
                "ALTER TABLE quotations ADD COLUMN converted_job_id TEXT REFERENCES jobs(id)",
                [],
            )?;
        }
        let jobs_have_delivery: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('jobs') WHERE name='delivery_date'",
            [],
            |row| row.get(0),
        )?;
        if !jobs_have_delivery {
            self.connection
                .execute("ALTER TABLE jobs ADD COLUMN delivery_date TEXT", [])?;
        }
        let jobs_have_assignee: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('jobs') WHERE name='assigned_to'",
            [],
            |row| row.get(0),
        )?;
        if !jobs_have_assignee {
            self.connection.execute(
                "ALTER TABLE jobs ADD COLUMN assigned_to TEXT NOT NULL DEFAULT ''",
                [],
            )?;
        }
        let jobs_have_machine: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('jobs') WHERE name='machine_name'",
            [],
            |row| row.get(0),
        )?;
        if !jobs_have_machine {
            self.connection.execute(
                "ALTER TABLE jobs ADD COLUMN machine_name TEXT NOT NULL DEFAULT ''",
                [],
            )?;
        }
        let users_have_recovery: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('users') WHERE name='recovery_hash'",
            [],
            |row| row.get(0),
        )?;
        if !users_have_recovery {
            self.connection
                .execute("ALTER TABLE users ADD COLUMN recovery_hash TEXT", [])?;
        }
        let business_has_logo: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('business_profile') WHERE name='logo_data'",
            [],
            |row| row.get(0),
        )?;
        if !business_has_logo {
            self.connection.execute(
                "ALTER TABLE business_profile ADD COLUMN logo_data TEXT NOT NULL DEFAULT ''",
                [],
            )?;
        }
        for (column, definition) in [
            ("artwork_status", "TEXT NOT NULL DEFAULT 'not_received'"),
            ("delivery_method", "TEXT NOT NULL DEFAULT 'collection'"),
            ("delivery_address", "TEXT NOT NULL DEFAULT ''"),
            ("delivery_notes", "TEXT NOT NULL DEFAULT ''"),
        ] {
            let exists: bool = self.connection.query_row(
                &format!(
                    "SELECT COUNT(*) > 0 FROM pragma_table_info('jobs') WHERE name='{column}'"
                ),
                [],
                |row| row.get(0),
            )?;
            if !exists {
                self.connection.execute(
                    &format!("ALTER TABLE jobs ADD COLUMN {column} {definition}"),
                    [],
                )?;
            }
        }
        self.connection.execute_batch("CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_quotation ON jobs(quotation_id) WHERE quotation_id IS NOT NULL;")?;
        for (column, definition) in [
            ("printed_quantity", "REAL NOT NULL DEFAULT 0"),
            ("waste_quantity", "REAL NOT NULL DEFAULT 0"),
            ("revenue", "INTEGER NOT NULL DEFAULT 0"),
        ] {
            let exists: bool = self.connection.query_row(&format!("SELECT COUNT(*) > 0 FROM pragma_table_info('stock_movements') WHERE name='{column}'"), [], |row| row.get(0))?;
            if !exists {
                self.connection.execute(
                    &format!("ALTER TABLE stock_movements ADD COLUMN {column} {definition}"),
                    [],
                )?;
            }
        }
        for (column, definition) in [
            ("inventory_item_id", "TEXT REFERENCES inventory_items(id)"),
            ("material_used", "REAL NOT NULL DEFAULT 0"),
            ("material_waste", "REAL NOT NULL DEFAULT 0"),
        ] {
            let exists: bool = self.connection.query_row(
                &format!(
                    "SELECT COUNT(*) > 0 FROM pragma_table_info('job_items') WHERE name='{column}'"
                ),
                [],
                |row| row.get(0),
            )?;
            if !exists {
                self.connection.execute(
                    &format!("ALTER TABLE job_items ADD COLUMN {column} {definition}"),
                    [],
                )?;
            }
        }
        for (column, definition) in [
            ("amount_paid", "INTEGER NOT NULL DEFAULT 0"),
            ("due_date", "TEXT NOT NULL DEFAULT ''"),
        ] {
            let exists: bool = self.connection.query_row(
                &format!(
                    "SELECT COUNT(*) > 0 FROM pragma_table_info('purchases') WHERE name='{column}'"
                ),
                [],
                |row| row.get(0),
            )?;
            if !exists {
                self.connection.execute(
                    &format!("ALTER TABLE purchases ADD COLUMN {column} {definition}"),
                    [],
                )?;
            }
        }
        for (column, definition) in [
            ("amount_paid", "INTEGER NOT NULL DEFAULT 0"),
            ("due_date", "TEXT NOT NULL DEFAULT ''"),
            ("payment_status", "TEXT NOT NULL DEFAULT 'paid'"),
        ] {
            let exists: bool = self.connection.query_row(
                &format!(
                    "SELECT COUNT(*) > 0 FROM pragma_table_info('expenses') WHERE name='{column}'"
                ),
                [],
                |row| row.get(0),
            )?;
            if !exists {
                self.connection.execute(
                    &format!("ALTER TABLE expenses ADD COLUMN {column} {definition}"),
                    [],
                )?;
            }
        }
        let expenses_have_purchase: bool = self.connection.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('expenses') WHERE name='purchase_id'",
            [],
            |row| row.get(0),
        )?;
        if !expenses_have_purchase {
            self.connection.execute(
                "ALTER TABLE expenses ADD COLUMN purchase_id TEXT REFERENCES purchases(id)",
                [],
            )?;
        }
        self.connection.execute("UPDATE expenses SET amount_paid=amount WHERE purchase_id IS NULL AND payment_status='paid' AND amount_paid=0",[])?;
        self.connection.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_expenses_purchase ON expenses(purchase_id);",
        )?;
        self.connection.execute("UPDATE expenses SET amount=(SELECT total FROM purchases WHERE id=expenses.purchase_id),amount_paid=(SELECT amount_paid FROM purchases WHERE id=expenses.purchase_id),due_date=(SELECT due_date FROM purchases WHERE id=expenses.purchase_id),payment_status=(SELECT payment_status FROM purchases WHERE id=expenses.purchase_id),description='Material purchase '||(SELECT purchase_number FROM purchases WHERE id=expenses.purchase_id),notes='Automatically reconciled from purchasing; supplier payments reduce accounts payable without creating another expense',updated_at=CURRENT_TIMESTAMP WHERE purchase_id IS NOT NULL",[])?;
        let mut missing_statement=self.connection.prepare("SELECT p.id,p.purchase_number,p.purchase_date,p.payment_method,p.reference,p.total,p.amount_paid,s.name FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE NOT EXISTS(SELECT 1 FROM expenses e WHERE e.purchase_id=p.id)")?;
        let missing = missing_statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i64>(5)?,
                    row.get::<_, i64>(6)?,
                    row.get::<_, Option<String>>(7)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        drop(missing_statement);
        let mut expense_sequence: i64 = self.connection.query_row(
            "SELECT COALESCE(MAX(CAST(SUBSTR(expense_number,5) AS INTEGER)),0)+1 FROM expenses",
            [],
            |row| row.get(0),
        )?;
        for (purchase_id, number, date, method, reference, total, paid, supplier) in missing {
            let status = if paid <= 0 {
                "unpaid"
            } else if paid >= total {
                "paid"
            } else {
                "part-paid"
            };
            self.connection.execute("INSERT INTO expenses(id,expense_number,purchase_id,category,payee,description,amount,amount_paid,payment_status,expense_date,payment_method,reference,notes)VALUES(?1,?2,?3,'Materials',?4,?5,?6,?7,?8,?9,?10,?11,?12)",params![Uuid::new_v4().to_string(),format!("EXP-{:05}",expense_sequence),purchase_id,supplier.unwrap_or_else(||"Material supplier".into()),format!("Material purchase {number}"),total,paid,status,date,method,reference,format!("Automatically reconciled from purchasing · UGX {paid} paid · UGX {} payable",total-paid)])?;
            expense_sequence += 1;
        }
        Ok(())
    }

    pub fn get_business_profile(&self) -> Result<Option<BusinessProfile>, DatabaseError> {
        self.connection.query_row(
            "SELECT id, business_name, phone, email, address, tin, currency, owner_name, logo_data FROM business_profile LIMIT 1",
            [],
            |row| Ok(BusinessProfile { id: row.get(0)?, business_name: row.get(1)?, phone: row.get(2)?, email: row.get(3)?, address: row.get(4)?, tin: row.get(5)?, currency: row.get(6)?, owner_name: row.get(7)?, logo_data: row.get(8)? }),
        ).optional().map_err(Into::into)
    }

    pub fn save_business_profile(
        &mut self,
        mut profile: BusinessProfile,
    ) -> Result<BusinessProfile, DatabaseError> {
        let transaction = self.connection.transaction()?;
        let id = profile
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        transaction.execute("DELETE FROM business_profile WHERE id != ?1", params![id])?;
        transaction.execute(
            "INSERT INTO business_profile (id, business_name, phone, email, address, tin, currency, owner_name, logo_data, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET business_name=excluded.business_name, phone=excluded.phone, email=excluded.email, address=excluded.address, tin=excluded.tin, currency=excluded.currency, owner_name=excluded.owner_name, logo_data=excluded.logo_data, updated_at=CURRENT_TIMESTAMP",
            params![id, profile.business_name, profile.phone, profile.email, profile.address, profile.tin, profile.currency, profile.owner_name, profile.logo_data],
        )?;
        transaction.commit()?;
        profile.id = Some(id);
        Ok(profile)
    }

    pub fn create_backup(&self, backup_dir: &Path) -> Result<PathBuf, DatabaseError> {
        fs::create_dir_all(backup_dir)?;
        let destination = backup_dir.join(format!(
            "printmanager-{}.db",
            Local::now().format("%Y-%m-%d-%H%M%S")
        ));
        let mut backup_connection = Connection::open(&destination)?;
        let backup = rusqlite::backup::Backup::new(&self.connection, &mut backup_connection)?;
        backup.run_to_completion(5, std::time::Duration::from_millis(50), None)?;
        drop(backup);
        backup_connection.close().map_err(|(_, error)| error)?;
        Ok(destination)
    }

    pub fn list_backups(&self, backup_dir: &Path) -> Result<Vec<BackupInfo>, DatabaseError> {
        fs::create_dir_all(backup_dir)?;
        let mut items = Vec::new();
        for entry in fs::read_dir(backup_dir)? {
            let entry = entry?;
            let path = entry.path();
            let extension = path
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or("");
            if extension != "db" && extension != "pmbak" {
                continue;
            }
            let metadata = entry.metadata()?;
            let created = metadata
                .modified()
                .ok()
                .map(|time| {
                    chrono::DateTime::<Local>::from(time)
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string()
                })
                .unwrap_or_default();
            items.push(BackupInfo {
                file_name: entry.file_name().to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                size: metadata.len(),
                created_at: created,
                encrypted: extension == "pmbak",
            });
        }
        items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(items)
    }

    pub fn restore_backup(
        &mut self,
        backup_dir: &Path,
        file_name: &str,
    ) -> Result<(), DatabaseError> {
        let safe = Path::new(file_name)
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| DatabaseError::InvalidOperation("Invalid backup file".into()))?;
        if safe != file_name || !safe.ends_with(".db") {
            return Err(DatabaseError::InvalidOperation(
                "Only a local database backup can be restored".into(),
            ));
        }
        let source_path = backup_dir.join(safe);
        let source =
            Connection::open_with_flags(source_path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        let integrity: String = source.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
        if integrity != "ok" {
            return Err(DatabaseError::InvalidOperation(
                "The selected backup is damaged".into(),
            ));
        }
        let backup = rusqlite::backup::Backup::new(&source, &mut self.connection)?;
        backup.run_to_completion(5, std::time::Duration::from_millis(50), None)?;
        drop(backup);
        self.migrate()?;
        Ok(())
    }

    pub fn list_customers(&self, search: &str) -> Result<Vec<Customer>, DatabaseError> {
        let pattern = format!("%{}%", search.trim());
        let mut statement = self.connection.prepare(
            "SELECT id, name, company, phone, email, address, tin, credit_limit, notes FROM customers WHERE name LIKE ?1 OR company LIKE ?1 OR phone LIKE ?1 ORDER BY name COLLATE NOCASE"
        )?;
        let rows = statement.query_map(params![pattern], |row| {
            Ok(Customer {
                id: row.get(0)?,
                name: row.get(1)?,
                company: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                address: row.get(5)?,
                tin: row.get(6)?,
                credit_limit: row.get(7)?,
                notes: row.get(8)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_customer(&mut self, mut customer: Customer) -> Result<Customer, DatabaseError> {
        let id = customer
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        self.connection.execute(
            "INSERT INTO customers (id, name, company, phone, email, address, tin, credit_limit, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT(id) DO UPDATE SET name=excluded.name, company=excluded.company, phone=excluded.phone, email=excluded.email, address=excluded.address, tin=excluded.tin, credit_limit=excluded.credit_limit, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP",
            params![id, customer.name.trim(), customer.company.trim(), customer.phone.trim(), customer.email.trim(), customer.address.trim(), customer.tin.trim(), customer.credit_limit, customer.notes.trim()],
        )?;
        customer.id = Some(id);
        Ok(customer)
    }

    pub fn list_products(&self, search: &str) -> Result<Vec<Product>, DatabaseError> {
        let pattern = format!("%{}%", search.trim());
        let mut statement = self.connection.prepare(
            "SELECT id, name, category, description, unit, pricing_method, selling_price, estimated_cost, minimum_charge, is_active FROM products WHERE name LIKE ?1 OR category LIKE ?1 ORDER BY is_active DESC, name COLLATE NOCASE"
        )?;
        let rows = statement.query_map(params![pattern], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                description: row.get(3)?,
                unit: row.get(4)?,
                pricing_method: row.get(5)?,
                selling_price: row.get(6)?,
                estimated_cost: row.get(7)?,
                minimum_charge: row.get(8)?,
                is_active: row.get(9)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_product(&mut self, mut product: Product) -> Result<Product, DatabaseError> {
        let id = product
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        self.connection.execute(
            "INSERT INTO products (id, name, category, description, unit, pricing_method, selling_price, estimated_cost, minimum_charge, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, description=excluded.description, unit=excluded.unit, pricing_method=excluded.pricing_method, selling_price=excluded.selling_price, estimated_cost=excluded.estimated_cost, minimum_charge=excluded.minimum_charge, is_active=excluded.is_active, updated_at=CURRENT_TIMESTAMP",
            params![id, product.name.trim(), product.category.trim(), product.description.trim(), product.unit, product.pricing_method, product.selling_price, product.estimated_cost, product.minimum_charge, product.is_active],
        )?;
        product.id = Some(id);
        Ok(product)
    }

    pub fn list_quotations(&self) -> Result<Vec<Quotation>, DatabaseError> {
        let mut statement = self.connection.prepare("SELECT q.id, q.quotation_number, q.customer_id, c.name, q.status, q.issue_date, q.valid_until, q.subtotal, q.discount, q.tax, q.total, q.notes, q.terms FROM quotations q LEFT JOIN customers c ON c.id=q.customer_id ORDER BY q.created_at DESC")?;
        let rows = statement.query_map([], |row| {
            Ok(Quotation {
                id: row.get(0)?,
                quotation_number: row.get(1)?,
                customer_id: row.get(2)?,
                customer_name: row.get(3)?,
                status: row.get(4)?,
                issue_date: row.get(5)?,
                valid_until: row.get(6)?,
                subtotal: row.get(7)?,
                discount: row.get(8)?,
                tax: row.get(9)?,
                total: row.get(10)?,
                notes: row.get(11)?,
                terms: row.get(12)?,
                items: Vec::new(),
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_quotation(&self, id: &str) -> Result<Option<Quotation>, DatabaseError> {
        let mut quotation = self.connection.query_row("SELECT q.id, q.quotation_number, q.customer_id, c.name, q.status, q.issue_date, q.valid_until, q.subtotal, q.discount, q.tax, q.total, q.notes, q.terms FROM quotations q LEFT JOIN customers c ON c.id=q.customer_id WHERE q.id=?1", params![id], |row| Ok(Quotation { id: row.get(0)?, quotation_number: row.get(1)?, customer_id: row.get(2)?, customer_name: row.get(3)?, status: row.get(4)?, issue_date: row.get(5)?, valid_until: row.get(6)?, subtotal: row.get(7)?, discount: row.get(8)?, tax: row.get(9)?, total: row.get(10)?, notes: row.get(11)?, terms: row.get(12)?, items: Vec::new() })).optional()?;
        if let Some(ref mut quotation) = quotation {
            let mut statement = self.connection.prepare("SELECT id, product_id, description, quantity, width, height, unit, unit_price, total FROM quotation_items WHERE quotation_id=?1 ORDER BY position")?;
            let rows = statement.query_map(params![id], |row| {
                Ok(QuotationItem {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    description: row.get(2)?,
                    quantity: row.get(3)?,
                    width: row.get(4)?,
                    height: row.get(5)?,
                    unit: row.get(6)?,
                    unit_price: row.get(7)?,
                    total: row.get(8)?,
                })
            })?;
            quotation.items = rows.collect::<Result<Vec<_>, _>>()?;
        }
        Ok(quotation)
    }

    pub fn update_quotation_status(&self, id: &str, status: &str) -> Result<(), DatabaseError> {
        self.connection.execute(
            "UPDATE quotations SET status=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?1",
            params![id, status],
        )?;
        Ok(())
    }

    pub fn convert_quotation_to_job(
        &mut self,
        quotation_id: &str,
    ) -> Result<String, DatabaseError> {
        let transaction = self.connection.transaction()?;
        if let Some(existing) = transaction
            .query_row(
                "SELECT job_number FROM jobs WHERE quotation_id=?1",
                params![quotation_id],
                |row| row.get::<_, String>(0),
            )
            .optional()?
        {
            return Ok(existing);
        }
        let (customer_id, total, status): (Option<String>, i64, String) = transaction.query_row(
            "SELECT customer_id, total, status FROM quotations WHERE id=?1",
            params![quotation_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )?;
        if status != "accepted" {
            return Err(DatabaseError::InvalidOperation(
                "Only accepted quotations can be converted into jobs".to_string(),
            ));
        }
        let title: String = transaction.query_row("SELECT COALESCE(GROUP_CONCAT(description, ', '), 'Print job') FROM (SELECT description FROM quotation_items WHERE quotation_id=?1 ORDER BY position LIMIT 3)", params![quotation_id], |row| row.get(0))?;
        let sequence: i64 =
            transaction.query_row("SELECT COUNT(*) + 1 FROM jobs", [], |row| row.get(0))?;
        let job_number = format!("JOB-{:05}", sequence);
        let job_id = Uuid::new_v4().to_string();
        transaction.execute("INSERT INTO jobs (id, job_number, customer_id, title, status, total_amount, quotation_id) VALUES (?1, ?2, ?3, ?4, 'new_order', ?5, ?6)", params![job_id, job_number, customer_id, title, total, quotation_id])?;
        transaction.execute(
            "UPDATE quotations SET converted_job_id=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?1",
            params![quotation_id, job_id],
        )?;
        transaction.commit()?;
        Ok(job_number)
    }

    pub fn list_jobs(&self, search: &str) -> Result<Vec<Job>, DatabaseError> {
        let pattern = format!("%{}%", search.trim());
        let mut statement = self.connection.prepare("SELECT j.id,j.job_number,j.quotation_id,j.customer_id,c.name,j.title,j.description,j.status,j.priority,j.deadline,j.delivery_date,j.assigned_to,j.machine_name,j.artwork_status,j.delivery_method,j.delivery_address,j.delivery_notes,j.total_amount,j.deposit_amount,j.created_at FROM jobs j LEFT JOIN customers c ON c.id=j.customer_id WHERE j.job_number LIKE ?1 OR j.title LIKE ?1 OR c.name LIKE ?1 ORDER BY CASE j.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,j.deadline IS NULL,j.deadline,j.created_at DESC")?;
        let rows = statement.query_map(params![pattern], |row| {
            Ok(Job {
                id: row.get(0)?,
                job_number: row.get(1)?,
                quotation_id: row.get(2)?,
                customer_id: row.get(3)?,
                customer_name: row.get(4)?,
                title: row.get(5)?,
                description: row.get(6)?,
                status: row.get(7)?,
                priority: row.get(8)?,
                deadline: row.get(9)?,
                delivery_date: row.get(10)?,
                assigned_to: row.get(11)?,
                machine_name: row.get(12)?,
                artwork_status: row.get(13)?,
                delivery_method: row.get(14)?,
                delivery_address: row.get(15)?,
                delivery_notes: row.get(16)?,
                total_amount: row.get(17)?,
                deposit_amount: row.get(18)?,
                created_at: row.get(19)?,
                items: Vec::new(),
            })
        })?;
        let mut jobs = rows.collect::<Result<Vec<_>, _>>()?;
        for job in &mut jobs {
            if let Some(id) = job.id.as_deref() {
                let mut items=self.connection.prepare("SELECT id,title,work_type,description,width,height,unit,quantity,unit_price,total,inventory_item_id,material_used,material_waste FROM job_items WHERE job_id=?1 ORDER BY position")?;
                let rows = items.query_map(params![id], |row| {
                    Ok(JobItem {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        work_type: row.get(2)?,
                        description: row.get(3)?,
                        width: row.get(4)?,
                        height: row.get(5)?,
                        unit: row.get(6)?,
                        quantity: row.get(7)?,
                        unit_price: row.get(8)?,
                        total: row.get(9)?,
                        inventory_item_id: row.get(10)?,
                        material_used: row.get(11)?,
                        material_waste: row.get(12)?,
                    })
                })?;
                job.items = rows.collect::<Result<Vec<_>, _>>()?;
            }
            if job.items.is_empty() {
                job.items.push(JobItem {
                    id: None,
                    title: job.title.clone(),
                    work_type: String::new(),
                    description: job.description.clone(),
                    width: None,
                    height: None,
                    unit: "job".into(),
                    quantity: 1.0,
                    unit_price: job.total_amount as f64,
                    total: job.total_amount,
                    inventory_item_id: None,
                    material_used: 0.0,
                    material_waste: 0.0,
                });
            }
        }
        Ok(jobs)
    }

    pub fn save_job(&mut self, mut job: Job) -> Result<Job, DatabaseError> {
        let id = job.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
        let number = match job.job_number.clone() {
            Some(value) if !value.is_empty() => value,
            _ => {
                let sequence: i64 =
                    self.connection
                        .query_row("SELECT COUNT(*) + 1 FROM jobs", [], |row| row.get(0))?;
                format!("JOB-{:05}", sequence)
            }
        };
        if !job.items.is_empty() {
            job.title = job
                .items
                .iter()
                .map(|item| item.title.trim())
                .filter(|value| !value.is_empty())
                .take(3)
                .collect::<Vec<_>>()
                .join(", ");
            job.description = format!(
                "{} work item{}",
                job.items.len(),
                if job.items.len() == 1 { "" } else { "s" }
            );
            job.total_amount = job.items.iter().map(|item| item.total).sum();
        }
        let transaction = self.connection.transaction()?;
        transaction.execute("INSERT INTO jobs (id,job_number,quotation_id,customer_id,title,description,status,priority,deadline,delivery_date,assigned_to,machine_name,artwork_status,delivery_method,delivery_address,delivery_notes,total_amount,deposit_amount) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18) ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id,title=excluded.title,description=excluded.description,status=excluded.status,priority=excluded.priority,deadline=excluded.deadline,delivery_date=excluded.delivery_date,assigned_to=excluded.assigned_to,machine_name=excluded.machine_name,artwork_status=excluded.artwork_status,delivery_method=excluded.delivery_method,delivery_address=excluded.delivery_address,delivery_notes=excluded.delivery_notes,total_amount=excluded.total_amount,deposit_amount=excluded.deposit_amount,updated_at=CURRENT_TIMESTAMP", params![id,number,job.quotation_id,job.customer_id,job.title.trim(),job.description.trim(),job.status,job.priority,job.deadline,job.delivery_date,job.assigned_to.trim(),job.machine_name.trim(),job.artwork_status,job.delivery_method,job.delivery_address.trim(),job.delivery_notes.trim(),job.total_amount,job.deposit_amount])?;
        let mut old = std::collections::HashMap::<String, (f64, f64)>::new();
        {
            let mut statement=transaction.prepare("SELECT inventory_item_id,SUM(material_used),SUM(material_waste) FROM job_items WHERE job_id=?1 AND inventory_item_id IS NOT NULL GROUP BY inventory_item_id")?;
            for row in statement.query_map(params![id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })? {
                let (material, used, waste) = row?;
                old.insert(material, (used, waste));
            }
        }
        let mut new = std::collections::HashMap::<String, (f64, f64, i64)>::new();
        for item in &job.items {
            if item.material_used < 0.0 || item.material_waste < 0.0 {
                return Err(DatabaseError::InvalidOperation(
                    "Material usage and waste cannot be negative".into(),
                ));
            }
            if let Some(material) = item
                .inventory_item_id
                .as_ref()
                .filter(|value| !value.is_empty())
            {
                let entry = new.entry(material.clone()).or_insert((0.0, 0.0, 0));
                entry.0 += item.material_used;
                entry.1 += item.material_waste;
                entry.2 += item.total;
            }
        }
        for material in old
            .keys()
            .chain(new.keys())
            .cloned()
            .collect::<std::collections::HashSet<String>>()
        {
            let (old_used, old_waste) = old.get(&material).copied().unwrap_or((0.0, 0.0));
            let (new_used, new_waste, revenue) =
                new.get(&material).copied().unwrap_or((0.0, 0.0, 0));
            let delta = (new_used + new_waste) - (old_used + old_waste);
            let available: f64 = transaction.query_row(
                "SELECT quantity FROM inventory_items WHERE id=?1",
                params![material],
                |row| row.get(0),
            )?;
            if delta > available {
                return Err(DatabaseError::InvalidOperation(format!(
                    "Only {available} units of the selected material remain"
                )));
            }
            if delta.abs() > 0.000001 {
                transaction.execute("UPDATE inventory_items SET quantity=quantity-?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1",params![material,delta])?;
                transaction.execute("INSERT INTO stock_movements(id,inventory_item_id,job_id,movement_type,quantity_delta,printed_quantity,waste_quantity,revenue,reason)VALUES(?1,?2,?3,'job_usage',?4,?5,?6,?7,'Automatic job material adjustment')",params![Uuid::new_v4().to_string(),material,id,-delta,new_used-old_used,new_waste-old_waste,revenue])?;
            }
        }
        transaction.execute("DELETE FROM job_items WHERE job_id=?1", params![id])?;
        for (position, item) in job.items.iter_mut().enumerate() {
            let item_id = item
                .id
                .clone()
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            transaction.execute("INSERT INTO job_items(id,job_id,title,work_type,description,width,height,unit,quantity,unit_price,total,inventory_item_id,material_used,material_waste,position)VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",params![item_id,id,item.title.trim(),item.work_type.trim(),item.description.trim(),item.width,item.height,item.unit,item.quantity,item.unit_price,item.total,item.inventory_item_id,item.material_used,item.material_waste,position as i64])?;
            item.id = Some(item_id);
        }
        transaction.commit()?;
        job.id = Some(id);
        job.job_number = Some(number);
        Ok(job)
    }

    pub fn update_job_status(&self, id: &str, status: &str) -> Result<(), DatabaseError> {
        self.connection.execute(
            "UPDATE jobs SET status=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?1",
            params![id, status],
        )?;
        Ok(())
    }

    pub fn list_machines(&self) -> Result<Vec<Machine>, DatabaseError> {
        let mut s=self.connection.prepare("SELECT id,name,machine_type,model,status,notes,is_active FROM machines ORDER BY is_active DESC,name")?;
        let rows = s.query_map([], |r| {
            Ok(Machine {
                id: r.get(0)?,
                name: r.get(1)?,
                machine_type: r.get(2)?,
                model: r.get(3)?,
                status: r.get(4)?,
                notes: r.get(5)?,
                is_active: r.get(6)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
    pub fn save_machine(&self, mut machine: Machine) -> Result<Machine, DatabaseError> {
        if machine.name.trim().is_empty() {
            return Err(DatabaseError::InvalidOperation(
                "Machine name is required".into(),
            ));
        }
        let id = machine
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        self.connection.execute("INSERT INTO machines(id,name,machine_type,model,status,notes,is_active)VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,machine_type=excluded.machine_type,model=excluded.model,status=excluded.status,notes=excluded.notes,is_active=excluded.is_active,updated_at=CURRENT_TIMESTAMP",params![id,machine.name.trim(),machine.machine_type.trim(),machine.model.trim(),machine.status,machine.notes.trim(),machine.is_active])?;
        machine.id = Some(id);
        Ok(machine)
    }

    pub fn list_invoices(&self) -> Result<Vec<Invoice>, DatabaseError> {
        let mut statement = self.connection.prepare("SELECT i.id, i.invoice_number, i.customer_id, c.name, i.job_id, i.issue_date, i.due_date, i.status, i.subtotal, i.discount, i.tax, i.total, COALESCE(SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END),0), i.total-COALESCE(SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END),0), i.notes FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id LEFT JOIN payments p ON p.invoice_id=i.id GROUP BY i.id ORDER BY i.created_at DESC")?;
        let rows = statement.query_map([], |row| {
            Ok(Invoice {
                id: row.get(0)?,
                invoice_number: row.get(1)?,
                customer_id: row.get(2)?,
                customer_name: row.get(3)?,
                job_id: row.get(4)?,
                issue_date: row.get(5)?,
                due_date: row.get(6)?,
                status: row.get(7)?,
                subtotal: row.get(8)?,
                discount: row.get(9)?,
                tax: row.get(10)?,
                total: row.get(11)?,
                amount_paid: row.get(12)?,
                balance: row.get(13)?,
                notes: row.get(14)?,
                items: Vec::new(),
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_invoice(&self, id: &str) -> Result<Option<Invoice>, DatabaseError> {
        let mut invoice = self.connection.query_row("SELECT i.id, i.invoice_number, i.customer_id, c.name, i.job_id, i.issue_date, i.due_date, i.status, i.subtotal, i.discount, i.tax, i.total, COALESCE(SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END),0), i.total-COALESCE(SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END),0), i.notes FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id LEFT JOIN payments p ON p.invoice_id=i.id WHERE i.id=?1 GROUP BY i.id", params![id], |row| Ok(Invoice { id: row.get(0)?, invoice_number: row.get(1)?, customer_id: row.get(2)?, customer_name: row.get(3)?, job_id: row.get(4)?, issue_date: row.get(5)?, due_date: row.get(6)?, status: row.get(7)?, subtotal: row.get(8)?, discount: row.get(9)?, tax: row.get(10)?, total: row.get(11)?, amount_paid: row.get(12)?, balance: row.get(13)?, notes: row.get(14)?, items: Vec::new() })).optional()?;
        if let Some(ref mut invoice) = invoice {
            let mut statement = self.connection.prepare("SELECT id, product_id, description, quantity, unit_price, total FROM invoice_items WHERE invoice_id=?1 ORDER BY position")?;
            let rows = statement.query_map(params![id], |row| {
                Ok(InvoiceItem {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    description: row.get(2)?,
                    quantity: row.get(3)?,
                    unit_price: row.get(4)?,
                    total: row.get(5)?,
                })
            })?;
            invoice.items = rows.collect::<Result<Vec<_>, _>>()?;
        }
        Ok(invoice)
    }

    pub fn list_payments(&self, invoice_id: &str) -> Result<Vec<Payment>, DatabaseError> {
        let mut statement = self.connection.prepare("SELECT id, receipt_number, invoice_id, amount, payment_method, reference, paid_at, notes FROM payments WHERE invoice_id=?1 AND reversed_at IS NULL ORDER BY paid_at DESC, created_at DESC")?;
        let rows = statement.query_map(params![invoice_id], |row| {
            Ok(Payment {
                id: row.get(0)?,
                receipt_number: row.get(1)?,
                invoice_id: row.get(2)?,
                amount: row.get(3)?,
                payment_method: row.get(4)?,
                reference: row.get(5)?,
                paid_at: row.get(6)?,
                notes: row.get(7)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_invoice(&mut self, mut invoice: Invoice) -> Result<Invoice, DatabaseError> {
        let transaction = self.connection.transaction()?;
        let id = invoice
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let number = match invoice.invoice_number.clone() {
            Some(value) if !value.is_empty() => value,
            _ => {
                let sequence: i64 =
                    transaction
                        .query_row("SELECT COUNT(*) + 1 FROM invoices", [], |row| row.get(0))?;
                format!("INV-{:05}", sequence)
            }
        };
        transaction.execute("INSERT INTO invoices (id, invoice_number, customer_id, job_id, issue_date, due_date, status, subtotal, discount, tax, total, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'unpaid', ?7, ?8, ?9, ?10, ?11) ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id, job_id=excluded.job_id, issue_date=excluded.issue_date, due_date=excluded.due_date, subtotal=excluded.subtotal, discount=excluded.discount, tax=excluded.tax, total=excluded.total, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP", params![id, number, invoice.customer_id, invoice.job_id, invoice.issue_date, invoice.due_date, invoice.subtotal, invoice.discount, invoice.tax, invoice.total, invoice.notes])?;
        transaction.execute("DELETE FROM invoice_items WHERE invoice_id=?1", params![id])?;
        for (position, item) in invoice.items.iter_mut().enumerate() {
            let item_id = item
                .id
                .clone()
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            transaction.execute("INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, total, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)", params![item_id, id, item.product_id, item.description.trim(), item.quantity, item.unit_price, item.total, position as i64])?;
            item.id = Some(item_id);
        }
        transaction.commit()?;
        invoice.id = Some(id);
        invoice.invoice_number = Some(number);
        invoice.status = "unpaid".to_string();
        invoice.amount_paid = 0;
        invoice.balance = invoice.total;
        Ok(invoice)
    }

    pub fn record_payment(&mut self, mut payment: Payment) -> Result<Payment, DatabaseError> {
        let transaction = self.connection.transaction()?;
        let (total, paid): (i64, i64) = transaction.query_row("SELECT i.total, COALESCE(SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END),0) FROM invoices i LEFT JOIN payments p ON p.invoice_id=i.id WHERE i.id=?1 GROUP BY i.id", params![payment.invoice_id], |row| Ok((row.get(0)?, row.get(1)?)))?;
        if payment.amount <= 0 || payment.amount > total - paid {
            return Err(DatabaseError::InvalidOperation(
                "Payment must be greater than zero and cannot exceed the outstanding balance"
                    .to_string(),
            ));
        }
        let id = Uuid::new_v4().to_string();
        let sequence: i64 =
            transaction.query_row("SELECT COUNT(*) + 1 FROM payments", [], |row| row.get(0))?;
        let receipt = format!("RCT-{:05}", sequence);
        transaction.execute("INSERT INTO payments (id, receipt_number, invoice_id, amount, payment_method, reference, paid_at, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)", params![id, receipt, payment.invoice_id, payment.amount, payment.payment_method, payment.reference.trim(), payment.paid_at, payment.notes.trim()])?;
        let new_status = if paid + payment.amount >= total {
            "paid"
        } else {
            "part_paid"
        };
        transaction.execute(
            "UPDATE invoices SET status=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?1",
            params![payment.invoice_id, new_status],
        )?;
        transaction.commit()?;
        payment.id = Some(id);
        payment.receipt_number = Some(receipt);
        Ok(payment)
    }

    pub fn dashboard_summary(&self) -> Result<DashboardSummary, DatabaseError> {
        let sales_today = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM payments WHERE reversed_at IS NULL AND date(paid_at)=date('now','localtime')", [], |row| row.get(0))?;
        let sales_month = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM payments WHERE reversed_at IS NULL AND strftime('%Y-%m',paid_at)=strftime('%Y-%m','now','localtime')", [], |row| row.get(0))?;
        let expenses_today = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date(expense_date)=date('now','localtime')", [], |row| row.get(0))?;
        let expenses_month = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE strftime('%Y-%m',expense_date)=strftime('%Y-%m','now','localtime')", [], |row| row.get(0))?;
        let outstanding = self.connection.query_row("SELECT COALESCE(SUM(i.total-COALESCE(p.paid,0)),0) FROM invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) paid FROM payments WHERE reversed_at IS NULL GROUP BY invoice_id) p ON p.invoice_id=i.id", [], |row| row.get(0))?;
        let active_jobs = self.connection.query_row(
            "SELECT COUNT(*) FROM jobs WHERE status!='delivered'",
            [],
            |row| row.get(0),
        )?;
        let jobs_due_today = self.connection.query_row("SELECT COUNT(*) FROM jobs WHERE status!='delivered' AND date(deadline)=date('now','localtime')", [], |row| row.get(0))?;
        let overdue_jobs = self.connection.query_row("SELECT COUNT(*) FROM jobs WHERE status!='delivered' AND date(deadline)<date('now','localtime')", [], |row| row.get(0))?;
        let completed_jobs = self.connection.query_row(
            "SELECT COUNT(*) FROM jobs WHERE status='delivered'",
            [],
            |row| row.get(0),
        )?;
        let recent_jobs = self.list_jobs("")?.into_iter().take(5).collect();
        Ok(DashboardSummary {
            sales_today,
            sales_month,
            expenses_today,
            expenses_month,
            net_cash_month: sales_month - expenses_month,
            outstanding,
            active_jobs,
            jobs_due_today,
            overdue_jobs,
            completed_jobs,
            recent_jobs,
        })
    }

    pub fn list_expenses(&self, search: &str) -> Result<Vec<Expense>, DatabaseError> {
        let pattern = format!("%{}%", search.trim());
        let mut statement = self.connection.prepare("SELECT e.id, e.expense_number, e.job_id, j.job_number, e.purchase_id, e.category, e.payee, e.description, e.amount, e.amount_paid, e.due_date, e.payment_status, e.expense_date, e.payment_method, e.reference, e.notes FROM expenses e LEFT JOIN jobs j ON j.id=e.job_id WHERE e.expense_number LIKE ?1 OR e.category LIKE ?1 OR e.payee LIKE ?1 OR e.description LIKE ?1 ORDER BY e.expense_date DESC, e.created_at DESC")?;
        let rows = statement.query_map(params![pattern], |row| {
            Ok(Expense {
                id: row.get(0)?,
                expense_number: row.get(1)?,
                job_id: row.get(2)?,
                job_number: row.get(3)?,
                purchase_id: row.get(4)?,
                category: row.get(5)?,
                payee: row.get(6)?,
                description: row.get(7)?,
                amount: row.get(8)?,
                amount_paid: row.get(9)?,
                due_date: row.get(10)?,
                payment_status: row.get(11)?,
                expense_date: row.get(12)?,
                payment_method: row.get(13)?,
                reference: row.get(14)?,
                notes: row.get(15)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_expense(&mut self, mut expense: Expense) -> Result<Expense, DatabaseError> {
        if expense.amount <= 0 {
            return Err(DatabaseError::InvalidOperation(
                "Expense amount must be greater than zero".to_string(),
            ));
        }
        if expense.amount_paid < 0 || expense.amount_paid > expense.amount {
            return Err(DatabaseError::InvalidOperation(
                "Amount paid must be between zero and the total expense".into(),
            ));
        }
        expense.payment_status = if expense.amount_paid <= 0 {
            "unpaid".into()
        } else if expense.amount_paid >= expense.amount {
            "paid".into()
        } else {
            "part-paid".into()
        };
        let id = expense
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let number = match expense.expense_number.clone() {
            Some(value) if !value.is_empty() => value,
            _ => {
                let sequence: i64 =
                    self.connection
                        .query_row("SELECT COUNT(*) + 1 FROM expenses", [], |row| row.get(0))?;
                format!("EXP-{:05}", sequence)
            }
        };
        self.connection.execute("INSERT INTO expenses (id, expense_number, job_id, purchase_id, category, payee, description, amount, amount_paid, due_date, payment_status, expense_date, payment_method, reference, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15) ON CONFLICT(id) DO UPDATE SET job_id=excluded.job_id, category=excluded.category, payee=excluded.payee, description=excluded.description, amount=excluded.amount, amount_paid=excluded.amount_paid, due_date=excluded.due_date, payment_status=excluded.payment_status, expense_date=excluded.expense_date, payment_method=excluded.payment_method, reference=excluded.reference, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP", params![id, number, expense.job_id, expense.purchase_id, expense.category.trim(), expense.payee.trim(), expense.description.trim(), expense.amount, expense.amount_paid, expense.due_date, expense.payment_status, expense.expense_date, expense.payment_method, expense.reference.trim(), expense.notes.trim()])?;
        expense.id = Some(id);
        expense.expense_number = Some(number);
        Ok(expense)
    }

    pub fn finance_summary(
        &self,
        from_date: &str,
        to_date: &str,
    ) -> Result<FinanceSummary, DatabaseError> {
        let invoiced = self.connection.query_row("SELECT COALESCE(SUM(total),0) FROM invoices WHERE date(issue_date) BETWEEN date(?1) AND date(?2)", params![from_date, to_date], |row| row.get(0))?;
        let collected = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM payments WHERE reversed_at IS NULL AND date(paid_at) BETWEEN date(?1) AND date(?2)", params![from_date, to_date], |row| row.get(0))?;
        let expenses = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date(expense_date) BETWEEN date(?1) AND date(?2)", params![from_date, to_date], |row| row.get(0))?;
        let outstanding = self.connection.query_row("SELECT COALESCE(SUM(i.total-COALESCE(p.paid,0)),0) FROM invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) paid FROM payments WHERE reversed_at IS NULL GROUP BY invoice_id) p ON p.invoice_id=i.id", [], |row| row.get(0))?;
        let job_costs = self.connection.query_row("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE job_id IS NOT NULL AND date(expense_date) BETWEEN date(?1) AND date(?2)", params![from_date, to_date], |row| row.get(0))?;
        let mut statement = self.connection.prepare("SELECT category, SUM(amount) FROM expenses WHERE date(expense_date) BETWEEN date(?1) AND date(?2) GROUP BY category ORDER BY SUM(amount) DESC")?;
        let categories = statement
            .query_map(params![from_date, to_date], |row| {
                Ok(CategoryTotal {
                    category: row.get(0)?,
                    amount: row.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(FinanceSummary {
            from_date: from_date.to_string(),
            to_date: to_date.to_string(),
            invoiced,
            collected,
            expenses,
            net_cash: collected - expenses,
            outstanding,
            job_costs,
            categories,
        })
    }

    pub fn list_suppliers(&self) -> Result<Vec<Supplier>, DatabaseError> {
        let mut statement = self.connection.prepare("SELECT id,name,contact_person,phone,email,address,tin,notes,is_active FROM suppliers ORDER BY is_active DESC,name COLLATE NOCASE")?;
        let rows = statement.query_map([], |row| {
            Ok(Supplier {
                id: row.get(0)?,
                name: row.get(1)?,
                contact_person: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                address: row.get(5)?,
                tin: row.get(6)?,
                notes: row.get(7)?,
                is_active: row.get(8)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
    pub fn save_supplier(&self, mut supplier: Supplier) -> Result<Supplier, DatabaseError> {
        let id = supplier
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        self.connection.execute("INSERT INTO suppliers(id,name,contact_person,phone,email,address,tin,notes,is_active) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(id) DO UPDATE SET name=excluded.name,contact_person=excluded.contact_person,phone=excluded.phone,email=excluded.email,address=excluded.address,tin=excluded.tin,notes=excluded.notes,is_active=excluded.is_active,updated_at=CURRENT_TIMESTAMP",params![id,supplier.name.trim(),supplier.contact_person.trim(),supplier.phone.trim(),supplier.email.trim(),supplier.address.trim(),supplier.tin.trim(),supplier.notes.trim(),supplier.is_active])?;
        supplier.id = Some(id);
        Ok(supplier)
    }
    pub fn list_inventory(&self) -> Result<Vec<InventoryItem>, DatabaseError> {
        let mut statement=self.connection.prepare("SELECT i.id,i.sku,i.name,i.category,i.unit,i.quantity,i.reorder_level,i.unit_cost,i.is_active,COALESCE(SUM(CASE WHEN s.movement_type='purchase' THEN s.quantity_delta ELSE 0 END),0),COALESCE(SUM(s.printed_quantity),0),COALESCE(SUM(s.waste_quantity),0),COALESCE(SUM(s.revenue),0) FROM inventory_items i LEFT JOIN stock_movements s ON s.inventory_item_id=i.id GROUP BY i.id ORDER BY i.is_active DESC,i.name COLLATE NOCASE")?;
        let rows = statement.query_map([], |row| {
            Ok(InventoryItem {
                id: row.get(0)?,
                sku: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                quantity: row.get(5)?,
                reorder_level: row.get(6)?,
                unit_cost: row.get(7)?,
                is_active: row.get(8)?,
                total_purchased: row.get(9)?,
                total_printed: row.get(10)?,
                total_waste: row.get(11)?,
                total_revenue: row.get(12)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
    pub fn save_inventory_item(
        &self,
        mut item: InventoryItem,
    ) -> Result<InventoryItem, DatabaseError> {
        let id = item
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let sku = match item.sku.clone() {
            Some(value) if !value.is_empty() => value,
            _ => {
                let sequence: i64 = self.connection.query_row(
                    "SELECT COUNT(*)+1 FROM inventory_items",
                    [],
                    |row| row.get(0),
                )?;
                format!("MAT-{:04}", sequence)
            }
        };
        self.connection.execute("INSERT INTO inventory_items(id,sku,name,category,unit,quantity,reorder_level,unit_cost,is_active) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,unit=excluded.unit,reorder_level=excluded.reorder_level,unit_cost=excluded.unit_cost,is_active=excluded.is_active,updated_at=CURRENT_TIMESTAMP",params![id,sku,item.name.trim(),item.category.trim(),item.unit,item.quantity,item.reorder_level,item.unit_cost,item.is_active])?;
        item.id = Some(id);
        item.sku = Some(sku);
        Ok(item)
    }
    pub fn list_purchases(&self) -> Result<Vec<Purchase>, DatabaseError> {
        let mut statement=self.connection.prepare("SELECT p.id,p.purchase_number,p.supplier_id,s.name,p.purchase_date,p.payment_status,p.payment_method,p.reference,p.total,p.amount_paid,p.due_date,p.notes FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id ORDER BY p.purchase_date DESC,p.created_at DESC")?;
        let rows = statement.query_map([], |row| {
            Ok(Purchase {
                id: row.get(0)?,
                purchase_number: row.get(1)?,
                supplier_id: row.get(2)?,
                supplier_name: row.get(3)?,
                purchase_date: row.get(4)?,
                payment_status: row.get(5)?,
                payment_method: row.get(6)?,
                reference: row.get(7)?,
                total: row.get(8)?,
                amount_paid: row.get(9)?,
                due_date: row.get(10)?,
                notes: row.get(11)?,
                items: Vec::new(),
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
    pub fn record_purchase(&mut self, mut purchase: Purchase) -> Result<Purchase, DatabaseError> {
        if purchase.items.is_empty() {
            return Err(DatabaseError::InvalidOperation(
                "A purchase requires at least one material".to_string(),
            ));
        }
        let transaction = self.connection.transaction()?;
        let id = Uuid::new_v4().to_string();
        let sequence: i64 =
            transaction.query_row("SELECT COUNT(*)+1 FROM purchases", [], |row| row.get(0))?;
        let number = format!("PUR-{:05}", sequence);
        let total: i64 = purchase.items.iter().map(|item| item.total).sum();
        if purchase.amount_paid < 0 || purchase.amount_paid > total {
            return Err(DatabaseError::InvalidOperation(
                "Amount paid must be between zero and the purchase total".into(),
            ));
        }
        purchase.payment_status = if purchase.amount_paid == 0 {
            "unpaid".into()
        } else if purchase.amount_paid >= total {
            "paid".into()
        } else {
            "part-paid".into()
        };
        transaction.execute("INSERT INTO purchases(id,purchase_number,supplier_id,purchase_date,payment_status,payment_method,reference,total,amount_paid,due_date,notes) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",params![id,number,purchase.supplier_id,purchase.purchase_date,purchase.payment_status,purchase.payment_method,purchase.reference.trim(),total,purchase.amount_paid,purchase.due_date,purchase.notes.trim()])?;
        for (position, item) in purchase.items.iter_mut().enumerate() {
            if item.quantity <= 0.0 {
                return Err(DatabaseError::InvalidOperation(
                    "Purchase quantities must be greater than zero".to_string(),
                ));
            }
            let item_id = Uuid::new_v4().to_string();
            transaction.execute("INSERT INTO purchase_items(id,purchase_id,inventory_item_id,quantity,unit_cost,total,position) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![item_id,id,item.inventory_item_id,item.quantity,item.unit_cost,item.total,position as i64])?;
            transaction.execute(
                "UPDATE inventory_items SET unit_cost=CASE WHEN quantity+?2>0 THEN ((quantity*unit_cost)+?3)/(quantity+?2) ELSE ?4 END,quantity=quantity+?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1",
                params![item.inventory_item_id, item.quantity, item.total, item.unit_cost],
            )?;
            transaction.execute("INSERT INTO stock_movements(id,inventory_item_id,purchase_id,movement_type,quantity_delta,unit_cost,reason) VALUES(?1,?2,?3,'purchase',?4,?5,'Supplier purchase')",params![Uuid::new_v4().to_string(),item.inventory_item_id,id,item.quantity,item.unit_cost])?;
            item.id = Some(item_id);
        }
        let expense_sequence: i64 = transaction.query_row(
            "SELECT COALESCE(MAX(CAST(SUBSTR(expense_number,5) AS INTEGER)),0)+1 FROM expenses",
            [],
            |row| row.get(0),
        )?;
        let supplier_name: Option<String> = transaction.query_row("SELECT s.name FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=?1", params![id], |row| row.get(0))?;
        transaction.execute("INSERT INTO expenses(id,expense_number,purchase_id,category,payee,description,amount,amount_paid,due_date,payment_status,expense_date,payment_method,reference,notes) VALUES(?1,?2,?3,'Materials',?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",params![Uuid::new_v4().to_string(),format!("EXP-{:05}",expense_sequence),id,supplier_name.unwrap_or_else(||"Material supplier".into()),format!("Material purchase {number}"),total,purchase.amount_paid,purchase.due_date,purchase.payment_status,purchase.purchase_date,purchase.payment_method,purchase.reference.trim(),format!("Automatically recorded from purchasing · UGX {} paid · UGX {} payable",purchase.amount_paid,total-purchase.amount_paid)])?;
        transaction.commit()?;
        purchase.id = Some(id);
        purchase.purchase_number = Some(number);
        purchase.total = total;
        Ok(purchase)
    }
    pub fn record_supplier_payment(
        &mut self,
        payment: SupplierPayment,
    ) -> Result<(), DatabaseError> {
        if payment.amount <= 0 {
            return Err(DatabaseError::InvalidOperation(
                "Payment must be greater than zero".into(),
            ));
        }
        let transaction = self.connection.transaction()?;
        let (total, paid): (i64, i64) = transaction.query_row(
            "SELECT total,amount_paid FROM purchases WHERE id=?1",
            params![payment.purchase_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        if paid + payment.amount > total {
            return Err(DatabaseError::InvalidOperation(format!(
                "Only UGX {} remains on this supplier bill",
                total - paid
            )));
        }
        let next = paid + payment.amount;
        let status = if next >= total { "paid" } else { "part-paid" };
        transaction.execute("UPDATE purchases SET amount_paid=?2,payment_status=?3,payment_method=?4,reference=CASE WHEN ?5='' THEN reference ELSE ?5 END WHERE id=?1",params![payment.purchase_id,next,status,payment.payment_method,payment.reference.trim()])?;
        transaction.execute("UPDATE expenses SET amount_paid=?2,payment_status=?3,payment_method=?4,reference=CASE WHEN ?5='' THEN reference ELSE ?5 END,updated_at=CURRENT_TIMESTAMP WHERE purchase_id=?1",params![payment.purchase_id,next,status,payment.payment_method,payment.reference.trim()])?;
        transaction.commit()?;
        Ok(())
    }
    pub fn consume_stock(&mut self, usage: StockUsage) -> Result<(), DatabaseError> {
        let consumed = usage.printed_quantity + usage.waste_quantity;
        if usage.printed_quantity < 0.0 || usage.waste_quantity < 0.0 || consumed <= 0.0 {
            return Err(DatabaseError::InvalidOperation(
                "Printed material and waste must have a combined quantity greater than zero"
                    .to_string(),
            ));
        }
        if usage.revenue < 0 {
            return Err(DatabaseError::InvalidOperation(
                "Revenue cannot be negative".to_string(),
            ));
        }
        let transaction = self.connection.transaction()?;
        let available: f64 = transaction.query_row(
            "SELECT quantity FROM inventory_items WHERE id=?1",
            params![usage.inventory_item_id],
            |row| row.get(0),
        )?;
        if consumed > available {
            return Err(DatabaseError::InvalidOperation(format!(
                "Only {} units are currently available",
                available
            )));
        }
        transaction.execute("UPDATE inventory_items SET quantity=quantity-?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1",params![usage.inventory_item_id,consumed])?;
        transaction.execute("INSERT INTO stock_movements(id,inventory_item_id,job_id,movement_type,quantity_delta,printed_quantity,waste_quantity,revenue,reason) VALUES(?1,?2,?3,'job_usage',?4,?5,?6,?7,?8)",params![Uuid::new_v4().to_string(),usage.inventory_item_id,usage.job_id,-consumed,usage.printed_quantity,usage.waste_quantity,usage.revenue,usage.reason.trim()])?;
        transaction.commit()?;
        Ok(())
    }

    pub fn list_audit_entries(&self, limit: i64) -> Result<Vec<AuditEntry>, DatabaseError> {
        let mut statement=self.connection.prepare("SELECT a.id,u.full_name,a.action,a.entity_type,a.entity_id,a.details,a.created_at FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT ?1")?;
        let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
            Ok(AuditEntry {
                id: row.get(0)?,
                actor_name: row.get(1)?,
                action: row.get(2)?,
                entity_type: row.get(3)?,
                entity_id: row.get(4)?,
                details: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn delete_record(&mut self, entity: &str, id: &str) -> Result<(), DatabaseError> {
        if entity == "purchase" {
            let transaction = self.connection.transaction()?;
            let mut statement = transaction.prepare("SELECT pi.inventory_item_id,pi.quantity,i.quantity,pi.total FROM purchase_items pi JOIN inventory_items i ON i.id=pi.inventory_item_id WHERE pi.purchase_id=?1")?;
            let rows = statement
                .query_map(params![id], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, f64>(1)?,
                        row.get::<_, f64>(2)?,
                        row.get::<_, i64>(3)?,
                    ))
                })?
                .collect::<Result<Vec<_>, _>>()?;
            drop(statement);
            for (_, purchased, available, _) in &rows {
                if *available + 0.000001 < *purchased {
                    return Err(DatabaseError::InvalidOperation("This purchase cannot be deleted because some of its material has already been used. Keep it for accurate stock history.".into()));
                }
            }
            for (material, purchased, _, purchase_cost) in rows {
                transaction.execute("UPDATE inventory_items SET unit_cost=CASE WHEN quantity-?2>0 THEN MAX(0,((quantity*unit_cost)-?3)/(quantity-?2)) ELSE 0 END,quantity=quantity-?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1",params![material,purchased,purchase_cost])?;
            }
            transaction.execute(
                "DELETE FROM stock_movements WHERE purchase_id=?1",
                params![id],
            )?;
            transaction.execute("DELETE FROM expenses WHERE purchase_id=?1", params![id])?;
            let changed = transaction.execute("DELETE FROM purchases WHERE id=?1", params![id])?;
            if changed == 0 {
                return Err(DatabaseError::InvalidOperation(
                    "The purchase no longer exists".into(),
                ));
            }
            transaction.commit()?;
            return Ok(());
        }
        let (table, linked): (&str, i64) = match entity {
            "customer" => ("customers", self.connection.query_row("SELECT (SELECT COUNT(*) FROM quotations WHERE customer_id=?1)+(SELECT COUNT(*) FROM invoices WHERE customer_id=?1)+(SELECT COUNT(*) FROM jobs WHERE customer_id=?1)", params![id], |row| row.get(0))?),
            "invoice" => ("invoices", self.connection.query_row("SELECT COUNT(*) FROM payments WHERE invoice_id=?1", params![id], |row| row.get(0))?),
            "quotation" => ("quotations", self.connection.query_row("SELECT COUNT(*) FROM jobs WHERE quotation_id=?1", params![id], |row| row.get(0))?),
            "job" => ("jobs", self.connection.query_row("SELECT (SELECT COUNT(*) FROM invoices WHERE job_id=?1)+(SELECT COUNT(*) FROM expenses WHERE job_id=?1)+(SELECT COUNT(*) FROM stock_movements WHERE job_id=?1)", params![id], |row| row.get(0))?),
            "product" => ("products", self.connection.query_row("SELECT (SELECT COUNT(*) FROM quotation_items WHERE product_id=?1)+(SELECT COUNT(*) FROM invoice_items WHERE product_id=?1)", params![id], |row| row.get(0))?),
            "expense" => ("expenses", self.connection.query_row("SELECT CASE WHEN purchase_id IS NULL THEN 0 ELSE 1 END FROM expenses WHERE id=?1",params![id],|row|row.get(0))?),
            "material" => ("inventory_items", self.connection.query_row("SELECT (SELECT COUNT(*) FROM purchase_items WHERE inventory_item_id=?1)+(SELECT COUNT(*) FROM stock_movements WHERE inventory_item_id=?1)+(SELECT COUNT(*) FROM job_items WHERE inventory_item_id=?1)",params![id],|row|row.get(0))?),
            "supplier" => ("suppliers", self.connection.query_row("SELECT COUNT(*) FROM purchases WHERE supplier_id=?1",params![id],|row|row.get(0))?),
            "machine" => ("machines", { let name:String=self.connection.query_row("SELECT name FROM machines WHERE id=?1",params![id],|row|row.get(0))?; self.connection.query_row("SELECT COUNT(*) FROM jobs WHERE machine_name=?1",params![name],|row|row.get(0))? }),
            _ => return Err(DatabaseError::InvalidOperation("This record type cannot be deleted".to_string())),
        };
        if linked > 0 {
            return Err(DatabaseError::InvalidOperation(format!("This {entity} is linked to {linked} business record(s). Keep it for accurate history, or remove those links first.")));
        }
        let changed = self
            .connection
            .execute(&format!("DELETE FROM {table} WHERE id=?1"), params![id])?;
        if changed == 0 {
            return Err(DatabaseError::InvalidOperation(
                "The record no longer exists".to_string(),
            ));
        }
        Ok(())
    }
    pub fn set_recovery_code(&self, user_id: &str, code: &str) -> Result<(), DatabaseError> {
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(code.as_bytes(), &salt)
            .map_err(|_| {
                DatabaseError::InvalidOperation("Recovery code could not be secured".into())
            })?
            .to_string();
        let changed=self.connection.execute("UPDATE users SET recovery_hash=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND role='owner'",params![user_id,hash])?;
        if changed == 0 {
            return Err(DatabaseError::InvalidOperation(
                "Only an owner account can create a recovery code".into(),
            ));
        }
        Ok(())
    }
    pub fn reset_password_with_recovery(
        &self,
        username: &str,
        code: &str,
        new_password: &str,
    ) -> Result<(), DatabaseError> {
        if new_password.len() < 6 {
            return Err(DatabaseError::InvalidOperation(
                "New password must contain at least 6 characters".into(),
            ));
        }
        let result=self.connection.query_row("SELECT id,recovery_hash,is_active FROM users WHERE username=?1 COLLATE NOCASE AND role='owner'",params![username.trim()],|row|Ok((row.get::<_,String>(0)?,row.get::<_,Option<String>>(1)?,row.get::<_,bool>(2)?))).optional()?;
        let (id, recovery_hash, is_active) = result.ok_or_else(|| {
            DatabaseError::InvalidOperation("Owner account or recovery code is incorrect".into())
        })?;
        if !is_active {
            return Err(DatabaseError::InvalidOperation(
                "This owner account is disabled".into(),
            ));
        }
        let hash = recovery_hash.ok_or_else(|| {
            DatabaseError::InvalidOperation(
                "No recovery code has been created for this owner account".into(),
            )
        })?;
        let parsed = PasswordHash::new(&hash)
            .map_err(|_| DatabaseError::InvalidOperation("Recovery data is invalid".into()))?;
        if Argon2::default()
            .verify_password(code.trim().to_uppercase().as_bytes(), &parsed)
            .is_err()
        {
            return Err(DatabaseError::InvalidOperation(
                "Owner account or recovery code is incorrect".into(),
            ));
        }
        let salt = SaltString::generate(&mut OsRng);
        let password_hash = Argon2::default()
            .hash_password(new_password.as_bytes(), &salt)
            .map_err(|_| {
                DatabaseError::InvalidOperation("New password could not be secured".into())
            })?
            .to_string();
        self.connection.execute(
            "UPDATE users SET password_hash=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1",
            params![id, password_hash],
        )?;
        Ok(())
    }
    pub fn has_users(&self) -> Result<bool, DatabaseError> {
        self.connection
            .query_row("SELECT COUNT(*)>0 FROM users", [], |row| row.get(0))
            .map_err(Into::into)
    }
    pub fn list_users(&self) -> Result<Vec<User>, DatabaseError> {
        let mut statement=self.connection.prepare("SELECT id,full_name,username,role,phone,is_active,last_login_at FROM users ORDER BY is_active DESC,full_name COLLATE NOCASE")?;
        let rows = statement.query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                full_name: row.get(1)?,
                username: row.get(2)?,
                role: row.get(3)?,
                phone: row.get(4)?,
                is_active: row.get(5)?,
                last_login_at: row.get(6)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
    pub fn save_user(&self, input: UserInput) -> Result<User, DatabaseError> {
        const ROLES: [&str; 6] = [
            "owner",
            "manager",
            "accountant",
            "designer",
            "operator",
            "cashier",
        ];
        if !ROLES.contains(&input.role.as_str()) {
            return Err(DatabaseError::InvalidOperation(
                "Invalid employee role".to_string(),
            ));
        }
        if input.username.trim().len() < 3 {
            return Err(DatabaseError::InvalidOperation(
                "Username must contain at least 3 characters".to_string(),
            ));
        }
        let id = input
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        if input.id.is_none() && input.password.len() < 6 {
            return Err(DatabaseError::InvalidOperation(
                "Password must contain at least 6 characters".to_string(),
            ));
        }
        if input.id.is_some() && input.password.is_empty() {
            self.connection.execute("UPDATE users SET full_name=?2,username=?3,role=?4,phone=?5,is_active=?6,updated_at=CURRENT_TIMESTAMP WHERE id=?1",params![id,input.full_name.trim(),input.username.trim(),input.role,input.phone.trim(),input.is_active])?;
        } else {
            let salt = SaltString::generate(&mut OsRng);
            let hash = Argon2::default()
                .hash_password(input.password.as_bytes(), &salt)
                .map_err(|_| {
                    DatabaseError::InvalidOperation("Password could not be secured".to_string())
                })?
                .to_string();
            self.connection.execute("INSERT INTO users(id,full_name,username,password_hash,role,phone,is_active) VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name,username=excluded.username,password_hash=excluded.password_hash,role=excluded.role,phone=excluded.phone,is_active=excluded.is_active,updated_at=CURRENT_TIMESTAMP",params![id,input.full_name.trim(),input.username.trim(),hash,input.role,input.phone.trim(),input.is_active])?;
        }
        self.connection.query_row("SELECT id,full_name,username,role,phone,is_active,last_login_at FROM users WHERE id=?1",params![id],|row|Ok(User{id:row.get(0)?,full_name:row.get(1)?,username:row.get(2)?,role:row.get(3)?,phone:row.get(4)?,is_active:row.get(5)?,last_login_at:row.get(6)?})).map_err(Into::into)
    }
    pub fn authenticate(&self, username: &str, password: &str) -> Result<User, DatabaseError> {
        let result=self.connection.query_row("SELECT id,full_name,username,password_hash,role,phone,is_active,last_login_at FROM users WHERE username=?1 COLLATE NOCASE",params![username.trim()],|row|Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?,row.get::<_,String>(2)?,row.get::<_,String>(3)?,row.get::<_,String>(4)?,row.get::<_,String>(5)?,row.get::<_,bool>(6)?,row.get::<_,Option<String>>(7)?))).optional()?;
        let (id, full_name, username, hash, role, phone, is_active, last_login_at) = result
            .ok_or_else(|| {
                DatabaseError::InvalidOperation("Incorrect username or password".to_string())
            })?;
        if !is_active {
            return Err(DatabaseError::InvalidOperation(
                "This account has been disabled".to_string(),
            ));
        }
        let parsed = PasswordHash::new(&hash).map_err(|_| {
            DatabaseError::InvalidOperation("Account password data is invalid".to_string())
        })?;
        if Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_err()
        {
            return Err(DatabaseError::InvalidOperation(
                "Incorrect username or password".to_string(),
            ));
        }
        self.connection.execute(
            "UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?1",
            params![id],
        )?;
        Ok(User {
            id: Some(id),
            full_name,
            username,
            role,
            phone,
            is_active,
            last_login_at,
        })
    }

    pub fn save_quotation(&mut self, mut quotation: Quotation) -> Result<Quotation, DatabaseError> {
        let transaction = self.connection.transaction()?;
        let id = quotation
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let number = match quotation.quotation_number.clone() {
            Some(number) if !number.is_empty() => number,
            _ => {
                let sequence: i64 =
                    transaction
                        .query_row("SELECT COUNT(*) + 1 FROM quotations", [], |row| row.get(0))?;
                format!("QT-{:05}", sequence)
            }
        };
        transaction.execute("INSERT INTO quotations (id, quotation_number, customer_id, status, issue_date, valid_until, subtotal, discount, tax, total, notes, terms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12) ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id, status=excluded.status, issue_date=excluded.issue_date, valid_until=excluded.valid_until, subtotal=excluded.subtotal, discount=excluded.discount, tax=excluded.tax, total=excluded.total, notes=excluded.notes, terms=excluded.terms, updated_at=CURRENT_TIMESTAMP", params![id, number, quotation.customer_id, quotation.status, quotation.issue_date, quotation.valid_until, quotation.subtotal, quotation.discount, quotation.tax, quotation.total, quotation.notes, quotation.terms])?;
        transaction.execute(
            "DELETE FROM quotation_items WHERE quotation_id=?1",
            params![id],
        )?;
        for (position, item) in quotation.items.iter_mut().enumerate() {
            let item_id = item
                .id
                .clone()
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            transaction.execute("INSERT INTO quotation_items (id, quotation_id, product_id, description, quantity, width, height, unit, unit_price, total, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)", params![item_id, id, item.product_id, item.description, item.quantity, item.width, item.height, item.unit, item.unit_price, item.total, position as i64])?;
            item.id = Some(item_id);
        }
        transaction.commit()?;
        quotation.id = Some(id);
        quotation.quotation_number = Some(number);
        Ok(quotation)
    }

    #[allow(dead_code)]
    pub fn path(&self) -> &Path {
        &self.path
    }
}
