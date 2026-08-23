#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use database::{
    AuditEntry, BackupInfo, BusinessProfile, Customer, DashboardSummary, Database, Expense,
    FinanceSummary, InventoryItem, Invoice, Job, Machine, Payment, Product, Purchase, Quotation,
    StockUsage, Supplier, SupplierPayment, User, UserInput,
};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs,
    io::{Read, Write},
    net::{TcpListener, UdpSocket},
    path::Path,
    process::Command,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::Manager;

const DROPBOX_APP_KEY: &str = "m541makcv13db7u";
const DROPBOX_REDIRECT_URI: &str = "http://127.0.0.1:53682/oauth/callback";
const DROPBOX_KEYRING_SERVICE: &str = "com.qatlex.printmanager.dropbox";

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DropboxConnection {
    connected: bool,
    display_name: Option<String>,
    email: Option<String>,
}
#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DropboxBackup {
    name: String,
    size: u64,
    modified: String,
}
#[derive(serde::Deserialize)]
struct DropboxToken {
    access_token: String,
    refresh_token: Option<String>,
}
#[derive(serde::Deserialize)]
struct DropboxAccount {
    name: DropboxName,
    email: String,
}
#[derive(serde::Deserialize)]
struct DropboxName {
    display_name: String,
}

fn dropbox_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(DROPBOX_KEYRING_SERVICE, "oauth-refresh-token")
        .map_err(|error| error.to_string())
}
fn dropbox_refresh_token() -> Result<String, String> {
    dropbox_entry()?
        .get_password()
        .map_err(|_| "Dropbox is not connected".to_string())
}
fn dropbox_access_token() -> Result<String, String> {
    let refresh = dropbox_refresh_token()?;
    let response = reqwest::blocking::Client::new()
        .post("https://api.dropboxapi.com/oauth2/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh.as_str()),
            ("client_id", DROPBOX_APP_KEY),
        ])
        .send()
        .map_err(|error| format!("Could not reach Dropbox: {error}"))?;
    if !response.status().is_success() {
        return Err("Dropbox connection expired. Please connect it again.".into());
    }
    response
        .json::<DropboxToken>()
        .map(|token| token.access_token)
        .map_err(|error| error.to_string())
}
fn dropbox_account_with_token(token: &str) -> Result<DropboxConnection, String> {
    let response = reqwest::blocking::Client::new()
        .post("https://api.dropboxapi.com/2/users/get_current_account")
        .bearer_auth(token)
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err("Dropbox could not verify this account".into());
    }
    let account = response
        .json::<DropboxAccount>()
        .map_err(|error| error.to_string())?;
    Ok(DropboxConnection {
        connected: true,
        display_name: Some(account.name.display_name),
        email: Some(account.email),
    })
}

#[tauri::command]
fn dropbox_status() -> Result<DropboxConnection, String> {
    match dropbox_access_token() {
        Ok(token) => dropbox_account_with_token(&token),
        Err(_) => Ok(DropboxConnection {
            connected: false,
            display_name: None,
            email: None,
        }),
    }
}

