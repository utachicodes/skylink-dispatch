import { Home, Package, History, User } from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "@/contexts/AuthContext";

export const BottomNav = () => {
  const { userRole } = useAuth();

  const clientLinks = [
    { to: "/dashboard", icon: Home, label: "Home" },
    { to: "/track", icon: Package, label: "Track" },
    { to: "/history", icon: History, label: "History" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const operatorLinks = [
    { to: "/operator", icon: Home, label: "Jobs" },
    { to: "/history", icon: History, label: "History" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const links = userRole === "operator" ? operatorLinks : clientLinks;

  if (userRole === "admin") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex justify-around items-center h-16">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
            activeClassName="text-primary bg-primary/5"
          >
            <link.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
