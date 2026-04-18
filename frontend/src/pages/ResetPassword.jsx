import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || "";

  const [formData, setFormData] = useState({
    tokenOrOtp: "",
    password: "",
    confirmPassword: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.tokenOrOtp.trim()) {
      return "Token or OTP is required.";
    }

    if (!formData.password.trim()) {
      return "New password is required.";
    }

    if (!formData.confirmPassword.trim()) {
      return "Please confirm your new password.";
    }

    if (formData.password !== formData.confirmPassword) {
      return "Password and confirm password do not match.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.tokenOrOtp.length > 6) {
        await authService.resetPassword({
          token: formData.tokenOrOtp,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      } else {
        await authService.resetPasswordOtp({
          email: emailFromState, // Requires user to not reload, otherwise they need to enter again. For now using state.
          otp: formData.tokenOrOtp,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      }

      setSuccessMessage("Password reset successful. Please login again.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error?.data?.message || error.message || "Reset password failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card shadow-sm auth-card">
        <div className="card-body auth-card-body">
          <div className="text-center mb-4">
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">
              Enter your token or OTP and set a new password
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
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="tokenOrOtp" className="form-label">
                Token / OTP
              </label>
              <input
                id="tokenOrOtp"
                name="tokenOrOtp"
                type="text"
                className="form-control"
                value={formData.tokenOrOtp}
                onChange={handleChange}
                placeholder={emailFromState ? "Enter OTP (or token)" : "Enter token"}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                New password
              </label>
              <input
                id="password"
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
              <label htmlFor="confirmPassword" className="form-label">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
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
              className="btn btn-primary w-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
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