import { useEffect, useMemo, useState } from "react";
import {
  addDays, addMonths, addWeeks, endOfMonth, format, isSameDay,
  isSameMonth, isToday, startOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, parseISO, isBefore, startOfDay
} from "date-fns";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Circle, ClipboardList,
  LogOut, Plus, Search, Trash2, X, Pencil, ListTodo
} from "lucide-react";
import { supabase } from "./supabase";

const emptyTask = {
  title: "", description: "", category: "Personal", priority: "Medium",
  due_date: format(new Date(), "yyyy-MM-dd"), recurrence: "None"
};

function nextDueDate(dateString, recurrence) {
  const date = parseISO(dateString);
  if (recurrence === "Daily") return format(addDays(date, 1), "yyyy-MM-dd");
  if (recurrence === "Weekly") return format(addWeeks(date, 1), "yyyy-MM-dd");
  if (recurrence === "Monthly") return format(addMonths(date, 1), "yyyy-MM-dd");
  return null;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMessage("");
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    setMessage(result.error?.message || (mode === "signup"
      ? "Account created. If email confirmation is enabled, confirm your email before signing in."
      : "Signed in."));
  }

  return <main className="auth-wrap">
    <form className="auth-card" onSubmit={submit}>
      <div className="brand-mark"><ListTodo size={24}/></div>
      <h1>My Tasks</h1>
      <p className="muted">Your personal task space.</p>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"}/></label>
      <button className="primary full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      {message && <p className="message">{message}</p>}
      <button type="button" className="text-button full" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("");}}>
        {mode === "signin" ? "New here? Create your account" : "Already registered? Sign in"}
      </button>
    </form>
  </main>;
}

function TaskModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || emptyTask);
  const [saving, setSaving] = useState(false);
  function update(key, value) { setForm(old => ({ ...old, [key]: value })); }
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <form className="modal" onSubmit={submit}>
      <div className="modal-head"><h2>{initial?.id ? "Edit task" : "New task"}</h2><button type="button" className="icon-btn" onClick={onClose}><X/></button></div>
      <label>Task title<input autoFocus maxLength="160" required value={form.title} onChange={e=>update("title",e.target.value)} placeholder="What needs to get done?"/></label>
      <label>Notes / description<textarea rows="3" value={form.description} onChange={e=>update("description",e.target.value)} placeholder="Add useful details…"/></label>
      <div className="form-grid">
        <label>Category<input value={form.category} onChange={e=>update("category",e.target.value)} placeholder="Personal, Work…"/></label>
        <label>Priority<select value={form.priority} onChange={e=>update("priority",e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
        <label>Due date<input type="date" value={form.due_date || ""} onChange={e=>update("due_date",e.target.value)}/></label>
        <label>Repeat<select value={form.recurrence} onChange={e=>update("recurrence",e.target.value)}><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save task"}</button></div>
    </form>
  </div>;
}

function CalendarView({ tasks, month, setMonth, onPickDate }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), {weekStartsOn: 1}),
    end: endOfWeek(endOfMonth(month), {weekStartsOn: 1})
  });
  return <section className="calendar-panel">
    <div className="calendar-head">
      <h2>{format(month, "MMMM yyyy")}</h2>
      <div className="calendar-controls">
        <button className="icon-btn" onClick={()=>setMonth(addMonths(month,-1))}><ChevronLeft/></button>
        <button className="secondary small" onClick={()=>setMonth(new Date())}>Today</button>
        <button className="icon-btn" onClick={()=>setMonth(addMonths(month,1))}><ChevronRight/></button>
      </div>
    </div>
    <div className="calendar-grid weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d}>{d}</div>)}</div>
    <div className="calendar-grid">
      {days.map(day=>{
        const dayTasks=tasks.filter(t=>t.due_date && isSameDay(parseISO(t.due_date),day));
        return <button key={day.toISOString()} className={`day-cell ${!isSameMonth(day,month)?"outside":""} ${isToday(day)?"today":""}`} onClick={()=>onPickDate(format(day,"yyyy-MM-dd"))}>
          <span className="day-number">{format(day,"d")}</span>
          <span className="day-dots">{dayTasks.slice(0,3).map(t=><i key={t.id} className={`dot ${t.completed?"done":t.priority.toLowerCase()}`}/>)}</span>
          {dayTasks.length>0 && <span className="day-count">{dayTasks.length} task{dayTasks.length===1?"":"s"}</span>}
        </button>;
      })}
    </div>
  </section>;
}

