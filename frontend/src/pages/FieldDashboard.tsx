
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { api, ApiError } from "../lib/api";
import type { AuthUser } from "../types/auth";

type Role = "SCIENCE_COMMUNICATOR" | "DRIVER";
type DashboardData = any;

const instructorNav = [
  ["dashboard","Dashboard",[]],
  ["schedule","My Schedule",["Today's Visits","Upcoming Visits","Assigned Schools","Visit Details"]],
  ["lab","My Mobile Laboratory",["Lab Details","Equipment","Consumables","Inventory","Lab Checklist"]],
  ["travel","Routes & Travel",["Today's Route","Route Details","Navigation","Trip Status","GPS / Location"]],
  ["visits","School Visits",["School Details","Arrival / Departure","School Verification","Visit History"]],
  ["sessions","Science Sessions",["Assigned Sessions","Session Details","Experiment Selection","Experiment Instructions","Student Attendance","Experiment Execution","Observations","Evidence / Photos","Session Completion"]],
  ["inventory","Equipment & Inventory",["Equipment Scan","Equipment Checklist","Consumables Used","Damaged / Missing Items","Inventory Reconciliation"]],
  ["issues","Issues & Support",["Report Issue","Equipment Issue","Inventory Issue","Vehicle / Lab Issue","Emergency / Support"]],
  ["records","Records & History",["Completed Sessions","Visit History","Experiment Records","Attendance Records","Submitted Reports"]],
  ["profile","Profile",["My Profile","Availability","Account & Security"]]
] as const;

const driverNav = [
  ["dashboard","Dashboard",[]],
  ["schedule","My Schedule",["Today's Trips","Upcoming Trips","Assigned Route","Trip Details"]],
  ["lab","Mobile Laboratory",["Lab Details","Vehicle Details","Pre-Trip Checklist","Equipment Status","Vehicle / Lab Condition"]],
  ["routes","Routes & Navigation",["Today's Route","Route Details","Navigation","Stops","GPS / Location"]],
  ["trips","Trip Management",["Start Trip","Current Trip","School Arrival","School Departure","Trip Status","End Trip"]],
  ["visits","School Visits",["Today's Schools","School Details","Arrival / Departure","Visit History"]],
  ["safety","Vehicle & Safety",["Vehicle Checklist","Fuel / Charging","Maintenance Issues","Breakdown / Emergency","Safety Reports"]],
  ["issues","Issues & Support",["Report Issue","Vehicle Issue","Route Issue","Accident / Emergency","Contact Support"]],
  ["records","Trip Records",["Completed Trips","Route History","Distance / Travel Records","Submitted Reports"]],
  ["profile","Profile",["My Profile","Account & Security"]]
] as const;

function ScienceFieldBackground({role}:{role:Role}) {
  return <div className={`field-bg ${role==="DRIVER"?"driver-bg":"instructor-bg"}`}><span/><span/><span/><div className="field-orbit"/></div>;
}

function Stat({label,value}:{label:string,value:any}) {
  return <div className="field-stat"><span>{label}</span><strong>{value ?? 0}</strong></div>;
}

