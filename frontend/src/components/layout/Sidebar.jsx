import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Users, 
  FileText, 
  BookMarked, 
  LayoutDashboard,
  Clock,
  CheckSquare
} from 'lucide-react';

const Sidebar = () => {
  const { user, isLibrarian } = useAuth();

  const userNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/books', icon: BookOpen, label: 'Browse Books' },
    { to: '/my-issues', icon: BookMarked, label: 'My Issues' },
    { to: '/my-requests', icon: FileText, label: 'My Requests' }, // ADD THIS LINE
  ];

  const librarianNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/books', icon: BookOpen, label: 'Manage Books' },
    { to: '/issues', icon: Clock, label: 'Book Issues' },
    { to: '/requests', icon: FileText, label: 'Requests' },
    { to: '/users', icon: Users, label: 'Users' },
  ];

  const navItems = isLibrarian() ? librarianNavItems : userNavItems;

  return (
    <aside className="bg-gray-50 w-64 min-h-screen border-r border-gray-200">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;