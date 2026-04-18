import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import authService from "../services/authService";
import useAuth from "../hooks/useAuth";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { fetchMe } = useAuth();
  
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No activation token provided.");
      return;
    }

    const activateAccount = async () => {
      try {
        const response = await authService.activate({ token });
        setStatus("success");
        setMessage(response?.message || "Account activated successfully!");
        await fetchMe(); // Refresh the user to update isActivated status
      } catch (error) {
        setStatus("error");
        setMessage(error?.data?.message || error.message || "Failed to activate account.");
      }
    };

    activateAccount();
  }, [token, fetchMe]);

  return (
    <div className="auth-page">
      <div className="card shadow-sm auth-card">
        <div className="card-body auth-card-body text-center">
          <h1 className="auth-title mb-4">Account Activation</h1>
          
          {status === "verifying" && (
            <div>
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p>Verifying your token...</p>
            </div>
          )}

          {status === "success" && (
            <div>
              <div className="alert alert-success fs-5">{message}</div>
              <Link to="/login" className="btn btn-primary mt-3">Continue</Link>
            </div>
          )}

          {status === "error" && (
            <div>
              <div className="alert alert-danger fs-5">{message}</div>
              <Link to="/" className="btn btn-outline-secondary mt-3">Go to Home</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
