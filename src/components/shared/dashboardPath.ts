export const CLIENT_DASHBOARD_PATH = "/dashboard";
export const EMPLOYEE_DASHBOARD_PATH = "/employee/dashboard";

const PREFERRED_DASHBOARD_PATH_KEY = "preferred_dashboard_path";

const normalizeDashboardPath = (value: string | null | undefined) =>
  value === EMPLOYEE_DASHBOARD_PATH ? EMPLOYEE_DASHBOARD_PATH : CLIENT_DASHBOARD_PATH;

const getBrowserStorage = () => {
  if (typeof window === "undefined") return null;
  return {
    local: window.localStorage,
    session: window.sessionStorage,
  };
};

export const getPreferredDashboardPath = () => {
  const storage = getBrowserStorage();
  if (!storage) return CLIENT_DASHBOARD_PATH;

  const storedValue =
    storage.local.getItem(PREFERRED_DASHBOARD_PATH_KEY) ??
    storage.session.getItem(PREFERRED_DASHBOARD_PATH_KEY);

  return normalizeDashboardPath(storedValue);
};

export const setPreferredDashboardPath = (path: string) => {
  const storage = getBrowserStorage();
  if (!storage) return;

  const nextPath = normalizeDashboardPath(path);
  storage.local.setItem(PREFERRED_DASHBOARD_PATH_KEY, nextPath);
  storage.session.setItem(PREFERRED_DASHBOARD_PATH_KEY, nextPath);
};

export const clearPreferredDashboardPath = () => {
  const storage = getBrowserStorage();
  if (!storage) return;

  storage.local.removeItem(PREFERRED_DASHBOARD_PATH_KEY);
  storage.session.removeItem(PREFERRED_DASHBOARD_PATH_KEY);
};
