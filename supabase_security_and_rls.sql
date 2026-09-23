-- Morya Mess Management System - Supabase Schema & Row Level Security (RLS)
-- Tables: customers, meal_logs, expenses

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('female', 'male')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly_2meals', 'monthly_1meal')),
    total_amount NUMERIC NOT NULL DEFAULT 2500,
    paid_amount NUMERIC NOT NULL DEFAULT 2500,
    balance NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'on_leave')),
    hostel_or_address TEXT,
    college_or_work TEXT,
    photo_url TEXT,
    qr_token TEXT,
    qr_version INT DEFAULT 1,
    renewals JSONB DEFAULT '[]'::jsonb,
    payments JSONB DEFAULT '[]'::jsonb,
    leaves JSONB DEFAULT '[]'::jsonb,
    penalties JSONB DEFAULT '[]'::jsonb,
    penalty_paid BOOLEAN DEFAULT true,
    penalty_amount NUMERIC DEFAULT 0,
    penalty_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Meal Logs (Attendance & Gate Verification)
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    scan_status TEXT NOT NULL CHECK (scan_status IN ('ALLOW', 'BLOCK', 'REVIEW_REQUIRED')),
    reason TEXT NOT NULL,
    override_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    paid_to TEXT NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer')),
    bill_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Anonymous / Authenticated client access policies for Morya Mess
CREATE POLICY "Allow public read customers" ON public.customers
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert customers" ON public.customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update customers" ON public.customers
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete customers" ON public.customers
    FOR DELETE USING (true);

CREATE POLICY "Allow public read meal_logs" ON public.meal_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert meal_logs" ON public.meal_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read expenses" ON public.expenses
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete expenses" ON public.expenses
    FOR DELETE USING (true);
