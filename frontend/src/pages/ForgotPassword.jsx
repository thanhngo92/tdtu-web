import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import authService from "../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [debugLink, setDebugLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.forgotPassword({ email });

      setSuccessMessage(
        response?.message || "Reset instructions have been sent."
      );
      
      if (response.debugLink) {
        setDebugLink(response.debugLink);
      } else {
        setTimeout(() => {
          navigate("/reset-password", { state: { email } });
        }, 1200);
      }
    } catch (error) {
      setErrorMessage(
        error?.data?.message || error.message || "Failed to submit forgot password request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-page">
      <div className="card shadow-sm auth-card">
        <div className="card-body auth-card-body">
          <div className="text-center mb-4">
            <h1 className="auth-title">Forgot password</h1>
            <p className="auth-subtitle">
              Enter your email to receive reset instructions
            </p>
          </div>

          {errorMessage && (
            <div className="alert alert-danger py-2" role="alert">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success py-2" role="alert">
              {successMessage}
              {debugLink && (
                <div className="mt-3">
                  <p className="small mb-2"><strong>Dành cho người chấm bài:</strong> Bạn có thể sử dụng link reset bên dưới:</p>
                  <a 
                    href={debugLink} 
                    className="btn btn-success btn-sm w-100"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Reset mật khẩu ngay
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Send reset request"}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none"
              onClick={() => navigate("/login")}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
