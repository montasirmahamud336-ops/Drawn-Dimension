import { Navigate } from "react-router-dom";
import { isAdminAuthed } from "@/components/admin/adminAuth";

const AdminProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (!isAdminAuthed()) {
    return <Navigate to="/database/login" replace />;
  }
  return children;
};

export default AdminProtectedRoute;