#[tauri::command]
fn connect_dropbox() -> Result<DropboxConnection, String> {
    let mut verifier_bytes = [0u8; 48];
    getrandom::fill(&mut verifier_bytes).expect("OS random source unavailable");
    let verifier = URL_SAFE_NO_PAD.encode(verifier_bytes);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let state = uuid::Uuid::new_v4().simple().to_string();
    let mut authorize = url::Url::parse("https://www.dropbox.com/oauth2/authorize")
        .map_err(|error| error.to_string())?;
    authorize
        .query_pairs_mut()
        .append_pair("client_id", DROPBOX_APP_KEY)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", DROPBOX_REDIRECT_URI)
        .append_pair("token_access_type", "offline")
        .append_pair("code_challenge_method", "S256")
        .append_pair("code_challenge", &challenge)
        .append_pair("state", &state);
    let listener = TcpListener::bind("127.0.0.1:53682")
        .map_err(|_| "Dropbox sign-in is already open. Close it and try again.".to_string())?;
    Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", authorize.as_str()])
        .spawn()
        .map_err(|error| format!("Could not open your default browser: {error}"))?;
    let (mut stream, _) = listener.accept().map_err(|error| error.to_string())?;
    stream.set_read_timeout(Some(Duration::from_secs(10))).ok();
    let mut request = [0u8; 8192];
    let read = stream
        .read(&mut request)
        .map_err(|error| error.to_string())?;
    let first = String::from_utf8_lossy(&request[..read])
        .lines()
        .next()
        .unwrap_or("")
        .to_string();
    let target = first
        .split_whitespace()
        .nth(1)
        .ok_or("Dropbox returned an invalid response")?;
    let callback =
        url::Url::parse(&format!("http://localhost{target}")).map_err(|error| error.to_string())?;
    let values: std::collections::HashMap<_, _> = callback.query_pairs().into_owned().collect();
    let valid_state = values.get("state").map(String::as_str) == Some(state.as_str());
    let code = values.get("code").cloned();
    let error = values
        .get("error_description")
        .or_else(|| values.get("error"))
        .cloned();
    let success = code.is_some() && valid_state;
    let body = if success {
        "<html><body style='font-family:Segoe UI;padding:48px;color:#174a40'><h2>Dropbox connected</h2><p>You can close this window and return to PrintManager.</p></body></html>"
    } else {
        "<html><body style='font-family:Segoe UI;padding:48px'><h2>Connection was not completed</h2><p>Return to PrintManager and try again.</p></body></html>"
    };
    let reply=format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",body.len(),body);
    let _ = stream.write_all(reply.as_bytes());
    if let Some(message) = error {
        return Err(message);
    }
    if !valid_state {
        return Err("Dropbox sign-in security check failed".into());
    }
    let code = code.ok_or("Dropbox sign-in was cancelled")?;
    let response = reqwest::blocking::Client::new()
        .post("https://api.dropboxapi.com/oauth2/token")
        .form(&[
            ("code", code.as_str()),
            ("grant_type", "authorization_code"),
            ("client_id", DROPBOX_APP_KEY),
            ("redirect_uri", DROPBOX_REDIRECT_URI),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Dropbox rejected the sign-in. Confirm that {DROPBOX_REDIRECT_URI} is registered in the Dropbox App Console."));
    }
    let token = response
        .json::<DropboxToken>()
        .map_err(|error| error.to_string())?;
    let refresh = token
        .refresh_token
        .ok_or("Dropbox did not provide offline backup access")?;
    dropbox_entry()?
        .set_password(&refresh)
        .map_err(|error| error.to_string())?;
    dropbox_account_with_token(&token.access_token)
}

#[tauri::command]
fn disconnect_dropbox() -> Result<(), String> {
    let entry = dropbox_entry()?;
    let _ = entry.delete_credential();
    Ok(())
}
fn dropbox_upload_file(path: &Path) -> Result<DropboxBackup, String> {
    let token = dropbox_access_token()?;
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("Invalid backup file name")?;
    let args =
        serde_json::json!({"path":format!("/{name}"),"mode":"add","autorename":true,"mute":false})
            .to_string();
    let response = reqwest::blocking::Client::new()
        .post("https://content.dropboxapi.com/2/files/upload")
        .bearer_auth(token)
        .header("Dropbox-API-Arg", args)
        .header("Content-Type", "application/octet-stream")
        .body(bytes)
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(
            "Dropbox could not upload this backup. Check storage space and try again.".into(),
        );
    }
    let value = response
        .json::<serde_json::Value>()
        .map_err(|error| error.to_string())?;
    Ok(DropboxBackup {
        name: value["name"].as_str().unwrap_or(name).to_string(),
        size: value["size"].as_u64().unwrap_or(0),
        modified: value["server_modified"].as_str().unwrap_or("").to_string(),
    })
}
#[tauri::command]
fn create_dropbox_backup(
    app: tauri::AppHandle,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<DropboxBackup, String> {
    let path = create_encrypted_backup(app, password, None, state)?;
    dropbox_upload_file(Path::new(&path))
}
#[tauri::command]
fn list_dropbox_backups() -> Result<Vec<DropboxBackup>, String> {
    let token = dropbox_access_token()?;
    let response = reqwest::blocking::Client::new()
        .post("https://api.dropboxapi.com/2/files/list_folder")
        .bearer_auth(token)
        .json(&serde_json::json!({"path":"","recursive":false}))
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err("Dropbox backup history could not be loaded".into());
    }
    let value = response
        .json::<serde_json::Value>()
        .map_err(|error| error.to_string())?;
    let mut backups = value["entries"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|item| {
            let name = item["name"].as_str()?;
            if !name.ends_with(".pmbak") {
                return None;
            }
            Some(DropboxBackup {
                name: name.into(),
                size: item["size"].as_u64().unwrap_or(0),
                modified: item["server_modified"].as_str().unwrap_or("").into(),
            })
        })
        .collect::<Vec<_>>();
    backups.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(backups)
}
fn dropbox_download(name: &str) -> Result<Vec<u8>, String> {
    if Path::new(name).file_name().and_then(|value| value.to_str()) != Some(name)
        || !name.ends_with(".pmbak")
    {
        return Err("Invalid Dropbox backup name".into());
    }
    let token = dropbox_access_token()?;
    let args = serde_json::json!({"path":format!("/{name}")}).to_string();
    let response = reqwest::blocking::Client::new()
        .post("https://content.dropboxapi.com/2/files/download")
        .bearer_auth(token)
        .header("Dropbox-API-Arg", args)
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err("Dropbox could not download this backup".into());
    }
    response
        .bytes()
        .map(|bytes| bytes.to_vec())
        .map_err(|error| error.to_string())
}
#[tauri::command]
fn restore_dropbox_backup(
    app: tauri::AppHandle,
    name: String,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    require_management(&state)?;
    let package = dropbox_download(&name)?;
    let directory = backup_directory(&app)?;
    fs::write(directory.join(&name), package).map_err(|error| error.to_string())?;
    restore_encrypted_backup(app, name, password, state)
}
#[tauri::command]
fn recover_dropbox_backup(
    app: tauri::AppHandle,
    name: String,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let package = dropbox_download(&name)?;
    recover_encrypted_package(app, package, password, state)
}

struct AppState {
    database: Arc<Mutex<Database>>,
    current_user: Mutex<Option<User>>,
    network_session: Mutex<Option<String>>,
}

const COMPANY_NETWORK_PORT: u16 = 47831;

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct CompanyNetworkConfig { mode: String, server_address: String, join_code: String }

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CompanyNetworkStatus { mode: String, server_address: String, join_code: String, connected: bool, message: String }

