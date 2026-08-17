/** أسلوب غرفة قيادة إنسانية: تطبيق عربي RTL بمسارات محمية ولوحة مدير تعتمد حضورًا محليًا مباشرًا لا خدمة خادمية. */
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { AccessDenied } from "@/components/AppShell";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { OperationsProvider, useOperations } from "@/contexts/OperationsContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import AuditLog from "@/pages/AuditLog"; import Dashboard from "@/pages/Dashboard"; import Login from "@/pages/Login"; import ManagerDashboard from "@/pages/ManagerDashboard"; import Reports from "@/pages/Reports"; import Settings from "@/pages/Settings";
function Landing() { const { isSessionValid } = useOperations(); const [, navigate] = useLocation(); useEffect(() => { navigate(isSessionValid ? "/لوحة-التحكم" : "/تسجيل-الدخول"); }, [isSessionValid, navigate]); return null; }
function Guard({ children, managerOnly = false, adminOnly = false }: { children: React.ReactNode; managerOnly?: boolean; adminOnly?: boolean }) { const { user, isSessionValid, checkSession, canViewManagement } = useOperations(); const [, navigate] = useLocation(); useEffect(() => { checkSession(); if (!user || !isSessionValid) navigate("/تسجيل-الدخول"); }, [user, isSessionValid, navigate, checkSession]); if (!user || !isSessionValid) return null; if ((managerOnly && !canViewManagement) || (adminOnly && user.role !== "super_admin")) return <AccessDenied />; return <>{children}</>; }
function Router() { return <Switch><Route path="/" component={Landing} /><Route path="/تسجيل-الدخول" component={Login} /><Route path="/لوحة-التحكم"><Guard><Dashboard /></Guard></Route><Route path="/لوحة-المدير"><Guard managerOnly><ManagerDashboard /></Guard></Route><Route path="/التقارير"><Guard managerOnly><Reports /></Guard></Route><Route path="/سجل-التدقيق"><Guard managerOnly><AuditLog /></Guard></Route><Route path="/الإعدادات"><Guard adminOnly><Settings /></Guard></Route><Route><Landing /></Route></Switch>; }
export default function App() { return <AppearanceProvider><OperationsProvider><PresenceProvider><Toaster position="top-center" richColors closeButton /><Router /></PresenceProvider></OperationsProvider></AppearanceProvider>; }
