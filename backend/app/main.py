from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.database import get_db
from app.models import User, Expense, Budget
from app.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse,
    DashboardSummary,
    MonthlySummaryResponse,
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
    BudgetProgressResponse
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)


app = FastAPI(
    swagger_ui_parameters={
        "persistAuthorization": True
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_category(category: str) -> str:
    """
    Normalize category names so that different capitalization
    is treated as the same category.

    Examples:
    food              -> Food
    FOOD              -> Food
    electronic items  -> Electronic Items
    """
    return category.strip().title()


@app.get("/")
def home():
    return {"message": "Smart Expense Tracker API is running"}


@app.get("/db-test")
def database_test(db: Session = Depends(get_db)):
    return {"message": "Database session is working"}


@app.get("/users/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    return current_user


@app.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.post("/login")
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        data={"sub": str(existing_user.id)}
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post("/expenses", response_model=ExpenseResponse)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    normalized_category = normalize_category(expense.category)

    new_expense = Expense(
        user_id=current_user.id,
        amount=expense.amount,
        description=expense.description,
        category=normalized_category,
        expense_date=expense.expense_date
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    return new_expense


@app.get("/expenses", response_model=ExpenseListResponse)
def get_expenses(
    page: int = 1,
    limit: int = 10,
    category: str | None = None,
    search: str | None = None,
    sort_by: str = "expense_date",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be at least 1"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100"
        )

    if sort_by not in ["amount", "expense_date", "created_at"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid sort field"
        )

    if order not in ["asc", "desc"]:
        raise HTTPException(
            status_code=400,
            detail="Order must be 'asc' or 'desc'"
        )

    query = db.query(Expense).filter(
        Expense.user_id == current_user.id
    )

    # Filter by category - case insensitive
    if category:
        normalized_filter_category = category.strip().lower()

        query = query.filter(
            func.lower(Expense.category) == normalized_filter_category
        )

    # Search by description
    if search:
        query = query.filter(
            Expense.description.ilike(f"%{search}%")
        )

    # Sort expenses
    sort_column = getattr(Expense, sort_by)

    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Count before pagination
    total = query.count()

    # Pagination
    offset = (page - 1) * limit

    expenses = (
        query
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": expenses,
        "page": page,
        "limit": limit,
        "total": total
    }


@app.get("/expenses/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if expense is None:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    return expense


@app.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if existing_expense is None:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    normalized_category = normalize_category(expense.category)

    existing_expense.amount = expense.amount
    existing_expense.description = expense.description
    existing_expense.category = normalized_category
    existing_expense.expense_date = expense.expense_date

    db.commit()
    db.refresh(existing_expense)

    return existing_expense


@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if existing_expense is None:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    db.delete(existing_expense)
    db.commit()

    return {
        "message": "Expense deleted successfully"
    }


@app.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id
    ).all()

    total_expenses = len(expenses)

    total_amount = sum(
        (expense.amount for expense in expenses),
        Decimal("0")
    )

    category_totals = {}

    for expense in expenses:
        normalized_category = normalize_category(expense.category)

        if normalized_category not in category_totals:
            category_totals[normalized_category] = Decimal("0")

        category_totals[normalized_category] += expense.amount

    category_summary = [
        {
            "category": category,
            "amount": amount
        }
        for category, amount in category_totals.items()
    ]

    return {
        "total_expenses": total_expenses,
        "total_amount": total_amount,
        "category_summary": category_summary
    }


@app.get(
    "/dashboard/monthly",
    response_model=MonthlySummaryResponse
)
def get_monthly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id
    ).all()

    monthly_totals = {}

    for expense in expenses:
        month = expense.expense_date.strftime("%Y-%m")

        if month not in monthly_totals:
            monthly_totals[month] = Decimal("0")

        monthly_totals[month] += expense.amount

    monthly_summary = [
        {
            "month": month,
            "amount": amount
        }
        for month, amount in sorted(monthly_totals.items())
    ]

    return {
        "monthly_summary": monthly_summary
    }


@app.post("/budgets", response_model=BudgetResponse)
def create_budget(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    normalized_category = normalize_category(budget.category)

    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        func.lower(Budget.category) == normalized_category.lower(),
        Budget.month == budget.month
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=400,
            detail="Budget already exists for this category and month"
        )

    new_budget = Budget(
        user_id=current_user.id,
        category=normalized_category,
        month=budget.month,
        amount=budget.amount
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


@app.get("/budgets", response_model=list[BudgetResponse])
def get_budgets(
    month: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Budget).filter(
        Budget.user_id == current_user.id
    )

    if month:
        query = query.filter(
            Budget.month == month
        )

    return query.order_by(Budget.month.desc()).all()


@app.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if existing_budget is None:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    normalized_category = normalize_category(budget.category)

    duplicate_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.id != budget_id,
        func.lower(Budget.category) == normalized_category.lower(),
        Budget.month == budget.month
    ).first()

    if duplicate_budget:
        raise HTTPException(
            status_code=400,
            detail="Budget already exists for this category and month"
        )

    existing_budget.category = normalized_category
    existing_budget.month = budget.month
    existing_budget.amount = budget.amount

    db.commit()
    db.refresh(existing_budget)

    return existing_budget


@app.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if existing_budget is None:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    db.delete(existing_budget)
    db.commit()

    return {
        "message": "Budget deleted successfully"
    }


@app.get(
    "/budgets/progress",
    response_model=BudgetProgressResponse
)
def get_budget_progress(
    month: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget_query = db.query(Budget).filter(
        Budget.user_id == current_user.id
    )

    if month:
        budget_query = budget_query.filter(
            Budget.month == month
        )

    budgets = budget_query.all()

    result = []

    for budget in budgets:

        actual_amount = db.query(Expense).filter(
            Expense.user_id == current_user.id,
            func.lower(Expense.category) == budget.category.lower(),
            Expense.expense_date >= budget.month,
            Expense.expense_date < (
                budget.month.replace(day=28) + timedelta(days=4)
            ).replace(day=1)
        ).with_entities(
            func.coalesce(
                func.sum(Expense.amount),
                0
            )
        ).scalar()

        actual_amount = Decimal(
            str(actual_amount)
        ).quantize(
            Decimal("0.01")
        )

        remaining_amount = (
            budget.amount - actual_amount
        ).quantize(
            Decimal("0.01")
        )

        percentage_used = (
            actual_amount / budget.amount * Decimal("100")
        ).quantize(
            Decimal("0.01")
        )

        is_over_budget = actual_amount > budget.amount

        result.append({
            "category": budget.category,
            "month": budget.month,
            "budget_amount": budget.amount,
            "actual_amount": actual_amount,
            "remaining_amount": remaining_amount,
            "percentage_used": percentage_used,
            "is_over_budget": is_over_budget
        })

    return {
        "budgets": result
    }