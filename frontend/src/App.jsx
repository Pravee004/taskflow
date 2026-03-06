import { useState, useEffect, useContext, createContext, useCallback } from "react";

// ─── API CONFIG ─────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api/v1";
// const API_BASE = "https://YOUR-RAILWAY-URL.railway.app/api/v1";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || "Request failed" };
  return data;
}

// ─── AUTH CONTEXT ────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const login = (userData, tokens) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) await apiFetch("/auth/logout/", { method: "POST", body: JSON.stringify({ refresh }) });
    } catch {}
    localStorage.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

// ─── ICONS (SVG) ────────────────────────────────────────────────────────────
const Icon = {
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Task: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  Logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Shield: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l9 4v6c0 5.25-3.75 10.15-9 11.5C6.75 21.15 3 16.25 3 11V5l9-4z"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      background: type === "error" ? "#ff4757" : "#2ed573",
      color: "#fff", padding: "12px 20px", borderRadius: 10,
      fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)", animation: "slideIn 0.3s ease",
      display: "flex", alignItems: "center", gap: 10, maxWidth: 360,
    }}>
      {type === "error" ? "✕" : "✓"} {message}
    </div>
  );
}

function Badge({ children, color }) {
  const colors = {
    todo: { bg: "#e8f4fd", text: "#1e90ff" },
    in_progress: { bg: "#fff3cd", text: "#d68910" },
    done: { bg: "#d4efdf", text: "#1e8449" },
    low: { bg: "#eaf5ea", text: "#27ae60" },
    medium: { bg: "#fef9e7", text: "#f39c12" },
    high: { bg: "#fdecea", text: "#e74c3c" },
    admin: { bg: "#f0e6ff", text: "#7b2fff" },
    user: { bg: "#e6f0ff", text: "#3a86ff" },
  };
  const style = colors[color] || { bg: "#f0f0f0", text: "#666" };
  return (
    <span style={{
      background: style.bg, color: style.text,
      padding: "2px 10px", borderRadius: 20, fontSize: 11,
      fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {color === "admin" && <Icon.Shield />}
      {children}
    </span>
  );
}

// ─── AUTH PAGES ──────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", username: "", full_name: "", password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await apiFetch("/auth/login/", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
        login(res.data.user, { access: res.data.access, refresh: res.data.refresh });
      } else {
        const res = await apiFetch("/auth/register/", { method: "POST", body: JSON.stringify(form) });
        login(res.data.user, res.data.tokens);
      }
    } catch (e) {
      setToast({ message: e.message || "Something went wrong", type: "error" });
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { outline: none; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div style={{
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24,
        padding: "48px 40px", width: "100%", maxWidth: 420,
        animation: "fadeUp 0.5s ease",
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #7b2fff, #00d2ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 24,
          }}>✓</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", color: "#fff", fontSize: 28, fontWeight: 800 }}>TaskFlow</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 6 }}>
            {mode === "login" ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, transition: "all 0.2s",
              background: mode === m ? "#7b2fff" : "transparent",
              color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
            }}>
              {m === "login" ? "Log In" : "Register"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <>
              <Input label="Full Name" value={form.full_name} onChange={v => set("full_name", v)} placeholder="John Doe" />
              <Input label="Username" value={form.username} onChange={v => set("username", v)} placeholder="johndoe" />
            </>
          )}
          <Input label="Email" value={form.email} onChange={v => set("email", v)} placeholder="you@example.com" type="email" />
          <Input label="Password" value={form.password} onChange={v => set("password", v)} placeholder="Min 8 chars, 1 uppercase, 1 digit" type="password" />
          {mode === "register" && (
            <Input label="Confirm Password" value={form.confirm_password} onChange={v => set("confirm_password", v)} placeholder="Repeat password" type="password" />
          )}
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "14px", marginTop: 24, borderRadius: 12, border: "none",
          background: loading ? "rgba(123,47,255,0.5)" : "linear-gradient(135deg, #7b2fff, #00d2ff)",
          color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer", transition: "opacity 0.2s",
          letterSpacing: 0.5,
        }}>
          {loading ? "Please wait..." : mode === "login" ? "Log In →" : "Create Account →"}
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, display: "block" }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "#7b2fff"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
      />
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filters, setFilters] = useState({ status: "", priority: "" });

  const notify = (message, type = "success") => setToast({ message, type });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      const [taskRes, statsRes] = await Promise.all([
        apiFetch(`/tasks/?${params}`),
        apiFetch("/tasks/stats/"),
      ]);
      setTasks(taskRes.data || taskRes.results || []);
      setStats(statsRes.data);
    } catch (e) {
      notify(e.message, "error");
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await apiFetch(`/tasks/${id}/`, { method: "DELETE" });
      notify("Task deleted.");
      fetchTasks();
    } catch (e) { notify(e.message, "error"); }
  };

  const toggleStatus = async (task) => {
    const next = { todo: "in_progress", in_progress: "done", done: "todo" };
    try {
      await apiFetch(`/tasks/${task.id}/`, { method: "PATCH", body: JSON.stringify({ status: next[task.status] }) });
      fetchTasks();
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        .task-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(123,47,255,0.15) !important; }
        .action-btn:hover { opacity: 0.7; }
        .filter-btn.active { background: #7b2fff !important; color: #fff !important; }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={() => { fetchTasks(); setShowModal(false); setEditTask(null); notify(editTask ? "Task updated!" : "Task created!"); }}
          onError={(msg) => notify(msg, "error")}
        />
      )}

      {/* Navbar */}
      <div style={{
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, fontSize: 16,
            background: "linear-gradient(135deg, #7b2fff, #00d2ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✓</div>
          <span style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>TaskFlow</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{user?.full_name || user?.username}</div>
            <Badge color={user?.role}>{user?.role}</Badge>
          </div>
          <button onClick={logout} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "8px 14px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500,
          }}>
            <Icon.Logout /> Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Tasks", value: stats.total, color: "#7b2fff" },
              { label: "To Do", value: stats.todo, color: "#3a86ff" },
              { label: "In Progress", value: stats.in_progress, color: "#f39c12" },
              { label: "Done", value: stats.done, color: "#2ed573" },
              { label: "High Priority", value: stats.high_priority, color: "#ff4757" },
            ].map(s => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "20px", animation: "fadeUp 0.4s ease",
              }}>
                <div style={{ color: s.color, fontSize: 32, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4, fontWeight: 500 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <Icon.Filter />
            </div>
            {["", "todo", "in_progress", "done"].map(s => (
              <button key={s} className={`filter-btn${filters.status === s ? " active" : ""}`}
                onClick={() => setFilters(f => ({ ...f, status: s }))}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
                  background: filters.status === s ? "#7b2fff" : "transparent",
                  color: filters.status === s ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                }}>
                {s || "All Status"}
              </button>
            ))}
            {["", "low", "medium", "high"].map(p => (
              <button key={p} className={`filter-btn${filters.priority === p ? " active" : ""}`}
                onClick={() => setFilters(f => ({ ...f, priority: p }))}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
                  background: filters.priority === p ? "#7b2fff" : "transparent",
                  color: filters.priority === p ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                }}>
                {p || "All Priority"}
              </button>
            ))}
          </div>

          <button onClick={() => setShowModal(true)} style={{
            background: "linear-gradient(135deg, #7b2fff, #00d2ff)", border: "none",
            color: "#fff", borderRadius: 12, padding: "10px 20px",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icon.Plus /> New Task
          </button>
        </div>

        {/* Task List */}
        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 60, fontSize: 14 }}>Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>No tasks yet. Create your first one!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.map(task => (
              <div key={task.id} className="task-card" style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "18px 22px", display: "flex",
                alignItems: "center", gap: 16, transition: "all 0.25s ease", cursor: "default",
              }}>
                <button onClick={() => toggleStatus(task)} style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${task.status === "done" ? "#2ed573" : "rgba(255,255,255,0.2)"}`,
                  background: task.status === "done" ? "#2ed573" : "transparent",
                  color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  {task.status === "done" && <Icon.Check />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{
                      color: task.status === "done" ? "rgba(255,255,255,0.3)" : "#fff",
                      fontWeight: 600, fontSize: 15,
                      textDecoration: task.status === "done" ? "line-through" : "none",
                    }}>{task.title}</span>
                    <Badge color={task.status}>{task.status.replace("_", " ")}</Badge>
                    <Badge color={task.priority}>{task.priority}</Badge>
                  </div>
                  {task.description && (
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {task.due_date && (
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>📅 {task.due_date}</span>
                    )}
                    {task.tags?.map(t => (
                      <span key={t} style={{
                        background: "rgba(123,47,255,0.15)", color: "#7b2fff",
                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      }}>#{t}</span>
                    ))}
                    {user?.role === "admin" && (
                      <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>by {task.username}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="action-btn" onClick={() => { setEditTask(task); setShowModal(true); }} style={{
                    background: "rgba(58,134,255,0.1)", border: "none", color: "#3a86ff",
                    borderRadius: 8, padding: "8px", cursor: "pointer", transition: "opacity 0.2s",
                  }}><Icon.Edit /></button>
                  <button className="action-btn" onClick={() => deleteTask(task.id)} style={{
                    background: "rgba(255,71,87,0.1)", border: "none", color: "#ff4757",
                    borderRadius: 8, padding: "8px", cursor: "pointer", transition: "opacity 0.2s",
                  }}><Icon.Trash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TASK MODAL ───────────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "todo",
    priority: task?.priority || "medium",
    due_date: task?.due_date || "",
    tags: (task?.tags || []).join(", "),
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        due_date: form.due_date || null,
      };
      if (task) {
        await apiFetch(`/tasks/${task.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/tasks/", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (e) { onError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#13132a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
        padding: "32px", width: "100%", maxWidth: 520, animation: "fadeUp 0.3s ease",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <h2 style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: 22, marginBottom: 24 }}>
          {task ? "Edit Task" : "New Task"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Title">
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?"
              style={inputStyle} onFocus={e => e.target.style.borderColor="#7b2fff"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Optional description..." rows={3}
              style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Status">
              <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={e => set("priority", e.target.value)} style={inputStyle}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>
          <Field label="Due Date">
            <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Tags (comma separated)">
            <input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="work, urgent, design"
              style={inputStyle} onFocus={e => e.target.style.borderColor="#7b2fff"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.5)",
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{
            flex: 2, padding: "12px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #7b2fff, #00d2ff)", color: "#fff",
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15,
          }}>
            {loading ? "Saving…" : task ? "Update Task" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none",
  transition: "border-color 0.2s",
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, display: "block" }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <AuthPage />;
}

function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export { Root };
