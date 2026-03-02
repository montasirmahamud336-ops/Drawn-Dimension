import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAdminProfile, refreshAdminProfileFromApi, clearAdminToken } from "@/components/admin/adminAuth";
import {
    LayoutDashboard,
    Briefcase,
    ShoppingBag,
    Users,
    LogOut,
    MessageSquare,
    UserSquare2,
    ClipboardCheck,
    MessageCircleMore,
    MessageSquareText,
    Globe2,
    FileText,
    Inbox,
    ShieldPlus,
} from "lucide-react";

const baseMenuItems = [
    { label: "Dashboard", to: "/cms", icon: LayoutDashboard },
    { label: "Live Works", to: "/cms/works", icon: Briefcase },
    { label: "Live Products", to: "/cms/products", icon: ShoppingBag },
    { label: "Team Members", to: "/cms/team", icon: Users },
    { label: "Reviews", to: "/cms/reviews", icon: MessageSquare },
    { label: "Employee", to: "/cms/employees", icon: UserSquare2 },
    { label: "Work Assign To", to: "/cms/work-assign", icon: ClipboardCheck },
    { label: "World Map", to: "/cms/world-map", icon: Globe2 },
    { label: "Pages", to: "/cms/pages", icon: FileText },
    { label: "Form Massage", to: "/cms/form-massage", icon: Inbox },
    { label: "Live Chat", to: "/cms/live-chat", icon: MessageSquareText },
    { label: "Chat", to: "/cms/chat", icon: MessageCircleMore },
];

const CMSLayout = () => {
    const navigate = useNavigate();
    const [adminProfile, setAdminProfile] = useState(getAdminProfile());
    const isMainAdmin = Boolean(adminProfile?.isMain);
    const menuItems = isMainAdmin
        ? [...baseMenuItems, { label: "Give Access", to: "/cms/give-access", icon: ShieldPlus }]
        : baseMenuItems;

    useEffect(() => {
        let mounted = true;
        const syncProfile = async () => {
            const profile = await refreshAdminProfileFromApi();
            if (mounted) {
                setAdminProfile(profile);
            }
        };

        void syncProfile();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } }).__lenis;
        lenis?.stop();

        return () => {
            lenis?.start();
        };
    }, []);

    const handleLogout = () => {
        clearAdminToken();
        navigate("/database/login"); // or /cms/login if I change it
    };

    return (
        <div className="h-screen min-h-0 overflow-hidden bg-background text-foreground flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border/40 bg-card/50 backdrop-blur-xl p-6 flex flex-col fixed inset-y-0 left-0 z-50">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Drawn CMS
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Management System</p>
                </div>

                <nav
                    data-lenis-prevent
                    className="cms-nav-scroll space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 touch-pan-y"
                >
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/cms"} // Only exact match for dashboard
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? "bg-primary/20 text-primary font-medium shadow-sm"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-border/40">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                data-lenis-prevent
                className="cms-main-scroll flex-1 min-h-0 h-full ml-64 p-8 animate-in fade-in duration-500 overflow-y-auto overscroll-contain"
            >
                <Outlet />
            </main>
        </div>
    );
};

export default CMSLayout;
