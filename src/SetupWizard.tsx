import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, HardDrive, Network, ShieldCheck } from "lucide-react";
import { BusinessProfile, DropboxBackup, configureCompanyNetwork, connectDropbox, getBusinessProfile, getDropboxStatus, listDropboxBackups, recoverDropboxBackup, recoverEncryptedPackage, recoverDatabaseFile, saveBusinessProfile } from "./lib/desktop";
import CompanyLogo from "./CompanyLogo";
import { LoginScreen } from "./AuthScreens";

type Props = { onComplete: (profile: BusinessProfile) => void };

const initialProfile: BusinessProfile = { businessName: "", phone: "", email: "", address: "", tin: "", currency: "UGX", ownerName: "", logoData: "" };

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recovering,setRecovering]=useState(false);const[recoveryFile,setRecoveryFile]=useState<File|null>(null);const[recoveryPassword,setRecoveryPassword]=useState("");
  const[cloudRecovering,setCloudRecovering]=useState(false);const[cloudBackups,setCloudBackups]=useState<DropboxBackup[]>([]);const[selectedCloud,setSelectedCloud]=useState(""); const [databaseFile,setDatabaseFile]=useState<File|null>(null);
  const[joining,setJoining]=useState(false);const[serverAddress,setServerAddress]=useState("");const[joinCode,setJoinCode]=useState(""); const [showSignIn,setShowSignIn]=useState(false); if(showSignIn)return <LoginScreen business={profile} onLogin={async()=>{const existing=await getBusinessProfile();if(existing)onComplete(existing);else setError("No existing company data was found on this computer. Restore a backup or join the owner computer first.")}} onReset={()=>setShowSignIn(false)} />;

  const update = (field: keyof BusinessProfile, value: string) => setProfile(current => ({ ...current, [field]: value }));
  const next = (event: FormEvent) => { event.preventDefault(); setError(""); setStep(current => current + 1); };
  const finish = async () => {
    setSaving(true); setError("");
    try { onComplete(await saveBusinessProfile(profile)); }
    catch { setError("We couldn't finish setup. Your information has not been lost. Please try again."); }
    finally { setSaving(false); }
  };
  const recover=async()=>{if(!recoveryFile||recoveryPassword.length<8)return;setSaving(true);setError("");try{const bytes=Array.from(new Uint8Array(await recoveryFile.arrayBuffer()));await recoverEncryptedPackage(bytes,recoveryPassword);location.reload()}catch(reason){setError(String(reason));setSaving(false)}};
  const recoverDatabase=async()=>{if(!databaseFile)return;setSaving(true);setError("");try{await recoverDatabaseFile(Array.from(new Uint8Array(await databaseFile.arrayBuffer())));location.reload()}catch(reason){setError(String(reason));setSaving(false)}};
  const chooseDatabaseFile=(file?:File)=>{if(!file)return;if(!file.name.toLowerCase().endsWith(".db")){setError("Choose the printing.db SQLite file.");return}setError("");setDatabaseFile(file)};
  const openCloudRecovery=async()=>{setSaving(true);setError("");try{let status=await getDropboxStatus();if(!status.connected)status=await connectDropbox();if(status.connected){const items=await listDropboxBackups();setCloudBackups(items);setSelectedCloud(items[0]?.name||"");setCloudRecovering(true)}}catch(reason){setError(String(reason))}finally{setSaving(false)}};
  const recoverCloud=async()=>{if(!selectedCloud||recoveryPassword.length<8)return;setSaving(true);setError("");try{await recoverDropboxBackup(selectedCloud,recoveryPassword);location.reload()}catch(reason){setError(String(reason));setSaving(false)}};
  const joinCompany=async()=>{setSaving(true);setError("");try{await configureCompanyNetwork("client",serverAddress,joinCode);const company=await getBusinessProfile();if(!company)throw new Error("The owner computer has no registered company profile.");location.reload()}catch(reason){setError(String(reason));setSaving(false)}};

  return <div className="setup-page">
    <div className="setup-brand"><CompanyLogo className="brand-mark"/><strong>PrintManager</strong></div>
    <div className="setup-card">
      <div className="setup-progress">
        {["Business", "Owner", "Backup", "Ready"].map((label, index) => <div className={index <= step ? "done" : ""} key={label}><span>{index < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></div>)}
      </div>

      {step === 0 && <form onSubmit={next} className="setup-content">
        <div className="setup-symbol"><Building2 size={25} /></div><p className="eyebrow">WELCOME TO PRINTMANAGER</p><h1>Let’s set up your business</h1><p className="setup-copy">This information will appear on your quotations, invoices and receipts. You can change it later.</p>
        <label>Business name<input autoFocus required value={profile.businessName} onChange={e => update("businessName", e.target.value)} placeholder="e.g. Qatlex Printing" /></label>
        <div className="form-row"><label>Business phone<input required value={profile.phone} onChange={e => update("phone", e.target.value)} placeholder="e.g. 0772 000 000" /></label><label>TIN <small>(optional)</small><input value={profile.tin} onChange={e => update("tin", e.target.value)} placeholder="Tax identification number" /></label></div>
        <label>Business address<input required value={profile.address} onChange={e => update("address", e.target.value)} placeholder="Town, street or building" /></label>
        {error&&<p className="setup-error">{error}</p>}<button className="setup-next" type="submit">Continue <ArrowRight size={17} /></button><button type="button" className="recover-company-button" onClick={()=>setJoining(true)}><Network/> Join an existing company</button><button type="button" className="setup-signin-button" onClick={()=>setShowSignIn(true)}>Already have an account? Sign in</button><label className="database-drop-zone" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();chooseDatabaseFile(event.dataTransfer.files?.[0])}}><HardDrive/><strong>{databaseFile?databaseFile.name:"Drop printing.db here"}</strong><small>or click to choose the database file</small><input type="file" accept=".db" onChange={event=>chooseDatabaseFile(event.target.files?.[0])}/></label>{databaseFile&&<button type="button" className="setup-next" onClick={()=>void recoverDatabase()}>Import database</button>}<button type="button" className="recover-company-button" onClick={()=>void openCloudRecovery()} disabled={saving}><HardDrive/> Recover data from Dropbox</button><button type="button" className="recover-company-button" onClick={()=>setRecovering(true)}><HardDrive/> Recover from encrypted backup</button>
      </form>}

      {step === 1 && <form onSubmit={next} className="setup-content">
        <div className="setup-symbol"><ShieldCheck size={25} /></div><p className="eyebrow">OWNER ACCOUNT</p><h1>Who manages this business?</h1><p className="setup-copy">You’ll be the first owner. Secure sign-in credentials will be added in the user-account step.</p>
        <label>Your full name<input autoFocus required value={profile.ownerName} onChange={e => update("ownerName", e.target.value)} placeholder="e.g. Alex Kato" /></label>
        <label>Email address <small>(optional)</small><input type="email" value={profile.email} onChange={e => update("email", e.target.value)} placeholder="name@business.com" /></label>
        <label>Business currency<select value={profile.currency} onChange={e => update("currency", e.target.value)}><option value="UGX">Ugandan Shilling (UGX)</option><option value="KES">Kenyan Shilling (KES)</option><option value="USD">US Dollar (USD)</option></select></label>
        <div className="setup-actions"><button type="button" className="setup-back" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button><button className="setup-next" type="submit">Continue <ArrowRight size={17} /></button></div>
      </form>}

      {step === 2 && <div className="setup-content">
        <div className="setup-symbol"><HardDrive size={25} /></div><p className="eyebrow">DATA PROTECTION</p><h1>Your work stays on this computer</h1><p className="setup-copy">PrintManager works without internet. It will keep automatic local backups, while optional online backup can be connected later.</p>
        <div className="assurance-list"><div><Check size={16} /><span><strong>Works completely offline</strong><small>Sales and jobs never wait for internet</small></span></div><div><Check size={16} /><span><strong>Automatic local backups</strong><small>Recover from mistakes or computer problems</small></span></div><div><Check size={16} /><span><strong>Optional encrypted online backup</strong><small>Connect it when you are ready</small></span></div></div>
        <div className="setup-actions"><button className="setup-back" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="setup-next" onClick={() => setStep(3)}>Continue <ArrowRight size={17} /></button></div>
      </div>}

      {step === 3 && <div className="setup-content setup-ready">
        <div className="ready-check"><Check size={29} /></div><p className="eyebrow">READY TO BEGIN</p><h1>{profile.businessName} is ready</h1><p className="setup-copy">Your local workspace will now be created. You can begin adding customers, products and print jobs.</p>
        <div className="ready-summary"><span>Business<strong>{profile.businessName}</strong></span><span>Owner<strong>{profile.ownerName}</strong></span><span>Currency<strong>{profile.currency}</strong></span></div>
        {error && <p className="setup-error">{error}</p>}
        <div className="setup-actions"><button className="setup-back" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button><button className="setup-next" disabled={saving} onClick={finish}>{saving ? "Creating workspace…" : "Open PrintManager"} <ArrowRight size={17} /></button></div>
      </div>}
    </div>
    {recovering&&<div className="recovery-backdrop"><section className="recovery-import"><header><CompanyLogo className="brand-mark"/><div><h2>Recover existing company</h2><p>Restore the encrypted archive before signing in.</p></div></header><label>Encrypted PrintManager backup<input type="file" accept=".pmbak" onChange={event=>setRecoveryFile(event.target.files?.[0]??null)}/></label><label>Backup password<input type="password" minLength={8} value={recoveryPassword} onChange={event=>setRecoveryPassword(event.target.value)} placeholder="Password used when creating the backup"/></label>{recoveryFile&&<div className="selected-recovery-file"><HardDrive/><span><strong>{recoveryFile.name}</strong><small>{(recoveryFile.size/1048576).toFixed(1)} MB</small></span></div>}{error&&<p className="setup-error">{error}</p>}<footer><button className="setup-back" onClick={()=>{setRecovering(false);setError("")}} disabled={saving}>Cancel</button><button className="setup-next" onClick={()=>void recover()} disabled={saving||!recoveryFile||recoveryPassword.length<8}>{saving?"Validating and restoring…":"Restore company"}</button></footer></section></div>}
    {cloudRecovering&&<div className="recovery-backdrop"><section className="recovery-import"><header><CompanyLogo className="brand-mark"/><div><h2>Recover from Dropbox</h2><p>Select an encrypted recovery copy from your connected account.</p></div></header>{cloudBackups.length?<><label>Available backup<select value={selectedCloud} onChange={event=>setSelectedCloud(event.target.value)}>{cloudBackups.map(item=><option key={item.name} value={item.name}>{item.name} · {(item.size/1048576).toFixed(1)} MB</option>)}</select></label><label>Backup encryption password<input type="password" minLength={8} value={recoveryPassword} onChange={event=>setRecoveryPassword(event.target.value)} placeholder="Password used when creating the backup"/></label></>:<p className="setup-copy">There are no PrintManager backups in this Dropbox account.</p>}{error&&<p className="setup-error">{error}</p>}<footer><button className="setup-back" onClick={()=>{setCloudRecovering(false);setError("")}} disabled={saving}>Cancel</button><button className="setup-next" onClick={()=>void recoverCloud()} disabled={saving||!selectedCloud||recoveryPassword.length<8}>{saving?"Downloading and restoring…":"Restore company"}</button></footer></section></div>}
    {joining&&<div className="recovery-backdrop"><section className="recovery-import"><header><Network/><div><h2>Join your company</h2><p>Connect this employee computer to the owner computer on the same network.</p></div></header><label>Owner computer address<input autoFocus value={serverAddress} onChange={event=>setServerAddress(event.target.value)} placeholder="Example: 192.168.1.20:47831"/></label><label>Private company join code<input value={joinCode} onChange={event=>setJoinCode(event.target.value.toUpperCase())} placeholder="8-character code"/></label><p className="setup-copy">Find both values under Settings → Company network on the owner computer.</p>{error&&<p className="setup-error">{error}</p>}<footer><button className="setup-back" onClick={()=>{setJoining(false);setError("")}} disabled={saving}>Cancel</button><button className="setup-next" onClick={()=>void joinCompany()} disabled={saving||!serverAddress||!joinCode}>{saving?"Connecting…":"Join company"}</button></footer></section></div>}
    <p className="setup-footer">Your business data is stored privately on this computer.</p>
  </div>;
}




