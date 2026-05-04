import { Outlet, Link, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Layout() {
  const { user, logout, refreshAuth } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const theme = user?.preferences?.theme || "light";
  const fontSize = user?.preferences?.fontSize || 14;

  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password", "/activate"].includes(location.pathname);

  return (
    <div
      className={`min-vh-100 ${theme === "dark" ? "bg-dark text-light" : "bg-light text-dark"}`}
      style={{ fontSize: `${fontSize}px` }}
      data-theme={theme}
    >
      {user && !isAuthPage && (
        <nav className={`navbar navbar-expand-lg border-bottom sticky-top ${theme === "dark" ? "navbar-dark bg-black" : "navbar-light bg-white"}`}>
          <div className="container-fluid px-4">
            <button
              className="btn btn-link link-dark d-lg-none p-0 me-3"
              type="button"
              id="mobile-sidebar-toggle"
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
            >
              <span className="fs-3">{"\u2630"}</span>
            </button>

            <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
              <img src="/logo.png" alt="Logo" style={{ height: "32px", borderRadius: "6px" }} />
              <span className={`fw-bold mb-0 h4 ${theme === "dark" ? "text-white" : "text-dark"}`}>NoteMate</span>
            </Link>

            <div className="ms-auto d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="rounded-circle border" style={{ width: "32px", height: "32px", objectFit: "cover" }} />
                ) : (
                  <div
                    className={`rounded-circle border d-flex align-items-center justify-content-center ${theme === "dark" ? "bg-secondary" : "bg-light"}`}
                    style={{ width: "32px", height: "32px" }}
                  >
                    <small>{"\uD83D\uDC64"}</small>
                  </div>
                )}
                <span className={`${theme === "dark" ? "text-light" : "text-muted"} small d-none d-md-inline`}>
                  {user.displayName || user.email}
                </span>
              </div>
              <Link to="/profile" className={`btn btn-sm ${theme === "dark" ? "btn-outline-light" : "btn-outline-secondary"}`}>
                Profile
              </Link>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

      {user && !user.isActivated && (
        <div className="bg-warning text-dark text-center py-2 px-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-3">
          <span>{"\u26A0\uFE0F"} Your account is unverified. Please check your email to complete the activation process.</span>
        </div>
      )}

      <main className="flex-grow-1">
        <Outlet />
      </main>
    </div>
  );
}
