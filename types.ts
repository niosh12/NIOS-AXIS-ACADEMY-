

export type UserRole = 'admin' | 'user' | null;

export interface UserData {
  id?: string; // Firestore doc ID
  userId: string; // NIOSA-AP-XXXX
  password?: string; 
  name: string;
  phone: string;
  address: string;
  photoBase64?: string;
  profileCompleted: boolean;
  createdAt: string;
  isActive: boolean; // Kept for backward compatibility
  status?: 'active' | 'suspended'; // New field for suspension system
  suspendReason?: string;
}

export interface AdminData {
  id?: string;
  email: string;
  password?: string;
  createdAt: string;
  role: 'super_admin' | 'admin';
}

export interface WorkReport {
  id?: string;
  userId: string;
  userName: string;
  date: string; // ISO date string
  submitTime: string;
  completeWork: string;
  pendingWork: string;
  nextDayPlan: string;
  userRemark?: string;
  status: 'submitted' | 'approved' | 'rejected';
  adminRating?: number;
  adminRemark?: string;
}

export interface CorrectionRequest {
  id?: string;
  userId: string;
  userName: string;
  field: 'Name' | 'Number' | 'Address' | 'Photo';
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestDate: string;
  approvedAt?: string;
}

export interface SuspensionRequest {
  id?: string;
  userId: string;
  userName: string;
  phone: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  adminRemark?: string;
}

export interface SessionLog {
  id?: string;
  userId: string;
  loginAt: string;
  logoutAt?: string;
  deviceInfo: string;
  ipAddress?: string;
  location?: string;
  duration?: string;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  inTime: string; // HH:MM AM/PM
  outTime?: string; 
  photoBase64: string;
  status: 'Present' | 'Absent';
  overtimeStartTime?: string;
  overtimeEndTime?: string;
  overtimeHours?: string;
  latitude?: number;
  longitude?: number;
  locationError?: string;
  // Fun Features
  funReaction?: string;
  challengeText?: string;
  challengeCompleted?: boolean;
}

export interface SystemSettings {
  id?: string;
  officeLat: number;
  officeLng: number;
  allowedRadius: number; // meters
  enableGeofencing: boolean;
}

export interface AuthState {
  role: UserRole;
  user: UserData | null; 
  loading: boolean;
}