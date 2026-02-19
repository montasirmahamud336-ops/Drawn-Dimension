import { NavLink, Outlet } from "react-router-dom";
import { clearAdminToken, getAdminBaseUrl } from "@/components/admin/adminAuth";
import { Button } from "@/components/ui/button";

const menu = [
  { label: "Dashboard", to: "/database" },
  { label: "Live Works", to: "/database/works" },
  { label: "Upload New Work", to: "/database/upload" },
  { label: "Team Management", to: "/database/team" }
];

const AdminLayout = () => {
  const baseUrl = getAdminBaseUrl();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="w-64 min-h-screen border-r border-border/60 bg-background/80 backdrop-blur-xl fixed left-0 top-0 flex flex-col">
          <div className="p-6 border-b border-border/60">
            <div className="text-lg font-bold">Drawn Dimension</div>
            <div className="text-xs text-muted-foreground">Admin CMS</div>
          </div>
          <nav className="p-4 space-y-2 flex-1">
            {menu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-border/60">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                clearAdminToken();
                window.location.href = `${baseUrl}/login`;
              }}
            >
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 ml-64 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
