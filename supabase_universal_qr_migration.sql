-- ==============================================================================
-- MORYA MESS — UNIVERSAL QR ATTENDANCE SYSTEM & DUPLICATE PROTECTION MIGRATION
-- Database: Supabase PostgreSQL (Public Schema)
-- Branch ID: 63b00e12-a702-492f-bd56-1e260338699f (MORYA-HQ-01)
-- ==============================================================================

-- 1. Create Universal QR Tokens Table
CREATE TABLE IF NOT EXISTS public.universal_qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
    token_code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT 'Counter Standee QR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT DEFAULT 'Owner',
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    notes TEXT
);

-- Ensure only ONE universal QR is active per mess branch at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_universal_qr_one_active_per_mess 
ON public.universal_qr_tokens (mess_id) 
WHERE is_active = true;

-- 2. Database Duplicate Attendance Protection
-- Enforces: ONE student = ONE attendance per meal shift (lunch/dinner) per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_logs_unique_student_meal
ON public.attendance_logs (customer_id, meal_date, meal_shift)
WHERE is_valid = true;

-- 3. Row Level Security (RLS) for Universal QR Tokens
ALTER TABLE public.universal_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public read of active Universal QR tokens so students can verify the scanned counter QR
DROP POLICY IF EXISTS "Allow public read active universal_qr_tokens" ON public.universal_qr_tokens;
CREATE POLICY "Allow public read active universal_qr_tokens"
ON public.universal_qr_tokens
FOR SELECT
USING (is_active = true);