fn network_config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_local_data_dir().map(|p| p.join("company-network.json")).map_err(|e| e.to_string())
}
fn read_network_config(app: &tauri::AppHandle) -> CompanyNetworkConfig {
    network_config_path(app).ok().and_then(|p| fs::read_to_string(p).ok()).and_then(|v| serde_json::from_str(&v).ok()).unwrap_or_default()
}
fn local_network_address() -> String {
    UdpSocket::bind("0.0.0.0:0").and_then(|socket| { socket.connect("8.8.8.8:80")?; socket.local_addr() })
        .map(|address| format!("{}:{}", address.ip(), COMPANY_NETWORK_PORT)).unwrap_or_else(|_| format!("127.0.0.1:{COMPANY_NETWORK_PORT}"))
}
fn rpc_result<T: serde::Serialize>(result: Result<T, database::DatabaseError>) -> serde_json::Value {
    match result { Ok(value) => serde_json::json!({"ok":true,"data":value}), Err(error) => serde_json::json!({"ok":false,"error":error.to_string()}) }
}
fn rpc_action_allowed(user: &User, action: &str) -> bool {
    if matches!(user.role.as_str(), "owner" | "manager") { return true; }
    if action.ends_with(".list") || matches!(action, "business.get" | "dashboard.get" | "quotations.get" | "invoices.get") { return true; }
    match user.role.as_str() {
        "accountant" => matches!(action, "customers.list" | "products.list" | "jobs.list" | "quotations.list" | "quotations.get" | "invoices.list" | "invoices.get" | "invoices.save" | "payments.list" | "payments.save" | "expenses.list" | "expenses.save" | "finance.get" | "records.delete"),
        "sales" | "cashier" => matches!(action, "customers.list" | "customers.save" | "products.list" | "jobs.list" | "jobs.save" | "quotations.list" | "quotations.get" | "quotations.save" | "quotations.status" | "quotations.convert" | "invoices.list" | "invoices.get" | "invoices.save" | "payments.list" | "payments.save" | "records.delete"),
        "designer" => matches!(action, "customers.list" | "customers.save" | "products.list" | "jobs.list" | "jobs.save" | "jobs.status" | "quotations.list" | "quotations.get" | "quotations.save" | "quotations.status" | "machines.list" | "inventory.list" | "records.delete"),
        "operator" => matches!(action, "jobs.list" | "jobs.save" | "jobs.status" | "machines.list" | "inventory.list" | "stock.consume"),
        "quality" => matches!(action, "jobs.list" | "jobs.status" | "machines.list"),
        "storekeeper" => matches!(action, "jobs.list" | "expenses.list" | "expenses.save" | "suppliers.list" | "suppliers.save" | "inventory.list" | "inventory.save" | "purchases.list" | "purchases.save" | "purchases.payment" | "stock.consume" | "records.delete"),
        "delivery" => matches!(action, "customers.list" | "jobs.list" | "jobs.status"),
        _ => false,
    }
}
fn start_company_health_server(join_code: String, database: Arc<Mutex<Database>>) -> Result<(), String> {
    let listener = TcpListener::bind(("0.0.0.0", COMPANY_NETWORK_PORT)).map_err(|e| format!("Company server could not start on port {COMPANY_NETWORK_PORT}: {e}"))?;
    let sessions: Arc<Mutex<HashMap<String, User>>> = Arc::new(Mutex::new(HashMap::new()));
    std::thread::spawn(move || for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let _ = stream.set_read_timeout(Some(Duration::from_secs(8)));
        let mut bytes = Vec::new();
        let mut chunk = [0u8; 8192];
        loop {
            let count = stream.read(&mut chunk).unwrap_or(0);
            if count == 0 { break; }
            bytes.extend_from_slice(&chunk[..count]);
            if bytes.len() > 2 * 1024 * 1024 { break; }
            if let Some(split) = bytes.windows(4).position(|part| part == b"\r\n\r\n") {
                let headers = String::from_utf8_lossy(&bytes[..split]);
                let content_length = headers.lines().find_map(|line| line.strip_prefix("Content-Length:").or_else(||line.strip_prefix("content-length:")).and_then(|v|v.trim().parse::<usize>().ok())).unwrap_or(0);
                if bytes.len() >= split + 4 + content_length { break; }
            }
        }
        let request = String::from_utf8_lossy(&bytes);
        let authorised = request.lines().any(|line| line.trim().eq_ignore_ascii_case(&format!("X-PrintManager-Code: {join_code}")));
        let (status, body) = if request.starts_with("GET /health ") && authorised { ("200 OK", serde_json::json!({"connected":true,"service":"PrintManager Company Server"}).to_string()) }
        else if request.starts_with("POST /rpc ") && authorised {
            let payload = request.split("\r\n\r\n").nth(1).and_then(|body| serde_json::from_str::<serde_json::Value>(body).ok()).unwrap_or_default();
            let action = payload["action"].as_str().unwrap_or("");
            let input = payload.get("payload").cloned().unwrap_or_default();
            let session_token = request.lines().find_map(|line| line.strip_prefix("X-PrintManager-Session:").or_else(||line.strip_prefix("x-printmanager-session:")).map(str::trim)).unwrap_or("");
            let session_user = sessions.lock().ok().and_then(|items| items.get(session_token).cloned());
            let public_action = matches!(action, "login" | "business.get" | "users.has" | "password.reset" | "account.owner_create");
            let response = if !public_action && session_user.is_none() { serde_json::json!({"ok":false,"error":"Your company session expired. Sign in again."}) }
            else if !public_action && !rpc_action_allowed(session_user.as_ref().unwrap(), action) { serde_json::json!({"ok":false,"error":"Your employee role does not permit this action."}) }
            else { match database.lock() {
                Ok(mut db) => match action {
                    "login" => match db.authenticate(input["username"].as_str().unwrap_or(""), input["password"].as_str().unwrap_or("")) { Ok(user) => { let token=uuid::Uuid::new_v4().simple().to_string();if let Ok(mut items)=sessions.lock(){items.insert(token.clone(),user.clone());}serde_json::json!({"ok":true,"data":{"user":user,"sessionToken":token}}) }, Err(error)=>serde_json::json!({"ok":false,"error":error.to_string()}) },
                    "business.get" => rpc_result(db.get_business_profile()),
                    "business.save" => serde_json::from_value::<BusinessProfile>(input).map_err(|e| e.to_string()).map_or_else(|e|serde_json::json!({"ok":false,"error":e}),|v|rpc_result(db.save_business_profile(v))),
                    "customers.list" => rpc_result(db.list_customers(input["search"].as_str().unwrap_or(""))),
                    "customers.save" => serde_json::from_value::<Customer>(input).map_err(|e| e.to_string()).map_or_else(|e|serde_json::json!({"ok":false,"error":e}),|v|rpc_result(db.save_customer(v))),
                    "jobs.list" => rpc_result(db.list_jobs(input["search"].as_str().unwrap_or(""))),
                    "jobs.save" => serde_json::from_value::<Job>(input).map_err(|e| e.to_string()).map_or_else(|e|serde_json::json!({"ok":false,"error":e}),|v|rpc_result(db.save_job(v))),
                    "jobs.status" => rpc_result(db.update_job_status(input["id"].as_str().unwrap_or(""), input["status"].as_str().unwrap_or(""))),
                    "users.list" => rpc_result(db.list_users()),
                    "users.save" => serde_json::from_value::<UserInput>(input).map_err(|e| e.to_string()).map_or_else(|e|serde_json::json!({"ok":false,"error":e}),|v|rpc_result(db.save_user(v))),
                    "users.has" => rpc_result(db.has_users()),
                    "products.list" => rpc_result(db.list_products(input["search"].as_str().unwrap_or(""))),
                    "products.save" => serde_json::from_value::<Product>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_product(v))),
                    "quotations.list" => rpc_result(db.list_quotations()),
                    "quotations.get" => rpc_result(db.get_quotation(input["id"].as_str().unwrap_or(""))),
                    "quotations.save" => serde_json::from_value::<Quotation>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_quotation(v))),
                    "quotations.status" => rpc_result(db.update_quotation_status(input["id"].as_str().unwrap_or(""),input["status"].as_str().unwrap_or(""))),
                    "quotations.convert" => rpc_result(db.convert_quotation_to_job(input["id"].as_str().unwrap_or(""))),
                    "machines.list" => rpc_result(db.list_machines()),
                    "machines.save" => serde_json::from_value::<Machine>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_machine(v))),
                    "invoices.list" => rpc_result(db.list_invoices()),
                    "invoices.get" => rpc_result(db.get_invoice(input["id"].as_str().unwrap_or(""))),
                    "invoices.save" => serde_json::from_value::<Invoice>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_invoice(v))),
                    "payments.list" => rpc_result(db.list_payments(input["invoiceId"].as_str().unwrap_or(""))),
                    "payments.save" => serde_json::from_value::<Payment>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.record_payment(v))),
                    "dashboard.get" => rpc_result(db.dashboard_summary()),
                    "expenses.list" => rpc_result(db.list_expenses(input["search"].as_str().unwrap_or(""))),
                    "expenses.save" => serde_json::from_value::<Expense>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_expense(v))),
                    "finance.get" => rpc_result(db.finance_summary(input["fromDate"].as_str().unwrap_or(""),input["toDate"].as_str().unwrap_or(""))),
                    "suppliers.list" => rpc_result(db.list_suppliers()),
                    "suppliers.save" => serde_json::from_value::<Supplier>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_supplier(v))),
                    "inventory.list" => rpc_result(db.list_inventory()),
                    "inventory.save" => serde_json::from_value::<InventoryItem>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.save_inventory_item(v))),
                    "purchases.list" => rpc_result(db.list_purchases()),
                    "purchases.save" => serde_json::from_value::<Purchase>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.record_purchase(v))),
                    "purchases.payment" => serde_json::from_value::<SupplierPayment>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.record_supplier_payment(v))),
                    "stock.consume" => serde_json::from_value::<StockUsage>(input).map_or_else(|e|serde_json::json!({"ok":false,"error":e.to_string()}),|v|rpc_result(db.consume_stock(v))),
                    "records.delete" => rpc_result(db.delete_record(input["entity"].as_str().unwrap_or(""),input["id"].as_str().unwrap_or(""))),
                    "audit.list" => rpc_result(db.list_audit_entries(input["limit"].as_i64().unwrap_or(100))),
                    "password.reset" => rpc_result(db.reset_password_with_recovery(input["username"].as_str().unwrap_or(""),input["recoveryCode"].as_str().unwrap_or(""),input["newPassword"].as_str().unwrap_or(""))),
                    "recovery.generate" => { let user=session_user.as_ref().unwrap();if user.role!="owner"{serde_json::json!({"ok":false,"error":"Only the owner can create a recovery code"})}else{let raw=uuid::Uuid::new_v4().simple().to_string().to_uppercase();let code=format!("{}-{}",&raw[..8],&raw[8..16]);match user.id.as_deref(){Some(id)=>match db.set_recovery_code(id,&code){Ok(())=>serde_json::json!({"ok":true,"data":code}),Err(error)=>serde_json::json!({"ok":false,"error":error.to_string()})},None=>serde_json::json!({"ok":false,"error":"Owner account is invalid"})}}},
                    "account.owner_create" => { let owner=db.authenticate(input["ownerUsername"].as_str().unwrap_or(""),input["ownerPassword"].as_str().unwrap_or(""));match owner{Ok(owner) if owner.role=="owner"=>match serde_json::from_value::<UserInput>(input["input"].clone()){Ok(mut user_input)=>{if user_input.role=="owner"{user_input.role="manager".into()}rpc_result(db.save_user(user_input))},Err(error)=>serde_json::json!({"ok":false,"error":error.to_string()})},Ok(_)=>serde_json::json!({"ok":false,"error":"Only the owner can approve a new account"}),Err(error)=>serde_json::json!({"ok":false,"error":error.to_string()})}},
                    _ => serde_json::json!({"ok":false,"error":"This record type is not connected to the company server yet."}),
                },
                Err(_) => serde_json::json!({"ok":false,"error":"The company database is busy. Please try again."}),
            }};
            ("200 OK", response.to_string())
        }
        else if !authorised { ("401 Unauthorized", serde_json::json!({"connected":false,"error":"Incorrect company join code"}).to_string()) }
        else { ("404 Not Found", serde_json::json!({"connected":false,"error":"Not found"}).to_string()) };
        let response = format!("HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
        let _ = stream.write_all(response.as_bytes());
    });
    Ok(())
}
fn probe_company_server(address: &str, join_code: &str) -> Result<(), String> {
    let address = address.trim().trim_start_matches("http://").trim_end_matches('/');
    let response = reqwest::blocking::Client::builder().timeout(Duration::from_secs(4)).build().map_err(|e| e.to_string())?
        .get(format!("http://{address}/health")).header("X-PrintManager-Code", join_code).send()
        .map_err(|_| "The owner computer could not be reached. Confirm both computers use the same network and the server is running.".to_string())?;
    if response.status().is_success() { Ok(()) } else { Err("The company join code was rejected by the owner computer.".into()) }
}
#[tauri::command]
fn get_company_network_status(app: tauri::AppHandle) -> Result<CompanyNetworkStatus, String> {
    let config = read_network_config(&app);
    let connected = match config.mode.as_str() { "host" => !config.join_code.is_empty() && probe_company_server(&format!("127.0.0.1:{COMPANY_NETWORK_PORT}"), &config.join_code).is_ok(), "client" => probe_company_server(&config.server_address, &config.join_code).is_ok(), _ => false };
    Ok(CompanyNetworkStatus { mode: config.mode.clone(), server_address: if config.mode == "host" { local_network_address() } else { config.server_address }, join_code: config.join_code, connected, message: if connected { "Connected to the company workspace".into() } else { "This computer is using local data".into() } })
}
#[tauri::command]
fn configure_company_network(app: tauri::AppHandle, mode: String, server_address: String, join_code: String, state: tauri::State<'_, AppState>) -> Result<CompanyNetworkStatus, String> {
    if !matches!(mode.as_str(), "local" | "host" | "client") { return Err("Choose local, owner server, or employee computer mode.".into()); }
    let mut config = CompanyNetworkConfig { mode: mode.clone(), server_address: server_address.trim().to_string(), join_code: join_code.trim().to_uppercase() };
    if mode == "host" {
        if config.join_code.is_empty() { config.join_code = uuid::Uuid::new_v4().simple().to_string()[..8].to_uppercase(); }
        match start_company_health_server(config.join_code.clone(), state.database.clone()) { Ok(()) => (), Err(error) if error.contains("in use") || error.contains("used") => (), Err(error) => return Err(error) }
        config.server_address = local_network_address();
    } else if mode == "client" {
        if config.server_address.is_empty() || config.join_code.is_empty() { return Err("Enter the owner computer address and company join code.".into()); }
        probe_company_server(&config.server_address, &config.join_code)?;
    }
    let path = network_config_path(&app)?;
    if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    fs::write(path, serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    get_company_network_status(app)
}

#[tauri::command]
fn company_network_rpc(app: tauri::AppHandle, action: String, payload: serde_json::Value, state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let config = read_network_config(&app);
    if config.mode != "client" { return Err("This computer is not connected as an employee computer.".into()); }
    let address = config.server_address.trim().trim_start_matches("http://").trim_end_matches('/');
    let session=state.network_session.lock().map_err(|_|"The employee session is unavailable".to_string())?.clone().unwrap_or_default();
    let response = reqwest::blocking::Client::builder().timeout(Duration::from_secs(12)).build().map_err(|e| e.to_string())?
        .post(format!("http://{address}/rpc")).header("X-PrintManager-Code", config.join_code).header("X-PrintManager-Session",session).json(&serde_json::json!({"action":action,"payload":payload})).send()
        .map_err(|_| "Connection to the owner computer was lost.".to_string())?;
    let value: serde_json::Value = response.json().map_err(|e| format!("The company server returned an invalid response: {e}"))?;
    if value["ok"].as_bool() == Some(true) { let mut data=value.get("data").cloned().unwrap_or(serde_json::Value::Null);if action=="login"{if let Some(token)=data["sessionToken"].as_str(){*state.network_session.lock().map_err(|_|"The employee session is unavailable".to_string())?=Some(token.to_string());}data=data.get("user").cloned().unwrap_or(serde_json::Value::Null);}Ok(data) }
    else { Err(value["error"].as_str().unwrap_or("The company server rejected this request.").to_string()) }
}

#[tauri::command]
fn clear_company_network_session(state: tauri::State<'_, AppState>) -> Result<(), String> {
    *state.network_session.lock().map_err(|_| "The employee session is unavailable".to_string())? = None;
    Ok(())
}

fn require_management(state: &tauri::State<'_, AppState>) -> Result<(), String> {
    let session = state
        .current_user
        .lock()
        .map_err(|_| "The user session is unavailable".to_string())?;
    match session.as_ref().map(|user| user.role.as_str()) {
        Some("owner") | Some("manager") => Ok(()),
        _ => Err("Owner or manager permission is required".to_string()),
    }
}

#[tauri::command]
fn get_business_profile(
    state: tauri::State<'_, AppState>,
) -> Result<Option<BusinessProfile>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .get_business_profile()
        .map_err(Into::into)
}

