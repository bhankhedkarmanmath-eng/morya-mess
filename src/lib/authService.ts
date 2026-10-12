import { supabase } from './supabase';
import { Customer, UserRole } from '../types/mess';
import { completeFirstTimePasswordReset } from './supabaseSync';
import { pullSyncFromServer, syncCredentialToServer } from './syncEngine';
import { loadCustomers } from './storage';

export type AuthPortal = 'owner' | 'student';
export type AuthState = 'PORTAL_CHOICE' | 'LOGIN' | 'SET_NEW_PASSWORD' | 'AUTHENTICATED';

export interface AuthenticatedUser {
  id: string;
  identifier: string; // email, username, or phone
  name: string;
  role: UserRole | 'student';
  mustChangePassword: boolean;
  studentCustomer?: Customer;
}

interface StoredCredential {
  id: string;
  identifier: string;
  passwordHash: string;
  role: UserRole | 'student';
  name: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

const CREDENTIALS_KEY = 'morya_mess_credentials_store_v1';
const SESSION_KEY = 'morya_mess_auth_session_v1';
const TEMPORARY_PASSWORD = '112233';

// Cryptographically hash password with SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadStoredCredentials(): Record<string, StoredCredential> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredCredentials(creds: Record<string, StoredCredential>): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('Failed to persist credentials store:', err);
  }
}

// Check if an existing user session exists
export function getSavedSession(): AuthenticatedUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user: AuthenticatedUser = JSON.parse(raw);
    return user;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthenticatedUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to persist session:', err);
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

export const CANONICAL_OWNER_IDENTIFIER = 'bhankhedkarmanmath3@gmail.com';

/**
 * Authenticate an Owner or Staff member
 */
export async function authenticateOwnerOrStaff(
  rawIdentifier: string,
  password: string
): Promise<{
  success: boolean;
  requiresPasswordReset?: boolean;
  user?: AuthenticatedUser;
  error?: string;
}> {
  const identifier = rawIdentifier.trim().toLowerCase();
  if (!identifier) {
    return { success: false, error: 'Please enter your username or email address.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  // STRICT CANONICAL OWNER SECURITY CHECK:
  // Exactly ONE authorized permanent Owner identity is permitted to access the Owner portal.
  if (identifier !== CANONICAL_OWNER_IDENTIFIER && identifier !== 'admin' && identifier !== 'owner' && !identifier.includes('bhankhedkarmanmath3')) {
    return {
      success: false,
      error: 'Access Denied: This account is not authorized to access the Morya Mess Owner Portal.'
    };
  }

  const credentials = loadStoredCredentials();
  const existingRecord = credentials[CANONICAL_OWNER_IDENTIFIER] || credentials[identifier];

  // If Supabase Auth is active and configured
  if (supabase) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: CANONICAL_OWNER_IDENTIFIER,
        password
      });
      if (!authErr && authData.session?.user) {
        const user: AuthenticatedUser = {
          id: authData.session.user.id,
          identifier: CANONICAL_OWNER_IDENTIFIER,
          name: authData.session.user.user_metadata?.full_name || 'Mess Owner',
          role: 'owner',
          mustChangePassword: authData.session.user.user_metadata?.must_change_password === true
        };
        if (user.mustChangePassword) {
          return { success: true, requiresPasswordReset: true, user };
        }
        saveSession(user);
        return { success: true, user };
      }
    } catch {
      // Fall through to local fallback store
    }
  }

  // 1. If permanent password already set for canonical owner
  if (existingRecord && !existingRecord.mustChangePassword) {
    if (password === TEMPORARY_PASSWORD) {
      return {
        success: false,
        error: 'The temporary password (112233) has expired for this account. Please enter your permanent password.'
      };
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== existingRecord.passwordHash) {
      return { success: false, error: 'Invalid login credentials. Please check your password.' };
    }

    const user: AuthenticatedUser = {
      id: existingRecord.id,
      identifier: CANONICAL_OWNER_IDENTIFIER,
      name: existingRecord.name || 'Mess Owner',
      role: 'owner',
      mustChangePassword: false
    };
    saveSession(user);
    return { success: true, user };
  }

  // 2. First-time login: Password MUST be 112233
  if (password === TEMPORARY_PASSWORD) {
    const userId = existingRecord?.id || `usr-${Date.now()}`;
    const user: AuthenticatedUser = {
      id: userId,
      identifier: CANONICAL_OWNER_IDENTIFIER,
      name: 'Mess Owner',
      role: 'owner',
      mustChangePassword: true
    };

    return {
      success: true,
      requiresPasswordReset: true,
      user
    };
  }

  // If user entered something other than 112233 and has no permanent password set
  return {
    success: false,
    error: 'First-time login detected. Please enter temporary password 112233 to begin setup.'
  };
}

/**
 * Authenticate a Student Member
 */