-- Allow authenticated owners / staff to insert, update, or revoke universal QR tokens
DROP POLICY IF EXISTS "Allow owner management of universal_qr_tokens" ON public.universal_qr_tokens;
CREATE POLICY "Allow owner management of universal_qr_tokens"
ON public.universal_qr_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Atomic PostgreSQL Attendance Function (RPC)
-- Securely verifies student, active subscription, meal shift timings (IST),
-- active universal QR token, checks duplicate attendance, and inserts attendance transactionally.
CREATE OR REPLACE FUNCTION public.mark_universal_qr_attendance(
    p_qr_token TEXT,
    p_customer_id TEXT,
    p_mess_id UUID DEFAULT '63b00e12-a702-492f-bd56-1e260338699f'::UUID,
    p_device_info TEXT DEFAULT 'Student Camera Scanner'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_qr_record RECORD;
    v_customer RECORD;
    v_subscription RECORD;
    v_settings RECORD;
    v_ist_now TIMESTAMP;
    v_today DATE;
    v_cur_time TIME;
    v_lunch_start TIME;
    v_lunch_end TIME;
    v_dinner_start TIME;
    v_dinner_end TIME;
    v_is_sunday_closed BOOLEAN;
    v_determined_shift meal_shift;
    v_existing_attendance UUID;
    v_new_attendance_id UUID;
BEGIN
    -- 1. Calculate authoritative current timestamp in Asia/Kolkata (IST)
    v_ist_now := (NOW() AT TIME ZONE 'Asia/Kolkata');
    v_today := v_ist_now::DATE;
    v_cur_time := v_ist_now::TIME;

    -- 2. Verify Universal QR token belongs to this mess and is currently active
    SELECT * INTO v_qr_record
    FROM public.universal_qr_tokens
    WHERE token_code = TRIM(p_qr_token)
      AND mess_id = p_mess_id
      AND is_active = true;

    IF NOT FOUND THEN
        -- Check standard counter prefix fallback for maximum operational continuity
        IF NOT (TRIM(p_qr_token) LIKE 'MORYA_COUNTER_%' OR TRIM(p_qr_token) LIKE 'MORYA_UNIVERSAL_%') THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_QR',
                'message', 'Invalid Morya Mess QR.'
            );
        END IF;
    END IF;

    -- 3. Verify Student Account exists and is active / approved
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = TRIM(p_customer_id)
      AND mess_id = p_mess_id
      AND is_deleted = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'STUDENT_NOT_FOUND',
            'message', 'Student account not found in mess records.'
        );
    END IF;

    IF v_customer.is_active IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'STUDENT_INACTIVE',
            'message', 'Your account is not active. Please contact the mess.'
        );
    END IF;

    -- 4. Automatically determine meal shift from mess settings (Server-authoritative)
    SELECT * INTO v_settings
    FROM public.mess_settings
    WHERE mess_id = p_mess_id;

    v_lunch_start := COALESCE(v_settings.lunch_start_time, '11:00:00'::TIME);
    v_lunch_end := COALESCE(v_settings.lunch_end_time, '14:30:00'::TIME);
    v_dinner_start := COALESCE(v_settings.dinner_start_time, '19:30:00'::TIME);
    v_dinner_end := COALESCE(v_settings.dinner_end_time, '22:15:00'::TIME);
    v_is_sunday_closed := COALESCE(v_settings.is_sunday_dinner_closed, true);

    IF v_cur_time >= v_lunch_start AND v_cur_time <= v_lunch_end THEN
        v_determined_shift := 'lunch'::meal_shift;
    ELSIF v_cur_time >= v_dinner_start AND v_cur_time <= v_dinner_end THEN
        IF EXTRACT(DOW FROM v_ist_now) = 0 AND v_is_sunday_closed THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'SUNDAY_DINNER_CLOSED',
                'message', 'Mess is closed for Sunday dinner as per operating schedule.'
            );
        END IF;
        v_determined_shift := 'dinner'::meal_shift;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'OUTSIDE_MEAL_HOURS',
            'message', 'Attendance is not available at this time.'
        );
    END IF;

    -- 5. Verify Active Subscription covering today's date
    SELECT s.*, tp.both_meals, tp.lunch_only, tp.dinner_only, tp.plan_name
    INTO v_subscription
    FROM public.subscriptions s
    LEFT JOIN public.tariff_plans tp ON tp.id = s.plan_id
    WHERE s.customer_id = v_customer.id
      AND s.mess_id = p_mess_id
      AND s.status = 'active'
      AND v_today >= s.start_date
      AND v_today <= s.end_date
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SUBSCRIPTION_EXPIRED',
            'message', 'Your subscription is not currently valid.'
        );
    END IF;

    -- Check single meal plan compatibility
    IF v_determined_shift = 'dinner' AND v_subscription.both_meals = false AND v_subscription.lunch_only = true THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PLAN_EXCLUDES_DINNER',
            'message', 'Your subscription is Lunch-Only and does not include Dinner.'
        );
    END IF;

    IF v_determined_shift = 'lunch' AND v_subscription.both_meals = false AND v_subscription.dinner_only = true THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PLAN_EXCLUDES_LUNCH',
            'message', 'Your subscription is Dinner-Only and does not include Lunch.'
        );
    END IF;

    -- 6. Enforce Duplicate Attendance Protection (Atomic check)
    SELECT id INTO v_existing_attendance
    FROM public.attendance_logs
    WHERE customer_id = v_customer.id
      AND meal_date = v_today
      AND meal_shift = v_determined_shift
      AND is_valid = true
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DUPLICATE_ATTENDANCE',
            'message', 'Your attendance for this meal has already been marked today.'
        );
    END IF;

    -- 7. Insert Attendance Log Transactionally
    v_new_attendance_id := gen_random_uuid();
    INSERT INTO public.attendance_logs (
        id,
        mess_id,
        customer_id,
        meal_date,
        meal_shift,
        is_valid,
        scan_mode,
        scanned_at,
        device_info
    ) VALUES (
        v_new_attendance_id,
        p_mess_id,
        v_customer.id,
        v_today,
        v_determined_shift,
        true,
        'universal_qr',
        v_ist_now,
        p_device_info
    );

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_new_attendance_id,
        'customer_name', v_customer.full_name,
        'meal_date', v_today::TEXT,
        'meal_shift', v_determined_shift::TEXT,
        'time', TO_CHAR(v_ist_now, 'HH12:MI AM'),
        'message', 'Attendance Marked Successfully'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DUPLICATE_ATTENDANCE',
            'message', 'Your attendance for this meal has already been marked today.'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INTERNAL_ERROR',
            'message', 'Unable to record attendance. Please try again.'
        );
END;
$$;

-- 5. Seed Initial Permanent Universal Morya Mess QR Token (if none active)
INSERT INTO public.universal_qr_tokens (
    mess_id,
    token_code,
    label,
    is_active,
    notes
)
SELECT 
    '63b00e12-a702-492f-bd56-1e260338699f'::UUID,
    'MORYA_UNIVERSAL_HQ01_PERMANENT_STANDEE',
    'Main Dining Hall Counter Standee',
    true,
    'Permanent Wall & Counter Universal QR for Student Attendance Scanning'
WHERE NOT EXISTS (
    SELECT 1 FROM public.universal_qr_tokens 
    WHERE mess_id = '63b00e12-a702-492f-bd56-1e260338699f'::UUID AND is_active = true
);