#[tauri::command]
fn save_business_profile(
    profile: BusinessProfile,
    state: tauri::State<'_, AppState>,
) -> Result<BusinessProfile, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_business_profile(profile)
        .map_err(Into::into)
}

#[tauri::command]
fn create_local_backup(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let backup_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("backups");
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .create_backup(&backup_dir)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(Into::into)
}

fn backup_directory(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())
        .map(|path| path.join("backups"))
}
fn derive_backup_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    if password.len() < 8 {
        return Err("Use a backup password with at least 8 characters".into());
    }
    let mut key = [0u8; 32];
    argon2::Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|error| error.to_string())?;
    Ok(key)
}

#[tauri::command]
fn list_backups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<BackupInfo>, String> {
    let directory = backup_directory(&app)?;
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_backups(&directory)
        .map_err(Into::into)
}

#[tauri::command]
fn restore_local_backup(
    app: tauri::AppHandle,
    file_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    require_management(&state)?;
    let directory = backup_directory(&app)?;
    let mut database = state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?;
    database.create_backup(&directory).map_err(String::from)?;
    database
        .restore_backup(&directory, &file_name)
        .map_err(Into::into)
}

#[tauri::command]
fn create_encrypted_backup(
    app: tauri::AppHandle,
    password: String,
    sync_folder: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    require_management(&state)?;
    let directory = backup_directory(&app)?;
    let source = state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .create_backup(&directory)
        .map_err(String::from)?;
    let plain = fs::read(&source).map_err(|error| error.to_string())?;
    let mut salt = [0u8; 16];
    let mut nonce_bytes = [0u8; 12];
    getrandom::fill(&mut salt).expect("OS random source unavailable");
    getrandom::fill(&mut nonce_bytes).expect("OS random source unavailable");
    let key = derive_backup_key(&password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|error| error.to_string())?;
    let encrypted = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plain.as_ref())
        .map_err(|_| "Backup encryption failed".to_string())?;
    let mut package = b"PMBAK1".to_vec();
    package.extend_from_slice(&salt);
    package.extend_from_slice(&nonce_bytes);
    package.extend_from_slice(&encrypted);
    let name = format!(
        "printmanager-encrypted-{}.pmbak",
        chrono::Local::now().format("%Y-%m-%d-%H%M%S")
    );
    let destination = directory.join(&name);
    fs::write(&destination, &package).map_err(|error| error.to_string())?;
    if let Some(folder) = sync_folder.filter(|value| !value.trim().is_empty()) {
        let folder = Path::new(folder.trim());
        fs::create_dir_all(folder).map_err(|error| {
            format!("Backup was created locally, but the sync folder could not be opened: {error}")
        })?;
        fs::copy(&destination, folder.join(&name)).map_err(|error| {
            format!("Backup was created locally, but copying to the sync folder failed: {error}")
        })?;
    }
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn restore_encrypted_backup(
    app: tauri::AppHandle,
    file_name: String,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    require_management(&state)?;
    let safe = Path::new(&file_name)
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("Invalid backup file")?;
    if safe != file_name || !safe.ends_with(".pmbak") {
        return Err("Invalid encrypted backup file".into());
    }
    let directory = backup_directory(&app)?;
    let package = fs::read(directory.join(safe)).map_err(|error| error.to_string())?;
    if package.len() < 50 || &package[..6] != b"PMBAK1" {
        return Err("This is not a valid PrintManager encrypted backup".into());
    }
    let key = derive_backup_key(&password, &package[6..22])?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|error| error.to_string())?;
    let plain = cipher
        .decrypt(Nonce::from_slice(&package[22..34]), &package[34..])
        .map_err(|_| "Incorrect backup password or damaged archive".to_string())?;
    let temporary_name = format!("restore-{}.db", uuid::Uuid::new_v4());
    let temporary_path = directory.join(&temporary_name);
    fs::write(&temporary_path, plain).map_err(|error| error.to_string())?;
    let result = (|| {
        let mut database = state
            .database
            .lock()
            .map_err(|_| "The local database is temporarily unavailable".to_string())?;
        database.create_backup(&directory).map_err(String::from)?;
        database
            .restore_backup(&directory, &temporary_name)
            .map_err(String::from)
    })();
    let _ = fs::remove_file(temporary_path);
    result
}

