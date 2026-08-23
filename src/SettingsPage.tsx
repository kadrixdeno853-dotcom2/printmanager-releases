import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Check,
  KeyRound,
  Palette,
  Save,
  ShieldCheck,
  Network,
  Server,
  Monitor,
  Upload,
  Mail,
} from "lucide-react";
import {
  AuditEntry,
  BusinessProfile,
  generateRecoveryCode,
  listAuditEntries,
  saveBusinessProfile,
  CompanyNetworkStatus,
  configureCompanyNetwork,
  getCompanyNetworkStatus,
} from "./lib/desktop";
import { notifyActivity } from "./lib/activity";
import { getCompanyLogo, PrintManagerMark, saveCompanyLogo } from "./CompanyLogo";
import { AppTheme, applyTheme, getTheme, themes } from "./lib/theme";

export default function SettingsPage({
  profile,
  onSaved,
}: {
  profile: BusinessProfile;
  onSaved: (profile: BusinessProfile) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [logo, setLogo] = useState(profile.logoData || getCompanyLogo());
  const [theme,setTheme]=useState<AppTheme>(getTheme);
  const [dailyReport,setDailyReport]=useState(()=>{try{return JSON.parse(localStorage.getItem("printmanager.daily-report")||"null")||{enabled:false,recipient:"",sendTime:"18:00"}}catch{return {enabled:false,recipient:"",sendTime:"18:00"}}});
  const [accountingRules,setAccountingRules]=useState(()=>{try{return JSON.parse(localStorage.getItem("printmanager.accounting-rules")||"null")||{operating:50,materials:20,salaries:15,tax:10,savings:5}}catch{return {operating:50,materials:20,salaries:15,tax:10,savings:5}}});
  const accountingTotal=Object.values(accountingRules).reduce((sum:number,value)=>sum+Number(value||0),0);
  const updateAccountingRule=(key:string,value:number)=>setAccountingRules((current:any)=>({...current,[key]:Math.max(0,Math.min(100,Number.isFinite(value)?value:0))}));
  const saveAccountingRules=()=>{if(Math.round(accountingTotal)!==100){setMessage("Accounting allocation percentages must total 100%.");return}localStorage.setItem("printmanager.accounting-rules",JSON.stringify(accountingRules));setMessage("Accounting allocation rules saved.");notifyActivity({title:"Accounting rules updated",detail:"Daily collection allocation percentages were saved.",page:"Settings",tone:"info"})};
  const [network,setNetwork]=useState<CompanyNetworkStatus>({mode:"local",serverAddress:"",joinCode:"",connected:false,message:"Checking company network…"});
  const [networkBusy,setNetworkBusy]=useState(false);
  const [networkMessage,setNetworkMessage]=useState("");
  const chooseTheme=(value:AppTheme)=>{setTheme(value);applyTheme(value);notifyActivity({title:"Colour theme changed",detail:`${themes.find(item=>item.id===value)?.name||value} theme applied.`,page:"Settings",tone:"info"})};
  const saveDailyReport=()=>{localStorage.setItem("printmanager.daily-report",JSON.stringify(dailyReport));setMessage("Daily CEO report preferences saved.");notifyActivity({title:"Daily CEO report updated",detail:dailyReport.enabled?`Reports are scheduled for ${dailyReport.sendTime}.` : "Automatic reports are paused.",page:"Settings",tone:"info"})};
  useEffect(() => {
    void listAuditEntries().then(setAudit);
    void getCompanyNetworkStatus().then(setNetwork).catch(reason=>setNetworkMessage(String(reason)));
  }, []);
  const saveNetwork=async()=>{setNetworkBusy(true);setNetworkMessage("");try{const saved=await configureCompanyNetwork(network.mode,network.serverAddress,network.joinCode);setNetwork(saved);setNetworkMessage(saved.mode==="host"?"Company server is ready. Give the address and join code to employees.":saved.mode==="client"?"Connected successfully to the owner computer.":"This computer now uses its own local workspace.")}catch(reason){setNetworkMessage(String(reason))}finally{setNetworkBusy(false)}};
  const update = (field: keyof BusinessProfile, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const saved = await saveBusinessProfile(draft);
      onSaved(saved);
      setMessage("Business settings saved.");
      notifyActivity({
        title: "Business settings updated",
        detail: `${saved.businessName} details were saved securely.`,
        page: "Settings",
        tone: "info",
      });
    } catch (reason) {
      setMessage(String(reason));
    } finally {
      setSaving(false);
    }
  };
  const createRecovery = async () => {
    if (
      !confirm(
        "Create a new owner recovery code? Any older recovery code will stop working.",
      )
    )
      return;
    try {
      setRecoveryCode(await generateRecoveryCode());
      notifyActivity({
        title: "Recovery code created",
        detail: "The previous owner recovery code is no longer valid.",
        page: "Settings",
        tone: "warning",
      });
    } catch (reason) {
      setMessage(String(reason));
    }
  };
  const uploadLogo=(file?:File)=>{if(!file)return;if(!file.type.startsWith("image/")){setMessage("Choose a PNG, JPG, WebP or SVG image.");return}if(file.size>1024*1024){setMessage("The logo must be smaller than 1 MB.");return}const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||"");setLogo(value);setDraft(current=>({...current,logoData:value}));saveCompanyLogo(value);setMessage("Company logo updated. Save settings to include it in backups.");notifyActivity({title:"Company logo updated",detail:"The new logo will appear on business documents.",page:"Settings",tone:"info"})};reader.readAsDataURL(file)};
  return (
    <>
      <section className="list-heading">
        <div>
          <p className="eyebrow">SYSTEM PREFERENCES</p>
          <h1>Settings & activity</h1>
          <p>
            Control business identity, emergency access and local activity
            history.
          </p>
        </div>
      </section>
      <section className="settings-grid">
        <div>
          <form className="settings-card" onSubmit={submit}>
            <header>
              <Building2 />
              <div>
                <h2>Business details</h2>
                <p>Saved directly to this computer.</p>
              </div>
            </header>
            <div className="company-logo-control"><div className="company-logo-preview">{logo?<img src={logo} alt="Company logo preview"/>:<PrintManagerMark/>}</div><div><strong>Company logo</strong><small>Appears in the workspace, quotations, invoices and receipts.</small><span className="logo-actions"><label className="logo-upload"><Upload/> Upload logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event=>uploadLogo(event.target.files?.[0])}/></label>{logo&&<button type="button" className="logo-remove" onClick={()=>{setLogo("");setDraft(current=>({...current,logoData:""}));saveCompanyLogo("");setMessage("Company logo removed. Save settings to confirm.")}}>Remove</button>}</span></div></div>
            <label>
              Business name
              <input
                required
                value={draft.businessName}
                onChange={(e) => update("businessName", e.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                Phone
                <input
                  required
                  value={draft.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </label>
            </div>
            <label>
              Address
              <input
                required
                value={draft.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                TIN
                <input
                  value={draft.tin}
                  onChange={(e) => update("tin", e.target.value)}
                />
              </label>
              <label>
                Currency
                <select
                  value={draft.currency}
                  onChange={(e) => update("currency", e.target.value)}
                >
                  <option value="UGX">UGX</option>
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <label>
              Owner name
              <input
                required
                value={draft.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
              />
            </label>
            {message && (
              <p className="settings-message">
                <Check />
                {message}
              </p>
            )}
            <button className="primary-button" disabled={saving}>
              <Save />
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
          <section className="settings-card appearance-settings">
            <header><Palette/><div><h2>Colour theme</h2><p>Personalise the workspace appearance.</p></div></header>
            <div className="theme-options">{themes.map(option=><button type="button" key={option.id} className={`theme-option ${theme===option.id?"active":""}`} onClick={()=>chooseTheme(option.id)}><span className="theme-swatches">{option.colors.map(color=><i key={color} style={{background:color}}/>)}</span><span><strong>{option.name}</strong><small>{option.description}</small></span>{theme===option.id&&<Check/>}</button>)}</div>
          </section>
          <section className="settings-card accounting-rules-settings">
            <header><Activity/><div><h2>Accounting rules</h2><p>Allocate every collection across your business reserves.</p></div><strong className={Math.round(accountingTotal)===100?"rules-valid":"rules-invalid"}>{accountingTotal}%</strong></header>
            <div className="accounting-rule-grid">{[["operating","Operating expenses"],["materials","Materials reserve"],["salaries","Salaries"],["tax","Tax reserve"],["savings","Business savings"]].map(([key,label])=><label key={key}><span>{label}</span><input type="number" min="0" max="100" step="1" value={accountingRules[key]} onChange={event=>updateAccountingRule(key,Number(event.target.value))}/><b>%</b></label>)}</div>
            <p className="accounting-rule-hint">The total must equal 100%. These percentages are used by the Dashboard Accounting Assistant.</p><button type="button" className="secondary-button" onClick={saveAccountingRules}><Save/>Save accounting rules</button>
          </section>
          <section className="settings-card daily-report-settings">
            <header><Mail/><div><h2>Daily CEO report</h2><p>Prepare a daily business summary for the company owner.</p></div><span className={`report-state ${dailyReport.enabled?"enabled":""}`}>{dailyReport.enabled?"Enabled":"Paused"}</span></header>
            <div className="report-form-grid"><label>CEO email address<input type="email" placeholder="ceo@company.com" value={dailyReport.recipient} onChange={event=>setDailyReport({...dailyReport,recipient:event.target.value})}/></label><label>Send time<input type="time" value={dailyReport.sendTime} onChange={event=>setDailyReport({...dailyReport,sendTime:event.target.value})}/></label></div>
            <label className="active-toggle report-toggle"><input type="checkbox" checked={dailyReport.enabled} onChange={event=>setDailyReport({...dailyReport,enabled:event.target.checked})}/><span><i><Check size={13}/></i><strong>Send report automatically</strong><small>Requires the email delivery connection to be configured.</small></span></label>
            <p className="accounting-rule-hint">The report will include collections, expenses, unpaid jobs, completed jobs and cash remaining. Email delivery is configured in the next step; these preferences are saved now.</p><button type="button" className="secondary-button" onClick={saveDailyReport}><Mail/>Save report schedule</button>
          </section>
          <section className="settings-card network-settings">
            <header><span className="network-heading-icon"><Network/></span><div><small>OFFICE COLLABORATION</small><h2>Company network</h2><p>Connect your team securely on the same Wi-Fi or LAN.</p></div><span className={`network-state ${network.connected?"online":""}`}><i/>{network.connected?"Connected":"Not connected"}</span></header>
            <div className="network-section-label"><span>1</span><div><strong>Choose this computer’s role</strong><small>You can change it later without deleting business data.</small></div></div>
            <div className="network-mode-options">
              <button type="button" className={network.mode==="host"?"active":""} onClick={()=>setNetwork({...network,mode:"host"})}><span className="network-mode-icon"><Server/></span><span><strong>Owner computer</strong><small>Stores and shares company data</small></span><i className="network-choice" aria-hidden="true"/></button>
              <button type="button" className={network.mode==="client"?"active":""} onClick={()=>setNetwork({...network,mode:"client"})}><span className="network-mode-icon"><Monitor/></span><span><strong>Employee computer</strong><small>Connects to the shared workspace</small></span><i className="network-choice" aria-hidden="true"/></button>
            </div>
            <div className="network-section-label"><span>2</span><div><strong>{network.mode==="host"?"Share connection details":"Enter connection details"}</strong><small>{network.mode==="host"?"Use these details when setting up employee computers.":"Get these details from the owner computer."}</small></div></div>
            {network.mode==="host"&&<div className="network-details"><label><span>Server address<small>Office network address</small></span><input readOnly value={network.serverAddress||"Click Generate connection details"}/></label><label><span>Company join code<small>Keep this code private</small></span><input className="join-code-input" readOnly value={network.joinCode||"Click Generate connection details"}/></label><p><ShieldCheck/> {network.joinCode?"Share the address and code only with your employees.":"Generate the private code once, then keep this computer switched on while employees work."}</p></div>}
            {network.mode==="client"&&<div className="network-details"><label><span>Owner computer address<small>Including port 47831</small></span><input placeholder="192.168.1.20:47831" value={network.serverAddress} onChange={event=>setNetwork({...network,serverAddress:event.target.value})}/></label><label><span>Company join code<small>Provided by the owner</small></span><input className="join-code-input" placeholder="8-character code" value={network.joinCode} onChange={event=>setNetwork({...network,joinCode:event.target.value.toUpperCase()})}/></label></div>}
            {networkMessage&&<p className="network-message">{networkMessage}</p>}
            <div className="network-actions"><span><ShieldCheck/> Private office connection</span><button type="button" disabled={networkBusy} onClick={()=>void saveNetwork()}><Network/>{networkBusy?"Preparing…":network.mode==="host"?(network.joinCode?"Restart company server":"Generate connection details"):network.mode==="client"?"Connect computer":"Save"}</button></div>
          </section>
          <section className="settings-card recovery-settings">
            <header>
              <KeyRound />
              <div>
                <h2>Owner password recovery</h2>
                <p>Prevent lockout without weakening offline security.</p>
              </div>
            </header>
            {recoveryCode ? (
              <>
                <div className="recovery-code">{recoveryCode}</div>
                <p className="recovery-warning">
                  Print or store this code away from the computer. It will not
                  be shown again.
                </p>
              </>
            ) : (
              <p>
                Create a one-time code that can reset the owner password from
                the sign-in screen. Existing data remains untouched.
              </p>
            )}
            <button
              className="secondary-button"
              onClick={() => void createRecovery()}
            >
              <KeyRound />
              {recoveryCode ? "Replace recovery code" : "Create recovery code"}
            </button>
          </section>
        </div>
        <section className="settings-card audit-card">
          <header>
            <Activity />
            <div>
              <h2>Activity history</h2>
              <p>Recent changes recorded by the local database.</p>
            </div>
          </header>
          {audit.length === 0 ? (
            <div className="audit-empty">
              <ShieldCheck />
              <strong>Activity tracking is ready</strong>
              <p>
                New customers, jobs, payments, expenses, employees and machines
                will appear here.
              </p>
            </div>
          ) : (
            <div className="audit-list">
              {audit.map((entry) => (
                <article key={entry.id}>
                  <span>{entry.entityType.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>
                      {entry.entityType} {entry.action}
                    </strong>
                    <small>{entry.details || entry.entityId}</small>
                  </div>
                  <time>{entry.createdAt}</time>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
