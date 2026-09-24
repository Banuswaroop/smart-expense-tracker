from datetime import date

from decimal import Decimal
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    description: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    expense_date: date


class ExpenseUpdate(BaseModel):
    amount: Decimal = Field(gt=0)
    description: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    expense_date: date

class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    description: str
    category: str
    expense_date: date

    class Config:
        from_attributes = True

class ExpenseListResponse(BaseModel):
    items: list[ExpenseResponse]
    page: int
    limit: int
    total: int

class CategorySummary(BaseModel):
    category: str
    amount: Decimal


class DashboardSummary(BaseModel):
    total_expenses: int
    total_amount: Decimal
    category_summary: list[CategorySummary]

class MonthlySummary(BaseModel):
    month: str
    amount: Decimal


class MonthlySummaryResponse(BaseModel):
    monthly_summary: list[MonthlySummary]

class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    month: date
    amount: Decimal = Field(gt=0)


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category: str
    month: date
    amount: Decimal

    class Config:
        from_attributes = True

class BudgetUpdate(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    month: date
    amount: Decimal = Field(gt=0)

class BudgetProgress(BaseModel):
    category: str
    month: date
    budget_amount: Decimal
    actual_amount: Decimal
    remaining_amount: Decimal
    percentage_used: Decimal
    is_over_budget: bool


class BudgetProgressResponse(BaseModel):
    budgets: list[BudgetProgress]