#[tauri::command]
fn recover_encrypted_package(
    app: tauri::AppHandle,
    package: Vec<u8>,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let directory = backup_directory(&app)?;
    {
        let database = state
            .database
            .lock()
            .map_err(|_| "The local database is temporarily unavailable".to_string())?;
        if database.has_users().map_err(String::from)? {
            return Err(
                "Recovery from startup is only available before a company account exists".into(),
            );
        }
    }
    if package.len() < 50 || &package[..6] != b"PMBAK1" {
        return Err("This is not a valid PrintManager encrypted backup".into());
    }
    let key = derive_backup_key(&password, &package[6..22])?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|error| error.to_string())?;
    let plain = cipher
        .decrypt(Nonce::from_slice(&package[22..34]), &package[34..])
        .map_err(|_| "Incorrect backup password or damaged archive".to_string())?;
    let temporary_name = format!("recovery-{}.db", uuid::Uuid::new_v4());
    let temporary_path = directory.join(&temporary_name);
    fs::write(&temporary_path, plain).map_err(|error| error.to_string())?;
    let result = state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .restore_backup(&directory, &temporary_name)
        .map_err(String::from);
    let _ = fs::remove_file(temporary_path);
    result
}

#[tauri::command]
fn recover_database_file(
    app: tauri::AppHandle,
    database_file: Vec<u8>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let directory = backup_directory(&app)?;
    if database_file.len() < 100 || &database_file[..16] != b"SQLite format 3\0" { return Err("The selected file is not a valid SQLite database.".into()); }
    let temporary_name = format!("recovery-{}.db", uuid::Uuid::new_v4());
    let temporary_path = directory.join(&temporary_name);
    fs::write(&temporary_path, database_file).map_err(|error| error.to_string())?;
    let result = state.database.lock().map_err(|_| "The local database is temporarily unavailable".to_string())?.restore_backup(&directory, &temporary_name).map_err(String::from);
    let _ = fs::remove_file(temporary_path);
    result
}

