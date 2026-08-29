import { useEffect, useState } from "react";
import { CheckCircle2, CloudUpload, DatabaseBackup, HardDrive, KeyRound, LockKeyhole, RefreshCw, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { BackupInfo, DropboxBackup, DropboxConnection, connectDropbox, createDropboxBackup, createEncryptedBackup, createLocalBackup, disconnectDropbox, getDropboxStatus, listBackups, listDropboxBackups, restoreDropboxBackup, restoreEncryptedBackup, restoreLocalBackup } from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import { lockSyncedBackup, syncEnabled, syncUnlocked, unlockSyncedBackup } from "./lib/syncedBackup";

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [password, setPassword] = useState("");
  const [syncFolder, setSyncFolder] = useState(localStorage.getItem("printmanager.sync-folder") || "");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [dropbox,setDropbox]=useState<DropboxConnection>({connected:false});
  const [cloudBackups,setCloudBackups]=useState<DropboxBackup[]>([]);
  const [cloudPassword,setCloudPassword]=useState("");
  const [syncStatus,setSyncStatus]=useState(syncUnlocked()?"Real-time protection is active.":syncEnabled()?"Protection is paused. Enter the backup password to unlock it.":"Real-time protection is not configured.");
  const load = async () => setBackups(await listBackups());
  const loadCloud=async()=>{const status=await getDropboxStatus();setDropbox(status);setCloudBackups(status.connected?await listDropboxBackups():[])};
  useEffect(() => { void load();void loadCloud().catch(()=>undefined); const listener=(event:Event)=>setSyncStatus((event as CustomEvent<{message:string}>).detail.message);window.addEventListener("printmanager:backup-status",listener);return()=>window.removeEventListener("printmanager:backup-status",listener)}, []);
  const connect=async()=>{setBusy("dropbox-connect");setMessage("");try{setDropbox(await connectDropbox());setCloudBackups(await listDropboxBackups());setMessage("Dropbox connected securely. Your encrypted backups can now be recovered on another computer.")}catch(reason){setMessage(String(reason))}finally{setBusy("")}};
  const cloudBackup=async()=>{setBusy("dropbox-backup");setMessage("");try{const saved=await createDropboxBackup(cloudPassword);setCloudPassword("");setMessage(`${saved.name} was encrypted and backed up to Dropbox.`);notifyActivity({title:"Dropbox backup completed",detail:saved.name,page:"Backup",tone:"info"});setCloudBackups(await listDropboxBackups())}catch(reason){setMessage(String(reason))}finally{setBusy("")}};
  const cloudRestore=async(item:DropboxBackup)=>{const secret=prompt("Enter the encryption password for this Dropbox backup:")||"";if(!secret||!confirm(`Restore ${item.name}? A safety backup will be made first.`))return;setBusy(item.name);try{await restoreDropboxBackup(item.name,secret);location.reload()}catch(reason){setMessage(String(reason));setBusy("")}};

  const local = async () => {
    setBusy("local"); setMessage("");
    try { await createLocalBackup(); setMessage("Local backup created successfully."); notifyActivity({ title: "Local backup completed", detail: "Your business data was copied successfully.", page: "Backup", tone: "info" }); await load(); }
    catch (reason) { setMessage(String(reason)); }
    finally { setBusy(""); }
  };
  const encrypted = async () => {
    setBusy("encrypted"); setMessage("");
    try {
      localStorage.setItem("printmanager.sync-folder", syncFolder);
      await createEncryptedBackup(password, syncFolder);
      if(syncFolder)unlockSyncedBackup(password,syncFolder);
      setPassword("");
      setMessage(syncFolder ? "Encrypted backup created and copied to your sync folder." : "Encrypted backup created locally.");
      notifyActivity({ title: "Encrypted backup completed", detail: syncFolder ? "The protected copy was also sent to your sync folder." : "The protected copy was saved on this computer.", page: "Backup", tone: "info" });
      await load();
    } catch (reason) { setMessage(String(reason)); }
    finally { setBusy(""); }
  };
  const restore = async (item: BackupInfo) => {
    let archivePassword = "";
    if (item.encrypted) { archivePassword = prompt("Enter the encryption password for this backup:") || ""; if (!archivePassword) return; }
    if (!confirm(`Restore ${item.fileName}? A safety backup will be created first and the application will reload.`)) return;
    setBusy(item.fileName); setMessage("");
    try { if (item.encrypted) await restoreEncryptedBackup(item.fileName, archivePassword); else await restoreLocalBackup(item.fileName); location.reload(); }
    catch (reason) { setMessage(String(reason)); setBusy(""); }
  };

  return <div className="backup-page">
    <section className="backup-hero">
      <div><p className="eyebrow">DATA PROTECTION</p><h1>Backup & recovery</h1><p>Keep every customer, job and payment protected with local and encrypted copies.</p><div className="backup-assurance"><span><CheckCircle2 /> Stored locally</span><span><LockKeyhole /> AES-256 ready</span></div></div>
      <div className="backup-orbit" aria-hidden="true"><span><DatabaseBackup /></span><i /><i /><i /></div>
      <button className="secondary-button" onClick={() => void load()}><RefreshCw /> Refresh</button>
    </section>
    <section className="backup-options">
      <article className={`dropbox-card ${dropbox.connected?"connected":""}`}><span><CloudUpload/></span><div><small className="card-kicker">SECURE CLOUD RECOVERY</small><h2>{dropbox.connected?"Dropbox connected":"Connect Dropbox"}</h2><p>{dropbox.connected?`${dropbox.displayName||"Dropbox account"}  ${dropbox.email||"Ready for protected backups"}`:"Sign in once, then send encrypted recovery copies directly to your private PrintManager app folder."}</p>{dropbox.connected&&<div className="cloud-backup-actions"><input type="password" minLength={8} value={cloudPassword} onChange={event=>setCloudPassword(event.target.value)} placeholder="Backup encryption password"/><button onClick={()=>void cloudBackup()} disabled={!!busy||cloudPassword.length<8}>{busy==="dropbox-backup"?"Backing up":"Back up to Dropbox"}</button><button className="cloud-disconnect" onClick={()=>void disconnectDropbox().then(()=>{setDropbox({connected:false});setCloudBackups([])})}>Disconnect</button></div>}</div>{!dropbox.connected&&<button onClick={()=>void connect()} disabled={!!busy}>{busy==="dropbox-connect"?"Waiting for sign-in":"Connect account"}</button>}</article>
      <article className="sync-protection-card"><span className={syncUnlocked()?"active":""}><CloudUpload/></span><div><small className="card-kicker">REAL-TIME RECOVERY</small><h2>{syncUnlocked()?"Synced-folder protection active":"Synced-folder protection paused"}</h2><p>{syncStatus}</p><small>Changes are grouped for a few seconds, encrypted, and copied automatically while this application is open.</small></div>{syncUnlocked()&&<button onClick={()=>{lockSyncedBackup();setSyncStatus("Real-time protection is paused.")}}>Pause</button>}</article>
      <article className="local-backup-card"><span><HardDrive /></span><div><small className="card-kicker">QUICK SAFETY COPY</small><h2>Local backup</h2><p>Create a complete database copy on this computer before major changes.</p></div><button onClick={() => void local()} disabled={!!busy}>{busy === "local" ? "Creating" : "Back up now"}</button></article>
      <article className="encrypted-backup-card"><span><ShieldCheck /></span><div><small className="card-kicker">PRIVATE & PORTABLE</small><h2>Encrypted backup</h2><p>Protect the backup before copying it to OneDrive, Google Drive or Dropbox.</p><div className="backup-form"><label><span><KeyRound />Encryption password</span><input type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><label><span><CloudUpload />Sync folder <em>Optional</em></span><input value={syncFolder} onChange={event => setSyncFolder(event.target.value)} placeholder="C:\Users\Name\OneDrive\PrintManager" /></label></div></div><button className="encrypted-action" onClick={() => void encrypted()} disabled={!!busy || password.length < 8}>{busy === "encrypted" ? "Encrypting" : <><Sparkles />Create encrypted backup</>}</button></article>
    </section>
    {dropbox.connected&&<section className="backup-history cloud-history"><header><span><CloudUpload/></span><div><h2>Dropbox recovery copies</h2><p>{cloudBackups.length} encrypted {cloudBackups.length===1?"backup":"backups"} available on every computer</p></div><button className="history-refresh" onClick={()=>void loadCloud()}><RefreshCw/></button></header>{cloudBackups.length===0?<div className="backup-empty"><span><CloudUpload/></span><strong>No Dropbox backups yet</strong><p>Enter an encryption password above and create your first cloud backup.</p></div>:<div className="backup-list">{cloudBackups.map(item=><article key={item.name}><span className="encrypted"><ShieldCheck/></span><div><strong>{item.name}</strong><small>{item.modified?new Date(item.modified).toLocaleString():"Dropbox"}  {(item.size/1048576).toFixed(1)} MB  AES-256 encrypted</small></div><button disabled={!!busy} onClick={()=>void cloudRestore(item)}><RotateCcw/> Restore</button></article>)}</div>}</section>}
    {message && <div className="backup-message"><CheckCircle2 />{message}</div>}
    <section className="backup-history"><header><span><DatabaseBackup /></span><div><h2>Backup history</h2><p>{backups.length} recoverable {backups.length === 1 ? "copy" : "copies"} on this computer</p></div><button className="history-refresh" onClick={() => void load()} aria-label="Refresh backup history"><RefreshCw /></button></header>{backups.length === 0 ? <div className="backup-empty"><span><DatabaseBackup /></span><strong>Your backup history is empty</strong><p>Create a safety copy above and it will appear here.</p></div> : <div className="backup-list">{backups.map((item, index) => <article key={item.path} style={{ animationDelay: `${index * 45}ms` }}><span className={item.encrypted ? "encrypted" : ""}>{item.encrypted ? <ShieldCheck /> : <HardDrive />}</span><div><strong>{item.fileName}</strong><small>{item.createdAt}  {(item.size / 1048576).toFixed(1)} MB{item.encrypted ? "  AES-256 encrypted" : ""}</small></div><button disabled={!!busy} onClick={() => void restore(item)}><RotateCcw /> Restore</button></article>)}</div>}</section>
  </div>;
}