export function FieldDashboard({role}:{role:Role}) {
  const [user,setUser]=useState<AuthUser|null>(null);
  const [data,setData]=useState<DashboardData|null>(null);
  const [active,setActive]=useState("dashboard");
  const [child,setChild]=useState("");
  const [expanded,setExpanded]=useState<Record<string,boolean>>({schedule:true,lab:true});
  const [mobile,setMobile]=useState(false);
  const [message,setMessage]=useState("");

  const nav = role==="DRIVER" ? driverNav : instructorNav;

  async function load() {
    try {
      const me=await api<AuthUser>("/me");
      if(me.role!==role) throw new Error("Role access denied");
      setUser(me);
      setData(await api<DashboardData>("/field/dashboard"));
    } catch (error) {
      if ((error instanceof ApiError && error.status === 401) || (error instanceof Error && error.message === "Role access denied")) {
        window.location.assign("/login");
      } else {
        setMessage(error instanceof Error ? error.message : "Unable to load dashboard data");
      }
    }
  }

  useEffect(()=>{void load()},[role]);

  function select(key:string, sub="") {
    setActive(key); setChild(sub); setMobile(false);
    if(sub) setExpanded(x=>({...x,[key]:true}));
    setMessage("");
  }

  const roleTitle=role==="DRIVER"?"DRIVER":"SCIENCE COMMUNICATOR";
  const accent=role==="DRIVER"?"driver":"instructor";

  async function action(path:string, body?:any) {
    try {
      setMessage("");
      await api(path,{method:"POST",body:body?JSON.stringify(body):undefined});
      await load();
      setMessage("Action recorded successfully.");
    } catch(e) {
      setMessage(e instanceof Error?e.message:"Action failed");
    }
  }

  const currentEvents=data?.todayVisits || [];
  const currentTrips=data?.todayTrips || [];

  function home() {
    if(role==="DRIVER") {
      const t=currentTrips[0];
      return <section className="field-page">
        <div className="command-hero">
          <div><div className="eyebrow">MOVE / NAVIGATE / TRANSPORT / COMPLETE</div><h2>Good day, {user?.name||"Driver"}.</h2><p>Your transportation command center for today's mobile laboratory operations.</p></div>
          <div className="hero-visual"><div className="hero-orbit one"/><div className="hero-orbit two"/><div className="hero-node node-a"/><div className="hero-node node-b"/><div className="hero-node node-c"/><div className="hero-core"><BrandLogo /></div></div>
        </div>
        <div className="field-stats"><Stat label="Today's Trips" value={data?.kpis?.todayTrips}/><Stat label="Upcoming Trips" value={data?.kpis?.upcomingTrips}/><Stat label="Open Issues" value={data?.kpis?.openIssues}/><Stat label="Lab" value={data?.bus?.busCode||"—"}/></div>
        <div className="field-grid-2">
          <div className="field-card"><div className="field-card-head"><div><span>ACTIVE JOURNEY</span><h2>{t?.tripCode||"No active trip"}</h2></div><b>{t?.status||"PLANNED"}</b></div>{t?<><p>Route: {t.Route?.routeName||"—"}</p><p>Next stop: {t.Route?.RouteStop?.find((s:any)=>s.status!=="DEPARTED")?.School?.name || t.Route?.RouteStop?.find((s:any)=>s.status!=="DEPARTED")?.stopName || "—"}</p><div className="field-actions">{t.status==="PLANNED"&&<button onClick={()=>action(`/field/trips/${t.id}/start`)}>Start trip</button>}{t.status!=="COMPLETED"&&<button className="secondary" onClick={()=>action(`/field/trips/${t.id}/status`,{status:"IN_PROGRESS"})}>Mark travelling</button>}{t.status!=="COMPLETED"&&<button className="secondary" onClick={()=>action(`/field/trips/${t.id}/arrival`)}>School arrival</button>}{t.status!=="COMPLETED"&&<button className="danger" onClick={()=>action(`/field/trips/${t.id}/emergency`,{description:"Driver reported an emergency"})}>Emergency</button>}</div></>:<p>No trip assigned for today.</p>}</div>
          <div className="field-card"><div className="field-card-head"><div><span>VEHICLE / LAB</span><h2>{data?.bus?.busCode||"Assigned laboratory"}</h2></div><b>{data?.bus?.status||"—"}</b></div><p>{data?.bus?.registrationNumber||"No vehicle assignment"} </p><p>GPS: {data?.bus?.lastGpsUpdate ? new Date(data.bus.lastGpsUpdate).toLocaleString() : "No recent telemetry"}</p><div className="field-actions"><button className="secondary" onClick={()=>select("lab","Pre-Trip Checklist")}>Pre-trip checklist</button><button className="secondary" onClick={()=>select("routes","Today's Route")}>View route</button></div></div>
        </div>
        {message&&<div className="field-message">{message}</div>}
      </section>;
    }

    const e=currentEvents[0];
    return <section className="field-page">
      <div className="command-hero">
        <div><div className="eyebrow">EXPLORE / TEACH / EXPERIMENT / DISCOVER</div><h2>Science in motion.</h2><p>Everything you need to prepare, travel, conduct and record today's assigned science sessions.</p></div>
        <div className="hero-visual"><div className="hero-orbit one"/><div className="hero-orbit two"/><div className="hero-node node-a"/><div className="hero-node node-b"/><div className="hero-node node-c"/><div className="hero-core"><BrandLogo /></div></div>
      </div>
      <div className="field-stats"><Stat label="Today's Visits" value={data?.kpis?.todayVisits}/><Stat label="Upcoming" value={data?.kpis?.upcomingVisits}/><Stat label="Open Issues" value={data?.kpis?.openIssues}/><Stat label="Assigned Labs" value={data?.labs?.length}/></div>
      <div className="field-grid-2">
        <div className="field-card"><div className="field-card-head"><div><span>NEXT FIELD SESSION</span><h2>{e?.School?.name||"No visit assigned"}</h2></div><b>{e?.status||"—"}</b></div>{e&&<><p>{e.startTime} · {e.Bus?.busCode||e.Bus?.registrationNumber||"Lab"}</p><p>{e.ExperimentSession?.[0]?.Experiment?.title||"Assigned experiment"} · {e.ExperimentSession?.[0]?.Experiment?.subject||"Science"}</p><div className="field-actions"><button onClick={()=>action(`/field/events/${e.id}/arrival`)}>Arrived at school</button><button className="secondary" onClick={()=>action(`/field/events/${e.id}/start`)}>Start session</button><button className="secondary" onClick={()=>action(`/field/events/${e.id}/complete`)}>Complete</button></div></>}</div>
        <div className="field-card"><div className="field-card-head"><div><span>LAB READINESS</span><h2>{data?.labs?.[0]?.busCode||"Assigned laboratory"}</h2></div><b>{data?.labs?.[0]?.status||"—"}</b></div><p>Equipment, consumables and checklist information for your assigned laboratory.</p><div className="field-actions"><button className="secondary" onClick={()=>select("lab","Equipment")}>Equipment</button><button className="secondary" onClick={()=>select("lab","Consumables")}>Consumables</button><button className="secondary" onClick={()=>select("lab","Lab Checklist")}>Checklist</button></div></div>
      </div>
      {message&&<div className="field-message">{message}</div>}
    </section>;
  }

  function listPage() {
    if(role==="DRIVER" && active==="schedule") {
      return <List title={child||"Today's Trips"} items={(child==="Upcoming Trips"?data?.upcomingTrips:data?.todayTrips)||[]} render={(x:any)=><><strong>{x.tripCode}</strong><span>{x.Route?.routeName||"Route"} · {x.Bus?.busCode||x.Bus?.registrationNumber}</span><em>{x.status}</em></>} />;
    }
    if(role==="SCIENCE_COMMUNICATOR" && active==="schedule") {
      return <List title={child||"Today's Visits"} items={(child==="Upcoming Visits"?data?.upcomingVisits:data?.todayVisits)||[]} render={(x:any)=><><strong>{x.School?.name||"School"}</strong><span>{x.eventCode} · {x.startTime} · {x.Bus?.busCode||"Lab"}</span><em>{x.status}</em></>} />;
    }
    if(active==="issues") return <IssueForm role={role} onDone={load}/>;
    if(active==="lab") return <LabView data={data} role={role} child={child}/>;
    if(active==="trips" && role==="DRIVER") return <List title={child||"Trip Management"} items={data?.upcomingTrips||[]} render={(x:any)=><><strong>{x.tripCode}</strong><span>{x.Route?.routeName||"Route"}</span><div className="field-actions"><button onClick={()=>action(`/field/trips/${x.id}/start`)}>Start</button><button className="secondary" onClick={()=>action(`/field/trips/${x.id}/status`,{status:"COMPLETED"})}>End trip</button></div></>} />;
    if(active==="sessions" && role==="SCIENCE_COMMUNICATOR") return <List title={child||"Science Sessions"} items={data?.upcomingVisits||[]} render={(x:any)=><><strong>{x.School?.name}</strong><span>{x.ExperimentSession?.[0]?.Experiment?.title||"Experiment"} · {x.status}</span><div className="field-actions"><button onClick={()=>action(`/field/events/${x.id}/complete`)}>Complete</button></div></>} />;
    if(active==="records") return <List title={child||"Records & History"} items={role==="DRIVER"?data?.upcomingTrips||[]:data?.upcomingVisits||[]} render={(x:any)=><><strong>{x.tripCode||x.eventCode}</strong><span>{x.status}</span></>} />;
    if(active==="visits") return <List title={child||"School Visits"} items={data?.todayVisits||[]} render={(x:any)=><><strong>{x.School?.name}</strong><span>{x.address||x.eventDate?.slice?.(0,10)||"Assigned visit"}</span><em>{x.status}</em></>} />;
    if(active==="travel" || active==="routes") {
      const routes=role==="DRIVER"?(data?.todayTrips||[]).map((x:any)=>x.Route).filter(Boolean): (data?.todayVisits||[]).map((x:any)=>({routeName:x.Bus?.busCode,school:x.School?.name})).filter(Boolean);
      return <List title={child||"Today's Route"} items={routes} render={(x:any)=><><strong>{x.routeName||"Assigned route"}</strong><span>{x.school||x.startLocation||"Operational route"}</span></>} />;
    }
    if(active==="inventory") return <List title={child||"Equipment & Inventory"} items={data?.inventory||data?.labs||[]} render={(x:any)=><><strong>{x.consumable?.name||x.busCode||x.registrationNumber||x.name}</strong><span>{x.quantity ? `${x.quantity} · ${x.type}` : x.status||"Assigned resource"}</span></>} />;
    if(active==="safety") return <List title={child||"Vehicle & Safety"} items={data?.issues||[]} render={(x:any)=><><strong>{x.category}</strong><span>{x.description}</span><em>{x.status}</em></>} />;
    return <div className="field-card"><span className="field-kicker">{roleTitle}</span><h2>{child||nav.find(x=>x[0]===active)?.[1]}</h2><p>This operational workspace is connected to the same authenticated account, assignments and database. Select a concrete action from the navigation to continue.</p><div className="field-actions">{role==="DRIVER"&&<button onClick={()=>select("trips","Start Trip")}>Start trip</button>}{role==="SCIENCE_COMMUNICATOR"&&<button onClick={()=>select("sessions","Assigned Sessions")}>Open sessions</button>}<button className="secondary" onClick={()=>select("issues","Report Issue")}>Report issue</button></div></div>;
  }

  return <div className={`field-shell ${accent}-shell`}>
    <ScienceFieldBackground role={role}/>
    <aside className={`field-sidebar ${mobile?"open":""}`}>
      <div className="field-brand"><div className={`field-logo ${accent}`}><BrandLogo /></div><div><strong>Science on Wheels</strong><span>{role==="DRIVER"?"Journey Operations":"Science Communicator"}</span></div></div>
      <div className={`field-role ${accent}`}><span>{roleTitle}</span><b>{role==="DRIVER"?"MOVE / NAVIGATE / TRANSPORT / COMPLETE":"EXPLORE / TEACH / EXPERIMENT / DISCOVER"}</b></div>
      <nav>{nav.map(item=><div key={item[0]} className="field-nav-group"><button className={`field-nav ${active===item[0]?"active":""}`} onClick={()=>{if(item[2].length>0){setExpanded(x=>({...x,[item[0]]:!x[item[0]]}));setActive(item[0]);setChild("");setMobile(false)}else{select(item[0])}}} aria-expanded={item[2].length>0?!!expanded[item[0]]:undefined}><i>{item[0]==="dashboard"?"⌂":item[0]==="lab"?"▣":item[0]==="issues"?"!":item[0]==="profile"?"◉":"◈"}</i><span>{item[1]}</span>{item[2].length>0&&<b>{expanded[item[0]]?"−":"+"}</b>}</button>{expanded[item[0]]&&item[2].length>0&&<div className="field-subnav">{item[2].map(c=><button className={child===c&&active===item[0]?"selected":""} key={c} onClick={()=>select(item[0],c)}>{c}</button>)}</div>}</div>)}</nav>
      <div className="field-bottom"><span>● Signed-in session</span><button onClick={async()=>{await api("/auth/logout",{method:"POST"}).catch(()=>{});window.location.assign("/login")}}>↪ Sign out</button></div>
    </aside>
    <main className="field-main">
      <header className="field-top"><button className="field-mobile" onClick={()=>setMobile(!mobile)}>☰</button><div><span>Science on Wheels</span><b>›</b><strong>{child||nav.find(x=>x[0]===active)?.[1]}</strong></div><div className="field-user"><span>{user?.name}</span><small>{roleTitle}</small><div>{(user?.name||"S").slice(0,1)}</div></div></header>
      <div className="field-content">{active==="dashboard"?home():listPage()}</div>
    </main>
  </div>;
}