#[tauri::command]
fn list_customers(
    search: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Customer>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_customers(&search)
        .map_err(Into::into)
}

#[tauri::command]
fn save_customer(
    customer: Customer,
    state: tauri::State<'_, AppState>,
) -> Result<Customer, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_customer(customer)
        .map_err(Into::into)
}

#[tauri::command]
fn delete_record(
    entity: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    require_management(&state)?;
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .delete_record(&entity, &id)
        .map_err(Into::into)
}

#[tauri::command]
fn list_products(
    search: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_products(&search)
        .map_err(Into::into)
}

#[tauri::command]
fn save_product(product: Product, state: tauri::State<'_, AppState>) -> Result<Product, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_product(product)
        .map_err(Into::into)
}

#[tauri::command]
fn list_quotations(state: tauri::State<'_, AppState>) -> Result<Vec<Quotation>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_quotations()
        .map_err(Into::into)
}

#[tauri::command]
fn save_quotation(
    quotation: Quotation,
    state: tauri::State<'_, AppState>,
) -> Result<Quotation, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_quotation(quotation)
        .map_err(Into::into)
}

#[tauri::command]
fn get_quotation(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Option<Quotation>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .get_quotation(&id)
        .map_err(Into::into)
}

#[tauri::command]
fn update_quotation_status(
    id: String,
    status: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    const ALLOWED: [&str; 5] = ["draft", "sent", "accepted", "rejected", "expired"];
    if !ALLOWED.contains(&status.as_str()) {
        return Err("Invalid quotation status".to_string());
    }
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .update_quotation_status(&id, &status)
        .map_err(Into::into)
}

#[tauri::command]
fn convert_quotation_to_job(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .convert_quotation_to_job(&id)
        .map_err(Into::into)
}

#[tauri::command]
fn list_jobs(search: String, state: tauri::State<'_, AppState>) -> Result<Vec<Job>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_jobs(&search)
        .map_err(Into::into)
}

#[tauri::command]
fn save_job(job: Job, state: tauri::State<'_, AppState>) -> Result<Job, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_job(job)
        .map_err(Into::into)
}

#[tauri::command]
fn update_job_status(
    id: String,
    status: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    const ALLOWED: [&str; 9] = [
        "new_order",
        "designing",
        "approval",
        "ready_to_print",
        "printing",
        "finishing",
        "quality_check",
        "ready",
        "delivered",
    ];
    if !ALLOWED.contains(&status.as_str()) {
        return Err("Invalid production stage".to_string());
    }
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .update_job_status(&id, &status)
        .map_err(Into::into)
}

#[tauri::command]
fn list_machines(state: tauri::State<'_, AppState>) -> Result<Vec<Machine>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_machines()
        .map_err(Into::into)
}
#[tauri::command]
fn save_machine(machine: Machine, state: tauri::State<'_, AppState>) -> Result<Machine, String> {
    require_management(&state)?;
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_machine(machine)
        .map_err(Into::into)
}