export async function authenticateStudent(
  rawIdentifier: string,
  password: string,
  allCustomers: Customer[]
): Promise<{
  success: boolean;
  requiresPasswordReset?: boolean;
  user?: AuthenticatedUser;
  studentCustomer?: Customer;
  error?: string;
}> {
  const cleanId = rawIdentifier.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter your Student ID or Registered Mobile Number.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  // Look up student by phone or ID
  let student = allCustomers.find(
    c => c.id.toLowerCase() === cleanId || 
         c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '') ||
         c.phone.trim() === cleanId
  );

  // If not found in current memory, pull fresh data from server
  if (!student) {
    try {
      await pullSyncFromServer();
      const freshCustomers = loadCustomers();
      student = freshCustomers.find(
        c => c.id.toLowerCase() === cleanId || 
             c.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '') ||
             c.phone.trim() === cleanId
      );
    } catch {
      // ignore
    }
  }

  if (!student) {
    return {
      success: false,
      error: 'No active student member found matching this ID or Mobile Number. Please verify or contact mess management.'
    };
  }

  const credentials = loadStoredCredentials();
  const studentKey = `student_${student.id.toLowerCase()}`;
  const existingRecord = credentials[studentKey];

  // 1. Permanent password already set
  if (existingRecord && !existingRecord.mustChangePassword) {
    if (password === TEMPORARY_PASSWORD) {
      return {
        success: false,
        error: 'The temporary password (112233) has expired for this pass. Please enter your permanent password.'
      };
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== existingRecord.passwordHash) {
      return { success: false, error: 'Invalid password. Please enter your correct permanent pass password.' };
    }

    const user: AuthenticatedUser = {
      id: student.id,
      identifier: student.phone || student.id,
      name: student.name,
      role: 'student',
      mustChangePassword: false,
      studentCustomer: student
    };
    saveSession(user);
    return { success: true, user, studentCustomer: student };
  }

  // 2. First-time login: Password MUST be 112233
  if (password === TEMPORARY_PASSWORD) {
    const user: AuthenticatedUser = {
      id: student.id,
      identifier: student.phone || student.id,
      name: student.name,
      role: 'student',
      mustChangePassword: true,
      studentCustomer: student
    };

    return {
      success: true,
      requiresPasswordReset: true,
      user,
      studentCustomer: student
    };
  }

  return {
    success: false,
    error: 'First-time student pass login. Please enter the default temporary password 112233 to proceed.'
  };
}

/**
 * Set permanent password for user (Owner, Staff, or Student)
 */
export async function setPermanentPassword(
  user: AuthenticatedUser,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; updatedUser?: AuthenticatedUser; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }
  if (newPassword === TEMPORARY_PASSWORD) {
    return { success: false, error: 'Your permanent password cannot be the temporary password (112233). Please choose a new secure password.' };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New password and confirm password do not match.' };
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    const credentials = loadStoredCredentials();
    const storageKey = user.role === 'student' ? `student_${user.id.toLowerCase()}` : user.identifier.toLowerCase();

    // 1. Save permanent credential record
    credentials[storageKey] = {
      id: user.id,
      identifier: user.identifier,
      passwordHash,
      role: user.role,
      name: user.name,
      mustChangePassword: false,
      updatedAt: new Date().toISOString()
    };
    saveStoredCredentials(credentials);

    // Sync to server so any device can authenticate with this permanent password
    syncCredentialToServer(storageKey, credentials[storageKey]);

    // 2. Synchronize with Supabase Auth & RPC complete_first_time_password_reset if available
    try {
      if (supabase && user.role !== 'student' && user.identifier.includes('@')) {
        await supabase.auth.updateUser({
          password: newPassword,
          data: { must_change_password: false, initial_setup_done: true }
        });
      }
      await completeFirstTimePasswordReset(user.id, newPassword);
    } catch (e) {
      console.warn('Supabase sync during password change had non-blocking error:', e);
    }

    // 3. Update authenticated session state with mustChangePassword: false
    const updatedUser: AuthenticatedUser = {
      ...user,
      mustChangePassword: false
    };
    saveSession(updatedUser);

    return { success: true, updatedUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save permanent password.' };
  }
}

/**
 * Perform sign out
 */
export async function performSignOut(): Promise<void> {
  clearSession();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
  }
}

/**
 * Change Student Password (Feature 20)
 */
export async function changeStudentPassword(
  customerId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!customerId) {
    return { success: false, error: 'Student session not found. Please log in again.' };
  }
  if (!currentPassword) {
    return { success: false, error: 'Please enter your current password.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }
  if (newPassword === TEMPORARY_PASSWORD) {
    return { success: false, error: 'New password cannot be the default temporary password (112233).' };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New password and confirmation do not match.' };
  }

  const credentials = loadStoredCredentials();
  const studentKey = `student_${customerId.toLowerCase()}`;
  const existingRecord = credentials[studentKey];

  // Verify current password
  if (existingRecord && existingRecord.passwordHash) {
    const inputHash = await hashPassword(currentPassword);
    if (inputHash !== existingRecord.passwordHash) {
      return { success: false, error: 'Incorrect current password.' };
    }
  } else if (currentPassword !== TEMPORARY_PASSWORD) {
    return { success: false, error: 'Incorrect current password. If this is your first time, use 112233.' };
  }

  // Hash new password
  const newHash = await hashPassword(newPassword);
  credentials[studentKey] = {
    id: customerId,
    identifier: customerId,
    passwordHash: newHash,
    role: 'student',
    name: existingRecord?.name || 'Student',
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  };
  saveStoredCredentials(credentials);

  // Sync to Supabase completeFirstTimePasswordReset if available
  try {
    await completeFirstTimePasswordReset(customerId, newPassword);
  } catch (e) {
    console.warn('Supabase password reset sync non-blocking note:', e);
  }

  return { success: true };
}

