import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");

  const [step, setStep] = useState(email ? 2 : 1); // Step 1: Email (if missing), Step 2: OTP/Token + Password
  const [formData, setFormData] = useState({
    tokenOrOtp: "",
    password: "",
    confirmPassword: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitEmail = (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setErrorMessage("");
    setStep(2);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.tokenOrOtp.trim()) return setErrorMessage("Token or OTP is required.");
    if (formData.password.length < 6) return setErrorMessage("Password must be at least 6 characters.");
    if (formData.password !== formData.confirmPassword) return setErrorMessage("Passwords do not match.");

    setIsSubmitting(true);
    try {
      const isOtp = formData.tokenOrOtp.length <= 6 && /^\d+$/.test(formData.tokenOrOtp);
      
      if (isOtp) {
        await authService.resetPasswordOtp({
          email,
          otp: formData.tokenOrOtp,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      } else {
        await authService.resetPassword({
          token: formData.tokenOrOtp,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
      }

      setSuccessMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setErrorMessage(error?.data?.message || error.message || "Reset failed");
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
              {step === 1 ? "Enter your email to continue" : "Enter verification code and new password"}
            </p>
          </div>

          {errorMessage && <div className="alert alert-danger py-2 small">{errorMessage}</div>}
          {successMessage && <div className="alert alert-success py-2 small">{successMessage}</div>}

          {step === 1 ? (
            <form onSubmit={handleSubmitEmail}>
              <div className="mb-4">
                <label className="form-label small">Email Address</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <button type="submit" className="btn btn-primary w-100">Continue</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small">Token / OTP</label>
                <input name="tokenOrOtp" type="text" className="form-control" value={formData.tokenOrOtp} onChange={handleChange} placeholder="6-digit OTP or long token" />
                <div className="form-text x-small text-muted">Check your email {email} for the code.</div>
              </div>

              <div className="mb-3">
                <label className="form-label small">New Password</label>
                <input name="password" type="password" className="form-control" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" />
              </div>

              <div className="mb-4">
                <label className="form-label small">Confirm Password</label>
                <input name="confirmPassword" type="password" className="form-control" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Reset Password"}
              </button>
              
              <button type="button" className="btn btn-link w-100 btn-sm mt-2 text-muted" onClick={() => setStep(1)}>
                Change Email
              </button>
            </form>
          )}

          <div className="text-center mt-3">
            <button type="button" className="btn btn-link p-0 text-decoration-none small" onClick={() => navigate("/login")}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}