#[tauri::command]
fn list_invoices(state: tauri::State<'_, AppState>) -> Result<Vec<Invoice>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_invoices()
        .map_err(Into::into)
}

#[tauri::command]
fn save_invoice(invoice: Invoice, state: tauri::State<'_, AppState>) -> Result<Invoice, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_invoice(invoice)
        .map_err(Into::into)
}

#[tauri::command]
fn record_payment(payment: Payment, state: tauri::State<'_, AppState>) -> Result<Payment, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .record_payment(payment)
        .map_err(Into::into)
}

#[tauri::command]
fn get_dashboard_summary(state: tauri::State<'_, AppState>) -> Result<DashboardSummary, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .dashboard_summary()
        .map_err(Into::into)
}

#[tauri::command]
fn get_invoice(id: String, state: tauri::State<'_, AppState>) -> Result<Option<Invoice>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .get_invoice(&id)
        .map_err(Into::into)
}

#[tauri::command]
fn list_payments(
    invoice_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Payment>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_payments(&invoice_id)
        .map_err(Into::into)
}

#[tauri::command]
fn list_expenses(
    search: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Expense>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_expenses(&search)
        .map_err(Into::into)
}

#[tauri::command]
fn save_expense(expense: Expense, state: tauri::State<'_, AppState>) -> Result<Expense, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_expense(expense)
        .map_err(Into::into)
}

#[tauri::command]
fn get_finance_summary(
    from_date: String,
    to_date: String,
    state: tauri::State<'_, AppState>,
) -> Result<FinanceSummary, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .finance_summary(&from_date, &to_date)
        .map_err(Into::into)
}

