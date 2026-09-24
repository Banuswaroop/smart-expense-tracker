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

const API_URL = "http://127.0.0.1:8000";

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

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      logout();
      throw new Error("Session expired. Please login again.");
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

      const data = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const result = await data.json();

      if (!data.ok) {
        throw new Error(
          result?.detail || "Login failed."
        );
      }

      localStorage.setItem("token", result.access_token);
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

        setMessage("Expense updated successfully.");
      } else {
        await apiRequest("/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage("Expense added successfully.");
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

      setMessage("Expense deleted successfully.");

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

        setMessage("Budget updated successfully.");
      } else {
        await apiRequest("/budgets", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage("Budget created successfully.");
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

      setMessage("Budget deleted successfully.");

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
      <div
        style={{
          maxWidth: "500px",
          margin: "50px auto",
          padding: "30px",
          background: "white",
          borderRadius: "10px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h1>Smart Expense Tracker</h1>

        {message && (
          <p style={{ color: "green" }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: "red" }}>
            {error}
          </p>
        )}

        {!showRegister ? (
          <>
            <h2>Login</h2>

            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    email: event.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              />

              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    password:
                      event.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              />

              <button
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <br />

            <button
              onClick={() => {
                setShowRegister(true);
                setError("");
                setMessage("");
              }}
            >
              Create Account
            </button>
          </>
        ) : (
          <>
            <h2>Create Account</h2>

            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Name"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    name: event.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              />

              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    email: event.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              />

              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    password:
                      event.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              />

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Account"}
              </button>
            </form>

            <br />

            <button
              onClick={() => {
                setShowRegister(false);
                setError("");
                setMessage("");
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    );
  }

  // =========================
  // MAIN APPLICATION
  // =========================

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1>Smart Expense Tracker</h1>

          <p>
            Welcome, <strong>{user.name}</strong>
          </p>

          <p>{user.email}</p>
        </div>

        <button onClick={logout}>
          Logout
        </button>
      </div>

      {/* MESSAGES */}

      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            background: "#e8f5e9",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            background: "#ffebee",
            color: "#c62828",
          }}
        >
          {error}
        </div>
      )}

      {/* DASHBOARD */}

      <section>
        <h2>Dashboard</h2>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "20px",
              background: "white",
              borderRadius: "8px",
              minWidth: "200px",
            }}
          >
            <h3>Total Expenses</h3>

            <p>
              {dashboard?.total_expenses ?? 0}
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              background: "white",
              borderRadius: "8px",
              minWidth: "200px",
            }}
          >
            <h3>Total Amount</h3>

            <p>
              ₹
              {dashboard?.total_amount ?? 0}
            </p>
          </div>
        </div>

        <br />

        <div
          style={{
            display: "flex",
            gap: "30px",
            flexWrap: "wrap",
          }}
        >
          {/* PIE CHART */}

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              flex: "1 1 500px",
              minWidth: "400px",
            }}
          >
            <h3>Category-wise Spending</h3>

            {pieData.length === 0 ? (
              <p>No category data available.</p>
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

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              flex: "1 1 500px",
              minWidth: "400px",
            }}
          >
            <h3>Monthly Spending</h3>

            {barData.length === 0 ? (
              <p>
                No monthly data available.
              </p>
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
        </div>
      </section>

      <hr />

      {/* EXPENSE FORM */}

      <section id="expense-form">
        <h2>
          {editingExpenseId
            ? "Edit Expense"
            : "Add Expense"}
        </h2>

        <form onSubmit={handleExpenseSubmit}>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={expenseForm.amount}
            onChange={(event) =>
              setExpenseForm({
                ...expenseForm,
                amount: event.target.value,
              })
            }
          />

          {" "}

          <input
            type="text"
            placeholder="Description"
            value={expenseForm.description}
            onChange={(event) =>
              setExpenseForm({
                ...expenseForm,
                description:
                  event.target.value,
              })
            }
          />

          {" "}

          <input
            type="text"
            placeholder="Category"
            value={expenseForm.category}
            onChange={(event) =>
              setExpenseForm({
                ...expenseForm,
                category:
                  event.target.value,
              })
            }
          />

          {" "}

          <input
            type="date"
            value={expenseForm.expense_date}
            onChange={(event) =>
              setExpenseForm({
                ...expenseForm,
                expense_date:
                  event.target.value,
              })
            }
          />

          {" "}

          <button
            type="submit"
            disabled={loading}
          >
            {editingExpenseId
              ? "Update Expense"
              : "Add Expense"}
          </button>

          {editingExpenseId && (
            <>
              {" "}

              <button
                type="button"
                onClick={cancelExpenseEdit}
              >
                Cancel
              </button>
            </>
          )}
        </form>
      </section>

      <hr />

      {/* SEARCH AND FILTER */}

      <section>
        <h2>Search & Filter</h2>

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search description"
        />

        {" "}

        <input
          type="text"
          value={filterCategory}
          onChange={(event) =>
            setFilterCategory(
              event.target.value
            )
          }
          placeholder="Category"
        />

        {" "}

        <button onClick={handleSearch}>
          Search
        </button>

        {" "}

        <button
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

        <br />
        <br />

        <label>Sort By: </label>

        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value);

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

        {" "}

        <select
          value={order}
          onChange={(event) => {
            setOrder(event.target.value);

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
      </section>

      <hr />

      {/* EXPENSE LIST */}

      <section>
        <h2>Your Expenses</h2>

        {expenses.length === 0 ? (
          <p>No expenses found.</p>
        ) : (
          <ul>
            {expenses.map((expense) => (
              <li
                key={expense.id}
                style={{
                  marginBottom: "10px",
                }}
              >
                <strong>
                  {expense.description}
                </strong>

                {" - ₹"}

                {expense.amount}

                {" - "}

                {expense.category}

                {" - "}

                {expense.expense_date}

                {" "}

                <button
                  onClick={() =>
                    startEditing(expense)
                  }
                >
                  Edit
                </button>

                {" "}

                <button
                  onClick={() =>
                    handleDeleteExpense(
                      expense.id
                    )
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* PAGINATION */}

        <div>
          <button
            disabled={page <= 1}
            onClick={() =>
              fetchExpenses(page - 1)
            }
          >
            Previous
          </button>

          {" "}

          <span>
            Page {page} of{" "}
            {totalPages || 1}
          </span>

          {" "}

          <button
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
      </section>

      <hr />

      {/* BUDGET FORM */}

      <section>
        <h2>
          {editingBudgetId
            ? "Edit Budget"
            : "Create Budget"}
        </h2>

        <form onSubmit={handleBudgetSubmit}>
          <input
            type="text"
            placeholder="Category"
            value={budgetForm.category}
            onChange={(event) =>
              setBudgetForm({
                ...budgetForm,
                category:
                  event.target.value,
              })
            }
          />

          {" "}

          <input
            type="date"
            value={budgetForm.month}
            onChange={(event) =>
              setBudgetForm({
                ...budgetForm,
                month: event.target.value,
              })
            }
          />

          {" "}

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Budget Amount"
            value={budgetForm.amount}
            onChange={(event) =>
              setBudgetForm({
                ...budgetForm,
                amount: event.target.value,
              })
            }
          />

          {" "}

          <button
            type="submit"
            disabled={loading}
          >
            {editingBudgetId
              ? "Update Budget"
              : "Create Budget"}
          </button>

          {editingBudgetId && (
            <>
              {" "}

              <button
                type="button"
                onClick={cancelBudgetEdit}
              >
                Cancel
              </button>
            </>
          )}
        </form>
      </section>

      <hr />

      {/* BUDGET LIST */}

      <section>
        <h2>Your Budgets</h2>

        {budgets.length === 0 ? (
          <p>No budgets found.</p>
        ) : (
          <ul>
            {budgets.map((budget) => (
              <li
                key={budget.id}
                style={{
                  marginBottom: "10px",
                }}
              >
                <strong>
                  {budget.category}
                </strong>

                {" - ₹"}

                {budget.amount}

                {" - "}

                {budget.month}

                {" "}

                <button
                  onClick={() =>
                    startBudgetEditing(
                      budget
                    )
                  }
                >
                  Edit
                </button>

                {" "}

                <button
                  onClick={() =>
                    handleDeleteBudget(
                      budget.id
                    )
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr />

      {/* BUDGET PROGRESS */}

      <section>
        <h2>Budget Progress</h2>

        {budgetProgress.length === 0 ? (
          <p>
            No budget progress available.
          </p>
        ) : (
          <ul>
            {budgetProgress.map(
              (budget, index) => (
                <li
                  key={`${budget.category}-${budget.month}-${index}`}
                  style={{
                    marginBottom: "20px",
                  }}
                >
                  <strong>
                    {budget.category}
                  </strong>

                  <p>
                    Month: {budget.month}
                  </p>

                  <p>
                    Budget: ₹
                    {budget.budget_amount}
                  </p>

                  <p>
                    Actual: ₹
                    {budget.actual_amount}
                  </p>

                  <p>
                    Remaining: ₹
                    {budget.remaining_amount}
                  </p>

                  <p>
                    Used:{" "}
                    {budget.percentage_used}%
                  </p>

                  <p>
                    Status:{" "}
                    {budget.is_over_budget
                      ? "Over Budget"
                      : "Within Budget"}
                  </p>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;