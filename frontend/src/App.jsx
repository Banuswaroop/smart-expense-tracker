import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import "./App.css";

const API_URL = "https://smart-expense-tracker-api-xvi4.onrender.com";

const pieColors = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff6699",
];

function App() {
  // =========================
  // AUTHENTICATION
  // =========================

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [user, setUser] = useState(null);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [showRegister, setShowRegister] = useState(false);

  // =========================
  // EXPENSE STATE
  // =========================

  const [expenses, setExpenses] = useState([]);

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    description: "",
    category: "",
    expense_date: "",
  });

  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [sortBy, setSortBy] = useState("expense_date");
  const [order, setOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // =========================
  // DASHBOARD STATE
  // =========================

  const [dashboard, setDashboard] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState([]);

  // =========================
  // BUDGET STATE
  // =========================

  const [budgets, setBudgets] = useState([]);
  const [budgetProgress, setBudgetProgress] = useState([]);

  const [budgetForm, setBudgetForm] = useState({
    category: "",
    month: "",
    amount: "",
  });

  const [editingBudgetId, setEditingBudgetId] = useState(null);

  // =========================
  // GENERAL STATE
  // =========================

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // COMMON API FUNCTION
  // =========================

  async function apiRequest(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    if (response.status === 401) {
      logout();
      throw new Error(
        "Session expired. Please login again."
      );
    }

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const detail =
        data?.detail || "Something went wrong.";

      throw new Error(detail);
    }

    return data;
  }

  // =========================
  // LOGOUT
  // =========================

  function logout() {
    localStorage.removeItem("token");

    setToken("");
    setUser(null);
    setExpenses([]);
    setDashboard(null);
    setMonthlySummary([]);
    setBudgets([]);
    setBudgetProgress([]);
    setMessage("");
    setError("");
  }

  // =========================
  // LOGIN
  // =========================

  async function handleLogin(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!loginForm.email || !loginForm.password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginForm),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail || "Login failed."
        );
      }

      localStorage.setItem(
        "token",
        result.access_token
      );

      setToken(result.access_token);

      setLoginForm({
        email: "",
        password: "",
      });

      setMessage("Login successful.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // REGISTER
  // =========================

  async function handleRegister(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !registerForm.name ||
      !registerForm.email ||
      !registerForm.password
    ) {
      setError("All registration fields are required.");
      return;
    }

    if (registerForm.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Registration failed."
        );
      }

      setRegisterForm({
        name: "",
        email: "",
        password: "",
      });

      setShowRegister(false);

      setMessage(
        "Registration successful. You can now login."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // GET CURRENT USER
  // =========================

  async function fetchCurrentUser() {
    try {
      const data = await apiRequest("/users/me");
      setUser(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // FETCH EXPENSES
  // =========================

  async function fetchExpenses(requestedPage = page) {
    try {
      const params = new URLSearchParams();

      params.append("page", requestedPage);
      params.append("limit", limit);
      params.append("sort_by", sortBy);
      params.append("order", order);

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (filterCategory.trim()) {
        params.append(
          "category",
          filterCategory.trim()
        );
      }

      const data = await apiRequest(
        `/expenses?${params.toString()}`
      );

      if (Array.isArray(data)) {
        setExpenses(data);
        setTotalExpenses(data.length);
      } else {
        setExpenses(data.items || []);
        setTotalExpenses(data.total || 0);
      }

      setPage(requestedPage);
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // FETCH DASHBOARD
  // =========================

  async function fetchDashboard() {
    try {
      const data = await apiRequest(
        "/dashboard/summary"
      );

      setDashboard(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // FETCH MONTHLY SUMMARY
  // =========================

  async function fetchMonthlySummary() {
    try {
      const data = await apiRequest(
        "/dashboard/monthly"
      );

      setMonthlySummary(
        data?.monthly_summary || []
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // FETCH BUDGETS
  // =========================

  async function fetchBudgets() {
    try {
      const data = await apiRequest("/budgets");

      if (Array.isArray(data)) {
        setBudgets(data);
      } else {
        setBudgets(
          data?.budgets || data?.items || []
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // FETCH BUDGET PROGRESS
  // =========================

  async function fetchBudgetProgress() {
    try {
      const data = await apiRequest(
        "/budgets/progress"
      );

      setBudgetProgress(data?.budgets || []);
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // LOAD ALL DATA
  // =========================

  async function loadDashboardData() {
    await Promise.all([
      fetchExpenses(1),
      fetchDashboard(),
      fetchMonthlySummary(),
      fetchBudgets(),
      fetchBudgetProgress(),
    ]);
  }

  // =========================
  // RESTORE SESSION
  // =========================

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchCurrentUser();
    loadDashboardData();
  }, [token]);

  // =========================
  // EXPENSE VALIDATION
  // =========================

  function validateExpenseForm() {
    if (!expenseForm.amount) {
      return "Amount is required.";
    }

    if (Number(expenseForm.amount) <= 0) {
      return "Amount must be greater than 0.";
    }

    if (!expenseForm.description.trim()) {
      return "Description is required.";
    }

    if (!expenseForm.category.trim()) {
      return "Category is required.";
    }

    if (!expenseForm.expense_date) {
      return "Expense date is required.";
    }

    return "";
  }

  // =========================
  // CREATE / UPDATE EXPENSE
  // =========================

  async function handleExpenseSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationError =
      validateExpenseForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        amount: Number(expenseForm.amount),
        description:
          expenseForm.description.trim(),
        category:
          expenseForm.category.trim(),
        expense_date:
          expenseForm.expense_date,
      };

      if (editingExpenseId) {
        await apiRequest(
          `/expenses/${editingExpenseId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setMessage(
          "Expense updated successfully."
        );
      } else {
        await apiRequest("/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage(
          "Expense added successfully."
        );
      }

      setExpenseForm({
        amount: "",
        description: "",
        category: "",
        expense_date: "",
      });

      setEditingExpenseId(null);

      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // START EXPENSE EDIT
  // =========================

  function startEditing(expense) {
    setEditingExpenseId(expense.id);

    setExpenseForm({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      expense_date: expense.expense_date,
    });

    setTimeout(() => {
      document
        .querySelector("#expense-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  // =========================
  // CANCEL EXPENSE EDIT
  // =========================

  function cancelExpenseEdit() {
    setEditingExpenseId(null);

    setExpenseForm({
      amount: "",
      description: "",
      category: "",
      expense_date: "",
    });
  }

  // =========================
  // DELETE EXPENSE
  // =========================

  async function handleDeleteExpense(expenseId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await apiRequest(
        `/expenses/${expenseId}`,
        {
          method: "DELETE",
        }
      );

      setMessage(
        "Expense deleted successfully."
      );

      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // SEARCH
  // =========================

  function handleSearch() {
    fetchExpenses(1);
  }

  // =========================
  // BUDGET VALIDATION
  // =========================

  function validateBudgetForm() {
    if (!budgetForm.category.trim()) {
      return "Budget category is required.";
    }

    if (!budgetForm.month) {
      return "Budget month is required.";
    }

    if (!budgetForm.amount) {
      return "Budget amount is required.";
    }

    if (Number(budgetForm.amount) <= 0) {
      return "Budget amount must be greater than 0.";
    }

    return "";
  }

  // =========================
  // CREATE / UPDATE BUDGET
  // =========================

  async function handleBudgetSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationError =
      validateBudgetForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        category:
          budgetForm.category.trim(),
        month: budgetForm.month,
        amount: Number(budgetForm.amount),
      };

      if (editingBudgetId) {
        await apiRequest(
          `/budgets/${editingBudgetId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setMessage(
          "Budget updated successfully."
        );
      } else {
        await apiRequest("/budgets", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage(
          "Budget created successfully."
        );
      }

      setBudgetForm({
        category: "",
        month: "",
        amount: "",
      });

      setEditingBudgetId(null);

      await Promise.all([
        fetchBudgets(),
        fetchBudgetProgress(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // START BUDGET EDIT
  // =========================

  function startBudgetEditing(budget) {
    setEditingBudgetId(budget.id);

    setBudgetForm({
      category: budget.category,
      month: budget.month,
      amount: budget.amount,
    });
  }

  // =========================
  // CANCEL BUDGET EDIT
  // =========================

  function cancelBudgetEdit() {
    setEditingBudgetId(null);

    setBudgetForm({
      category: "",
      month: "",
      amount: "",
    });
  }

  // =========================
  // DELETE BUDGET
  // =========================

  async function handleDeleteBudget(budgetId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this budget?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await apiRequest(
        `/budgets/${budgetId}`,
        {
          method: "DELETE",
        }
      );

      setMessage(
        "Budget deleted successfully."
      );

      await Promise.all([
        fetchBudgets(),
        fetchBudgetProgress(),
      ]);
    } catch (err) {
      setError(err.message);
    }
  }

  // =========================
  // PAGINATION
  // =========================

  const totalPages =
    Math.ceil(totalExpenses / limit);

  // =========================
  // CHART DATA
  // =========================

  const pieData =
    dashboard?.category_summary?.map(
      (item) => ({
        category: item.category,
        amount: Number(item.amount),
      })
    ) || [];

  const barData =
    monthlySummary.map((item) => ({
      month: item.month,
      amount: Number(item.amount),
    })) || [];

  // =========================
  // LOGIN / REGISTER SCREEN
  // =========================

  if (!token || !user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="brand">
            <h1 className="brand-title">
              Smart Expense Tracker
            </h1>

            <p className="brand-subtitle">
              Manage your spending with clarity.
            </p>
          </div>

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!showRegister ? (
            <>
              <div style={{ marginTop: "28px" }}>
                <h2>Welcome back</h2>

                <p>
                  Sign in to continue to your
                  expense dashboard.
                </p>
              </div>

              <form
                className="auth-form"
                onSubmit={handleLogin}
              >
                <div className="form-group">
                  <label className="form-label">
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm({
                        ...loginForm,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm({
                        ...loginForm,
                        password:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="primary"
                  disabled={loading}
                >
                  {loading
                    ? "Logging in..."
                    : "Login"}
                </button>
              </form>

              <div
                style={{
                  marginTop: "24px",
                  textAlign: "center",
                }}
              >
                <p>
                  Don't have an account?
                </p>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowRegister(true);
                    setError("");
                    setMessage("");
                  }}
                >
                  Create Account
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: "28px" }}>
                <h2>Create your account</h2>

                <p>
                  Start managing your expenses
                  in one place.
                </p>
              </div>

              <form
                className="auth-form"
                onSubmit={handleRegister}
              >
                <div className="form-group">
                  <label className="form-label">
                    Name
                  </label>

                  <input
                    type="text"
                    placeholder="Your name"
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm({
                        ...registerForm,
                        name:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm({
                        ...registerForm,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={
                      registerForm.password
                    }
                    onChange={(event) =>
                      setRegisterForm({
                        ...registerForm,
                        password:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="primary"
                  disabled={loading}
                >
                  {loading
                    ? "Creating..."
                    : "Create Account"}
                </button>
              </form>

              <div
                style={{
                  marginTop: "24px",
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowRegister(false);
                    setError("");
                    setMessage("");
                  }}
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // =========================
  // MAIN APPLICATION
  // =========================

  return (
    <div className="app-container">

      {/* HEADER */}

      <header className="app-header">
        <div className="header-content">

          <div className="brand">
            <h1 className="brand-title">
              Smart Expense Tracker
            </h1>

            <p className="brand-subtitle">
              Personal finance dashboard
            </p>
          </div>

          <div className="header-actions">
            <div
              style={{
                textAlign: "right",
                marginRight: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {user.name}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                {user.email}
              </div>
            </div>

            <button
              className="secondary"
              onClick={logout}
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      <main className="main-content">

        {/* PAGE INTRO */}

        <div className="dashboard-section">
          <h1 className="page-title">
            Dashboard
          </h1>

          <p className="page-description">
            Track your spending, manage expenses,
            and monitor your monthly budgets.
          </p>
        </div>

        {/* MESSAGES */}

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* SUMMARY CARDS */}

        <section className="summary-grid">

          <div className="summary-card">
            <p className="summary-label">
              Total Expenses
            </p>

            <p className="summary-value">
              {dashboard?.total_expenses ?? 0}
            </p>
          </div>

          <div className="summary-card">
            <p className="summary-label">
              Total Amount
            </p>

            <p className="summary-value">
              ₹{dashboard?.total_amount ?? 0}
            </p>
          </div>

          <div className="summary-card">
            <p className="summary-label">
              Current Page
            </p>

            <p className="summary-value">
              {page}
            </p>
          </div>

        </section>

        {/* CHARTS */}

        <section className="chart-grid">

          {/* PIE CHART */}

          <div className="chart-card">

            <h2>Category-wise Spending</h2>

            {pieData.length === 0 ? (
              <div className="empty-state">
                No category data available.
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "400px",
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="45%"
                      outerRadius={120}
                      label
                      labelLine
                    >
                      {pieData.map(
                        (item, index) => (
                          <Cell
                            key={`${item.category}-${index}`}
                            fill={
                              pieColors[
                                index %
                                  pieColors.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        `₹${value}`
                      }
                    />

                    <Legend
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

          </div>

          {/* BAR CHART */}

          <div className="chart-card">

            <h2>Monthly Spending</h2>

            {barData.length === 0 ? (
              <div className="empty-state">
                No monthly data available.
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "400px",
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={barData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis dataKey="month" />

                    <YAxis />

                    <Tooltip
                      formatter={(value) =>
                        `₹${value}`
                      }
                    />

                    <Bar
                      dataKey="amount"
                      name="Amount Spent"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          </div>

        </section>

        {/* EXPENSE FORM */}

        <section
          id="expense-form"
          className="dashboard-section"
        >
          <div className="section-card">

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {editingExpenseId
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>

                <p className="section-description">
                  Record your spending details.
                </p>
              </div>
            </div>

            <form
              className="form-grid"
              onSubmit={handleExpenseSubmit}
            >

              <div className="form-group">
                <label className="form-label">
                  Amount
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm({
                      ...expenseForm,
                      amount:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Date
                </label>

                <input
                  type="date"
                  value={
                    expenseForm.expense_date
                  }
                  onChange={(event) =>
                    setExpenseForm({
                      ...expenseForm,
                      expense_date:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Description
                </label>

                <input
                  type="text"
                  placeholder="e.g. Grocery shopping"
                  value={
                    expenseForm.description
                  }
                  onChange={(event) =>
                    setExpenseForm({
                      ...expenseForm,
                      description:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Category
                </label>

                <input
                  type="text"
                  placeholder="e.g. Food"
                  value={
                    expenseForm.category
                  }
                  onChange={(event) =>
                    setExpenseForm({
                      ...expenseForm,
                      category:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <button
                  type="submit"
                  className="primary"
                  disabled={loading}
                >
                  {editingExpenseId
                    ? "Update Expense"
                    : "Add Expense"}
                </button>

                {editingExpenseId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={
                      cancelExpenseEdit
                    }
                  >
                    Cancel
                  </button>
                )}
              </div>

            </form>

          </div>
        </section>

        {/* SEARCH AND FILTER */}

        <section className="dashboard-section">

          <div className="section-card">

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  Search & Filter
                </h2>

                <p className="section-description">
                  Find and sort your expenses.
                </p>
              </div>
            </div>

            <div className="filter-bar">

              <div className="form-group">
                <label className="form-label">
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search description"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Category
                </label>

                <input
                  type="text"
                  value={
                    filterCategory
                  }
                  onChange={(event) =>
                    setFilterCategory(
                      event.target.value
                    )
                  }
                  placeholder="Category"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Sort By
                </label>

                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(
                      event.target.value
                    );

                    setTimeout(() => {
                      fetchExpenses(1);
                    }, 0);
                  }}
                >
                  <option value="expense_date">
                    Date
                  </option>

                  <option value="amount">
                    Amount
                  </option>

                  <option value="created_at">
                    Created Time
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Order
                </label>

                <select
                  value={order}
                  onChange={(event) => {
                    setOrder(
                      event.target.value
                    );

                    setTimeout(() => {
                      fetchExpenses(1);
                    }, 0);
                  }}
                >
                  <option value="desc">
                    Descending
                  </option>

                  <option value="asc">
                    Ascending
                  </option>
                </select>
              </div>

            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                className="primary"
                onClick={handleSearch}
              >
                Search
              </button>

              <button
                className="secondary"
                onClick={() => {
                  setSearch("");
                  setFilterCategory("");

                  setTimeout(() => {
                    fetchExpenses(1);
                  }, 0);
                }}
              >
                Clear Filters
              </button>
            </div>

          </div>

        </section>

        {/* EXPENSE LIST */}

        <section className="dashboard-section">

          <div className="section-card">

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  Your Expenses
                </h2>

                <p className="section-description">
                  View, edit, and manage your
                  recorded expenses.
                </p>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="empty-state">
                No expenses found.
              </div>
            ) : (
              <div className="table-wrapper">

                <table className="expense-table">

                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {expenses.map(
                      (expense) => (
                        <tr key={expense.id}>

                          <td>
                            <span className="expense-description">
                              {
                                expense.description
                              }
                            </span>
                          </td>

                          <td>
                            <span className="expense-amount">
                              ₹{expense.amount}
                            </span>
                          </td>

                          <td>
                            <span className="category-badge">
                              {
                                expense.category
                              }
                            </span>
                          </td>

                          <td>
                            {expense.expense_date}
                          </td>

                          <td>
                            <div className="table-actions">

                              <button
                                className="secondary"
                                onClick={() =>
                                  startEditing(
                                    expense
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="danger"
                                onClick={() =>
                                  handleDeleteExpense(
                                    expense.id
                                  )
                                }
                              >
                                Delete
                              </button>

                            </div>
                          </td>

                        </tr>
                      )
                    )}
                  </tbody>

                </table>

              </div>
            )}

            {/* PAGINATION */}

            <div className="pagination">

              <button
                className="secondary"
                disabled={page <= 1}
                onClick={() =>
                  fetchExpenses(page - 1)
                }
              >
                Previous
              </button>

              <span className="pagination-info">
                Page {page} of{" "}
                {totalPages || 1}
              </span>

              <button
                className="secondary"
                disabled={
                  page >= totalPages ||
                  totalPages === 0
                }
                onClick={() =>
                  fetchExpenses(page + 1)
                }
              >
                Next
              </button>

            </div>

          </div>

        </section>

        {/* BUDGET FORM */}

        <section className="dashboard-section">

          <div className="section-card">

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {editingBudgetId
                    ? "Edit Budget"
                    : "Create Budget"}
                </h2>

                <p className="section-description">
                  Set spending limits for your
                  categories.
                </p>
              </div>
            </div>

            <form
              className="form-grid"
              onSubmit={handleBudgetSubmit}
            >

              <div className="form-group">
                <label className="form-label">
                  Category
                </label>

                <input
                  type="text"
                  placeholder="e.g. Food"
                  value={
                    budgetForm.category
                  }
                  onChange={(event) =>
                    setBudgetForm({
                      ...budgetForm,
                      category:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Month
                </label>

                <input
                  type="date"
                  value={
                    budgetForm.month
                  }
                  onChange={(event) =>
                    setBudgetForm({
                      ...budgetForm,
                      month:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Budget Amount
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={
                    budgetForm.amount
                  }
                  onChange={(event) =>
                    setBudgetForm({
                      ...budgetForm,
                      amount:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                  gap: "10px",
                }}
              >
                <button
                  type="submit"
                  className="primary"
                  disabled={loading}
                >
                  {editingBudgetId
                    ? "Update Budget"
                    : "Create Budget"}
                </button>

                {editingBudgetId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={
                      cancelBudgetEdit
                    }
                  >
                    Cancel
                  </button>
                )}
              </div>

            </form>

          </div>

        </section>

        {/* BUDGET LIST */}

        <section className="dashboard-section">

          <div className="section-card">

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  Your Budgets
                </h2>

                <p className="section-description">
                  Manage your category spending
                  limits.
                </p>
              </div>
            </div>

            {budgets.length === 0 ? (
              <div className="empty-state">
                No budgets found.
              </div>
            ) : (
              <div className="budget-grid">

                {budgets.map((budget) => (
                  <div
                    className="budget-card"
                    key={budget.id}
                  >

                    <div className="budget-header">

                      <div>
                        <h3 className="budget-category">
                          {budget.category}
                        </h3>

                        <span className="budget-month">
                          {budget.month}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          className="secondary"
                          onClick={() =>
                            startBudgetEditing(
                              budget
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="danger"
                          onClick={() =>
                            handleDeleteBudget(
                              budget.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>

                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#6b7280",
                      }}
                    >
                      Budget amount
                    </p>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        fontSize: "24px",
                        fontWeight: "700",
                      }}
                    >
                      ₹{budget.amount}
                    </p>

                  </div>
                ))}

              </div>
            )}

          </div>

        </section>

        {/* BUDGET PROGRESS */}

        <section className="dashboard-section">

          <div className="section-card">

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  Budget Progress
                </h2>

                <p className="section-description">
                  Compare your actual spending
                  with your budgets.
                </p>
              </div>
            </div>

            {budgetProgress.length === 0 ? (
              <div className="empty-state">
                No budget progress available.
              </div>
            ) : (
              <div className="budget-grid">

                {budgetProgress.map(
                  (budget, index) => {

                    const percentage =
                      Math.min(
                        Number(
                          budget.percentage_used
                        ),
                        100
                      );

                    return (
                      <div
                        className="budget-card"
                        key={`${budget.category}-${budget.month}-${index}`}
                      >

                        <div className="budget-header">

                          <div>
                            <h3 className="budget-category">
                              {budget.category}
                            </h3>

                            <span className="budget-month">
                              {budget.month}
                            </span>
                          </div>

                          <span
                            className={`budget-status ${
                              budget.is_over_budget
                                ? "danger"
                                : "success"
                            }`}
                          >
                            {budget.is_over_budget
                              ? "Over Budget"
                              : "Within Budget"}
                          </span>

                        </div>

                        <div className="budget-values">

                          <div>
                            <p className="budget-value-label">
                              Budget
                            </p>

                            <p className="budget-value">
                              ₹
                              {
                                budget.budget_amount
                              }
                            </p>
                          </div>

                          <div>
                            <p className="budget-value-label">
                              Actual
                            </p>

                            <p className="budget-value">
                              ₹
                              {
                                budget.actual_amount
                              }
                            </p>
                          </div>

                          <div>
                            <p className="budget-value-label">
                              Remaining
                            </p>

                            <p className="budget-value">
                              ₹
                              {
                                budget.remaining_amount
                              }
                            </p>
                          </div>

                        </div>

                        <div className="progress-container">
                          <div
                            className={`progress-bar ${
                              budget.is_over_budget
                                ? "over-budget"
                                : ""
                            }`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <p
                          style={{
                            margin:
                              "10px 0 0",
                            color:
                              "#6b7280",
                            fontSize:
                              "13px",
                          }}
                        >
                          Used:{" "}
                          {
                            budget.percentage_used
                          }
                          %
                        </p>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </section>

      </main>
    </div>
  );
}

export default App;