function TaskRow({ task, onToggle, onEdit, onDelete }) {
  const overdue = task.due_date && !task.completed && isBefore(parseISO(task.due_date), startOfDay(new Date()));
  return <article className={`task-row ${task.completed?"is-complete":""}`}>
    <button className="check-btn" aria-label="Toggle completion" onClick={()=>onToggle(task)}>
      {task.completed ? <span className="checked"><Check size={14}/></span> : <Circle size={21}/>}
    </button>
    <div className="task-main">
      <div className="task-title">{task.title}</div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta">
        <span className="category-tag">{task.category}</span>
        <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
        {task.due_date && <span className={overdue?"overdue":""}><CalendarDays size={13}/> {format(parseISO(task.due_date),"d MMM yyyy")}</span>}
        {task.recurrence!=="None" && <span>↻ {task.recurrence}</span>}
      </div>
    </div>
    <div className="task-actions">
      <button className="icon-btn" aria-label="Edit task" onClick={()=>onEdit(task)}><Pencil size={16}/></button>
      <button className="icon-btn danger-hover" aria-label="Delete task" onClick={()=>onDelete(task)}><Trash2 size={16}/></button>
    </div>
  </article>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [modal, setModal] = useState(null);
  const [month, setMonth] = useState(new Date());

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,newSession)=>setSession(newSession));
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadTasks() {
    if (!session?.user) return;
    setLoading(true);
    const {data,error}=await supabase.from("tasks").select("*").order("due_date",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false});
    if(error) alert(error.message); else setTasks(data||[]);
    setLoading(false);
  }
  useEffect(()=>{if(session)loadTasks();else setTasks([]);},[session]);

  const categories=useMemo(()=>["All categories",...new Set(tasks.map(t=>t.category).filter(Boolean))],[tasks]);
  const visibleTasks=useMemo(()=>tasks.filter(t=>{
    const matchesSearch=(t.title+" "+t.description).toLowerCase().includes(search.toLowerCase());
    const matchesCategory=categoryFilter==="All categories"||t.category===categoryFilter;
    const matchesFilter=filter==="All"||(filter==="Pending"&&!t.completed)||(filter==="Completed"&&t.completed);
    return matchesSearch&&matchesCategory&&matchesFilter;
  }),[tasks,search,categoryFilter,filter]);

  const counts={total:tasks.length,pending:tasks.filter(t=>!t.completed).length,completed:tasks.filter(t=>t.completed).length};
  async function saveTask(form) {
    const payload={title:form.title.trim(),description:form.description||"",category:form.category.trim()||"Personal",priority:form.priority,due_date:form.due_date||null,recurrence:form.recurrence||"None"};
    const result=form.id
      ? await supabase.from("tasks").update(payload).eq("id",form.id).select().single()
      : await supabase.from("tasks").insert({...payload,user_id:session.user.id}).select().single();
    if(result.error){alert(result.error.message);return;}
    setModal(null);await loadTasks();
  }
  async function toggleTask(task) {
    const next=!task.completed;
    const {error}=await supabase.from("tasks").update({completed:next,updated_at:new Date().toISOString()}).eq("id",task.id);
    if(error){alert(error.message);return;}
    if(next && task.recurrence!=="None" && task.due_date) {
      const due_date=nextDueDate(task.due_date,task.recurrence);
      const {error:repeatError}=await supabase.from("tasks").insert({
        user_id:session.user.id,title:task.title,description:task.description,
        category:task.category,priority:task.priority,due_date,recurrence:task.recurrence
      });
      if(repeatError) alert("Task completed, but the next recurring task could not be created: "+repeatError.message);
    }
    await loadTasks();
  }
  async function deleteTask(task) {
    if(!confirm(`Delete "${task.title}"?`))return;
    const {error}=await supabase.from("tasks").delete().eq("id",task.id);
    if(error)alert(error.message);else setTasks(old=>old.filter(t=>t.id!==task.id));
  }
  function pickDate(date) { setView("list");setFilter("All");setSearch("");setCategoryFilter("All categories");setDateFocus(date); }
  const [dateFocus,setDateFocus]=useState(null);
  const listForDisplay=dateFocus?visibleTasks.filter(t=>t.due_date===dateFocus):visibleTasks;

  if(!authReady)return <div className="loading-screen">Loading…</div>;
  if(!session)return <AuthScreen/>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><ListTodo size={22}/></span><strong>My Tasks</strong></div>
      <button className={`nav-item ${view==="list"?"active":""}`} onClick={()=>{setView("list");setDateFocus(null);}}><ClipboardList size={18}/> Tasks</button>
      <button className={`nav-item ${view==="calendar"?"active":""}`} onClick={()=>{setView("calendar");setDateFocus(null);}}><CalendarDays size={18}/> Calendar</button>
      <div className="sidebar-bottom"><span className="user-email">{session.user.email}</span><button className="nav-item" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/> Sign out</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <div><p className="eyebrow">PERSONAL WORKSPACE</p><h1>{view==="calendar"?"Calendar":"My tasks"}</h1></div>
        <button className="primary add-button" onClick={()=>setModal(emptyTask)}><Plus size={18}/> Add task</button>
      </header>
      <section className="stats-grid">
        <div className="stat-card"><span>Total tasks</span><strong>{counts.total}</strong></div>
        <div className="stat-card"><span>Pending</span><strong>{counts.pending}</strong></div>
        <div className="stat-card"><span>Completed</span><strong>{counts.completed}</strong></div>
      </section>
      {view==="calendar" ? <CalendarView tasks={tasks} month={month} setMonth={setMonth} onPickDate={pickDate}/> :
      <section className="task-panel">
        <div className="panel-heading"><div><h2>{dateFocus?`Tasks for ${format(parseISO(dateFocus),"d MMM yyyy")}`:"Your task list"}</h2><p className="muted">{listForDisplay.length} task{listForDisplay.length===1?"":"s"}</p></div>
          {dateFocus&&<button className="text-button" onClick={()=>setDateFocus(null)}>Clear date</button>}
        </div>
        <div className="toolbar">
          <div className="search-box"><Search size={17}/><input placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Pending</option><option>Completed</option></select>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        {loading?<div className="empty-state">Loading tasks…</div>:listForDisplay.length===0?<div className="empty-state"><ClipboardList size={32}/><strong>No tasks found</strong><span>Add a task or change your filters.</span><button className="primary" onClick={()=>setModal(emptyTask)}>Create a task</button></div>:
          <div className="task-list">{listForDisplay.map(task=><TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={setModal} onDelete={deleteTask}/>)}</div>}
      </section>}
    </main>
    {modal&&<TaskModal initial={modal} onClose={()=>setModal(null)} onSave={saveTask}/>}
  </div>;
}
