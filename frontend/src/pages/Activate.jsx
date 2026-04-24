import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import authService from "../services/authService";
import useAuth from "../hooks/useAuth";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { fetchMe } = useAuth();
  
  const [state, setState] = useState(() => {
    if (!token) {
      return {
        status: "error",
        message: "No activation token provided.",
      };
    }

    return {
      status: "verifying",
      message: "",
    };
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const activateAccount = async () => {
      try {
        const response = await authService.activate({ token });
        setState({
          status: "success",
          message: response?.message || "Account activated successfully!",
        });
        await fetchMe(); // Refresh the user to update isActivated status
      } catch (error) {
        setState({
          status: "error",
          message: error?.data?.message || error.message || "Failed to activate account.",
        });
      }
    };

    activateAccount();
  }, [token, fetchMe]);

  return (
    <div className="auth-page">
      <div className="card shadow-sm auth-card">
        <div className="card-body auth-card-body text-center">
          <h1 className="auth-title mb-4">Account Activation</h1>
          
          {state.status === "verifying" && (
            <div>
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p>Verifying your token...</p>
            </div>
          )}

          {state.status === "success" && (
            <div>
              <div className="alert alert-success fs-5">{state.message}</div>
              <Link to="/login" className="btn btn-primary mt-3">Continue</Link>
            </div>
          )}

          {state.status === "error" && (
            <div>
              <div className="alert alert-danger fs-5">{state.message}</div>
              <Link to="/" className="btn btn-outline-secondary mt-3">Go to Home</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
