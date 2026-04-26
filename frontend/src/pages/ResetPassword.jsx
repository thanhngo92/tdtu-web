import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [formData, setFormData] = useState({
    tokenOrOtp: "",
    password: "",
    confirmPassword: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSuccessful, setIsResetSuccessful] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.tokenOrOtp.trim()) {
      return setErrorMessage("Verification code is required.");
    }

    if (formData.password.length < 6) {
      return setErrorMessage("Password must be at least 6 characters.");
    }

    if (formData.password !== formData.confirmPassword) {
      return setErrorMessage("Passwords do not match.");
    }

    setIsSubmitting(true);

    try {
      const isOtp =
        formData.tokenOrOtp.length <= 6 && /^\d+$/.test(formData.tokenOrOtp);

      if (isOtp) {
        await authService.resetPasswordOtp({
          email: email.toLowerCase().trim(),
          otp: formData.tokenOrOtp.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      } else {
        await authService.resetPassword({
          token: formData.tokenOrOtp.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      }

      setSuccessMessage("Password reset successful! Redirecting to login...");
      setIsResetSuccessful(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setErrorMessage(error?.data?.message || error.message || "Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsResending(true);

    try {
      await authService.forgotPassword({ email });
      setSuccessMessage("A new verification code has been sent to your email.");
    } catch (error) {
      setErrorMessage(
        error?.data?.message || error.message || "Failed to resend code"
      );
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="auth-page">
      <div className="card shadow-sm auth-card">
        <div className="card-body auth-card-body">
          {isResetSuccessful ? (
            <div className="text-center py-4">
              <div className="display-4 text-success mb-3">{"\u2705"}</div>
              <h2 className="h4 fw-bold">Password Reset</h2>
              <p className="text-muted mb-0">{successMessage}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <h1 className="auth-title">Reset Password</h1>

                <p className="auth-subtitle mb-0">
                  Enter the verification code sent to your email and choose a
                  new password.
                </p>
              </div>

              {successMessage && (
                <div className="alert alert-success py-2 small mb-4">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="alert alert-danger py-2 small mb-4">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">
                      Verification Code
                    </label>

                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none small fw-medium"
                      style={{ fontSize: "0.75rem" }}
                      disabled={isResending}
                      onClick={handleResendCode}
                    >
                      {isResending ? "Sending..." : "Resend Code"}
                    </button>
                  </div>

                  <input
                    name="tokenOrOtp"
                    type="text"
                    className="form-control"
                    value={formData.tokenOrOtp}
                    onChange={handleChange}
                    placeholder="Enter your code"
                    autoComplete="one-time-code"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">New Password</label>

                  <input
                    name="password"
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Confirm Password</label>

                  <input
                    name="confirmPassword"
                    type="password"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>

                <div className="auth-switch mt-2 text-center">
                  <span className="text-muted">Entered the wrong email? </span>

                  <button
                    type="button"
                    className="btn btn-link text-decoration-none auth-link-btn"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Change Email
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}