#[tauri::command]
fn list_suppliers(state: tauri::State<'_, AppState>) -> Result<Vec<Supplier>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_suppliers()
        .map_err(Into::into)
}
#[tauri::command]
fn save_supplier(
    supplier: Supplier,
    state: tauri::State<'_, AppState>,
) -> Result<Supplier, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_supplier(supplier)
        .map_err(Into::into)
}
#[tauri::command]
fn list_inventory(state: tauri::State<'_, AppState>) -> Result<Vec<InventoryItem>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_inventory()
        .map_err(Into::into)
}
#[tauri::command]
fn save_inventory_item(
    item: InventoryItem,
    state: tauri::State<'_, AppState>,
) -> Result<InventoryItem, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_inventory_item(item)
        .map_err(Into::into)
}
#[tauri::command]
fn list_purchases(state: tauri::State<'_, AppState>) -> Result<Vec<Purchase>, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_purchases()
        .map_err(Into::into)
}
#[tauri::command]
fn record_purchase(
    purchase: Purchase,
    state: tauri::State<'_, AppState>,
) -> Result<Purchase, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .record_purchase(purchase)
        .map_err(Into::into)
}
#[tauri::command]
fn record_supplier_payment(
    payment: SupplierPayment,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .record_supplier_payment(payment)
        .map_err(Into::into)
}
#[tauri::command]
fn consume_stock(usage: StockUsage, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .consume_stock(usage)
        .map_err(Into::into)
}
#[tauri::command]
fn has_users(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .has_users()
        .map_err(Into::into)
}
#[tauri::command]
fn create_first_owner(input: UserInput, state: tauri::State<'_, AppState>) -> Result<User, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?;
    if database.has_users().map_err(String::from)? {
        return Err("The owner account has already been created".to_string());
    }
    if input.role != "owner" {
        return Err("The first account must be the owner".to_string());
    }
    database.save_user(input).map_err(Into::into)
}
#[tauri::command]
fn login(
    username: String,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<User, String> {
    let user = state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .authenticate(&username, &password)
        .map_err(String::from)?;
    *state
        .current_user
        .lock()
        .map_err(|_| "The user session is unavailable".to_string())? = Some(user.clone());
    Ok(user)
}
#[tauri::command]
fn logout(state: tauri::State<'_, AppState>) -> Result<(), String> {
    *state
        .current_user
        .lock()
        .map_err(|_| "The user session is unavailable".to_string())? = None;
    Ok(())
}
#[tauri::command]
fn reset_workspace(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .reset_workspace()
        .map_err(String::from)?;
    *state
        .current_user
        .lock()
        .map_err(|_| "The user session is unavailable".to_string())? = None;
    Ok(())
}
#[tauri::command]
fn current_user(state: tauri::State<'_, AppState>) -> Result<Option<User>, String> {
    Ok(state
        .current_user
        .lock()
        .map_err(|_| "The user session is unavailable".to_string())?
        .clone())
}
#[tauri::command]
fn list_users(state: tauri::State<'_, AppState>) -> Result<Vec<User>, String> {
    require_management(&state)?;
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_users()
        .map_err(Into::into)
}
#[tauri::command]
fn save_user(input: UserInput, state: tauri::State<'_, AppState>) -> Result<User, String> {
    require_management(&state)?;
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .save_user(input)
        .map_err(Into::into)
}
#[tauri::command]
fn list_audit_entries(
    limit: i64,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AuditEntry>, String> {
    require_management(&state)?;
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .list_audit_entries(limit)
        .map_err(Into::into)
}
#[tauri::command]
fn generate_recovery_code(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let user = state
        .current_user
        .lock()
        .map_err(|_| "The user session is unavailable".to_string())?
        .clone()
        .ok_or("Sign in as the owner first")?;
    if user.role != "owner" {
        return Err("Only the owner can create a recovery code".into());
    }
    let raw = uuid::Uuid::new_v4().simple().to_string().to_uppercase();
    let code = format!("{}-{}", &raw[..8], &raw[8..16]);
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .set_recovery_code(user.id.as_deref().ok_or("Owner account is invalid")?, &code)
        .map_err(String::from)?;
    Ok(code)
}
#[tauri::command]
fn reset_password_with_recovery(
    username: String,
    recovery_code: String,
    new_password: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?
        .reset_password_with_recovery(&username, &recovery_code, &new_password)
        .map_err(Into::into)
}
#[tauri::command]
fn owner_create_account(
    owner_username: String,
    owner_password: String,
    mut input: UserInput,
    state: tauri::State<'_, AppState>,
) -> Result<User, String> {
    let database = state
        .database
        .lock()
        .map_err(|_| "The local database is temporarily unavailable".to_string())?;
    let owner = database
        .authenticate(&owner_username, &owner_password)
        .map_err(String::from)?;
    if owner.role != "owner" {
        return Err("Only the owner can approve a new account".into());
    }
    if input.role == "owner" {
        input.role = "manager".into();
    }
    database.save_user(input).map_err(Into::into)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_local_data_dir()?;
            migrate_existing_database(&data_dir)?;
            let database = Database::open(&data_dir)?;
            let backup_dir = data_dir.join("backups");
            fs::create_dir_all(&backup_dir)?;
            let latest_local = fs::read_dir(&backup_dir)?
                .filter_map(Result::ok)
                .filter(|entry| {
                    entry.path().extension().and_then(|value| value.to_str()) == Some("db")
                })
                .filter_map(|entry| entry.metadata().ok()?.modified().ok())
                .max();
            let backup_due = latest_local
                .and_then(|time| time.elapsed().ok())
                .map(|age| age >= std::time::Duration::from_secs(20 * 60 * 60))
                .unwrap_or(true);
            if backup_due {
                database.create_backup(&backup_dir)?;
            }
            let mut local_backups: Vec<_> = fs::read_dir(&backup_dir)?
                .filter_map(Result::ok)
                .filter(|entry| {
                    entry.path().extension().and_then(|value| value.to_str()) == Some("db")
                })
                .collect();
            local_backups.sort_by_key(|entry| {
                entry
                    .metadata()
                    .and_then(|metadata| metadata.modified())
                    .ok()
            });
            let remove_count = local_backups.len().saturating_sub(30);
            for old in local_backups.into_iter().take(remove_count) {
                let _ = fs::remove_file(old.path());
            }
            app.manage(AppState {
                database: Arc::new(Mutex::new(database)),
                current_user: Mutex::new(None),
                network_session: Mutex::new(None),
            });
            let network = read_network_config(&app.handle());
            if network.mode == "host" && !network.join_code.is_empty() {
                let database = app.state::<AppState>().database.clone();
                let _ = start_company_health_server(network.join_code, database);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_company_network_status,
            configure_company_network,
            company_network_rpc,
            clear_company_network_session,
            dropbox_status,
            connect_dropbox,
            disconnect_dropbox,
            create_dropbox_backup,
            list_dropbox_backups,
            restore_dropbox_backup,
            recover_dropbox_backup,
            get_business_profile,
            save_business_profile,
            create_local_backup,
            list_backups,
            restore_local_backup,
            create_encrypted_backup,
            restore_encrypted_backup,
            recover_encrypted_package,
            recover_database_file,
            list_customers,
            save_customer,
            delete_record,
            list_products,
            save_product,
            list_quotations,
            save_quotation,
            get_quotation,
            update_quotation_status,
            convert_quotation_to_job,
            list_jobs,
            save_job,
            update_job_status,
            list_machines,
            save_machine,
            list_invoices,
            save_invoice,
            record_payment,
            get_dashboard_summary,
            get_invoice,
            list_payments,
            list_expenses,
            save_expense,
            get_finance_summary,
            list_suppliers,
            save_supplier,
            list_inventory,
            save_inventory_item,
            list_purchases,
            record_purchase,
            record_supplier_payment,
            consume_stock,
            has_users,
            create_first_owner,
            login,
            logout,
            reset_workspace,
            current_user,
            list_users,
            save_user,
            list_audit_entries,
            generate_recovery_code,
            reset_password_with_recovery,
            owner_create_account
        ])
        .run(tauri::generate_context!())
        .expect("PrintManager could not start");
}

fn migrate_existing_database(data_dir: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let target = data_dir.join("printing.db");
    let target_size = fs::metadata(&target).map(|meta| meta.len()).unwrap_or(0);
    if target_size > 1024 { return Ok(()); }
    let Some(parent) = data_dir.parent() else { return Ok(()); };
    let mut candidates = Vec::new();
    if let Ok(entries) = fs::read_dir(parent) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path == data_dir || !path.is_dir() { continue; }
            let candidate = path.join("printing.db");
            if let Ok(meta) = fs::metadata(&candidate) {
                if meta.len() > target_size.max(1024) { candidates.push((candidate, meta.len())); }
            }
        }
    }
    if let Some((source, _)) = candidates.into_iter().max_by_key(|(_, size)| *size) {
        fs::create_dir_all(data_dir)?;
        if target.exists() { let _ = fs::rename(&target, data_dir.join("printing.empty.db")); }
        fs::copy(source, &target)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn employee(role: &str) -> User {
        User { id: Some("test-user".into()), full_name: "Test Employee".into(), username: "test".into(), role: role.into(), phone: "".into(), is_active: true, last_login_at: None }
    }

    #[test]
    fn authenticated_roles_can_load_supporting_lists() {
        for role in ["accountant", "sales", "designer", "operator", "quality", "storekeeper", "delivery", "cashier"] {
            assert!(rpc_action_allowed(&employee(role), "inventory.list"), "{role} could not load supporting inventory data");
            assert!(rpc_action_allowed(&employee(role), "jobs.list"), "{role} could not load job data");
        }
    }

    #[test]
    fn restricted_roles_cannot_change_financial_records() {
        for role in ["designer", "operator", "quality", "delivery"] {
            assert!(!rpc_action_allowed(&employee(role), "expenses.save"), "{role} could change expenses");
            assert!(!rpc_action_allowed(&employee(role), "payments.save"), "{role} could record payments");
        }
        assert!(!rpc_action_allowed(&employee("cashier"), "expenses.save"));
        assert!(rpc_action_allowed(&employee("cashier"), "payments.save"));
    }

    #[test]
    fn operational_mutations_follow_role_responsibilities() {
        assert!(rpc_action_allowed(&employee("operator"), "jobs.status"));
        assert!(rpc_action_allowed(&employee("operator"), "stock.consume"));
        assert!(rpc_action_allowed(&employee("storekeeper"), "purchases.save"));
        assert!(rpc_action_allowed(&employee("accountant"), "payments.save"));
        assert!(!rpc_action_allowed(&employee("delivery"), "inventory.save"));
    }
}