function List({title,items,render}:{title:string,items:any[],render:(x:any)=>any}) {
  return <section className="field-page"><div className="field-section-title"><span>FIELD OPERATIONS</span><h1>{title}</h1></div><div className="field-list">{items?.length?items.map((x:any,i)=><article className="field-list-row" key={x.id||i}>{render(x)}</article>):<div className="field-empty">No records are currently assigned to you.</div>}</div></section>;
}

function LabView({data,role,child}:{data:any,role:Role,child:string}) {
  const lab=data?.bus||data?.labs?.[0];
  if(!lab)return <section className="field-page"><div className="field-empty">No laboratory is currently assigned.</div></section>;
  return <section className="field-page"><div className="field-section-title"><span>ASSIGNED LABORATORY</span><h1>{child||"Lab Details"}</h1></div><div className="field-grid-2"><div className="field-card"><h2>{lab.busCode||lab.registrationNumber}</h2><p>Registration: {lab.registrationNumber}</p><p>Status: {lab.status}</p><p>GPS: {lab.currentLat ?? "—"}, {lab.currentLng ?? "—"}</p><p>Last GPS: {lab.lastGpsUpdate?new Date(lab.lastGpsUpdate).toLocaleString():"—"}</p></div><div className="field-card"><h2>{child==="Equipment"?"Equipment":child==="Consumables"?"Consumables":"Readiness"}</h2><p>{child==="Equipment"?`${lab.Equipment?.length||0} equipment assets are linked to this laboratory.`:"Review assigned resources and report discrepancies before field execution."}</p><div className="field-actions"><button onClick={()=>window.alert("Checklist recorded through the field workflow.")}>Complete checklist</button></div></div></div></section>;
}

function IssueForm({role,onDone}:{role:Role,onDone:()=>Promise<void>}) {
  const [category,setCategory]=useState(role==="DRIVER"?"VEHICLE":"EQUIPMENT"); const [description,setDescription]=useState(""); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
  async function submit(e:any){e.preventDefault();setBusy(true);try{await api("/field/issues",{method:"POST",body:JSON.stringify({category,description})});setDescription("");setMsg("Issue submitted.");await onDone()}catch(x){setMsg(x instanceof Error?x.message:"Unable to submit issue")}finally{setBusy(false)}}
  return <section className="field-page"><div className="field-section-title"><span>SUPPORT</span><h1>Report Issue</h1></div><form className="field-card field-form" onSubmit={submit}><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{["EQUIPMENT","INVENTORY","VEHICLE","SAFETY","TECHNICAL","SCHOOL_VISIT","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} required placeholder="Describe the field issue, discrepancy or support need."/></label><button disabled={busy}>{busy?"Submitting...":"Submit issue"}</button>{msg&&<div className="field-message">{msg}</div>}</form></section>;
}
