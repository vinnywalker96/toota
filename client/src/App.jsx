import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { lazyImport } from './utils/lazyImport';

// Lazy load components
const Homepage = lazyImport(() => import('./pages/Homepage'));
const AboutUs = lazyImport(() => import('./pages/AboutUs'));
const BecomeDriver = lazyImport(() => import('./pages/BecomeDriver'));
const FAQPage = lazyImport(() => import('./pages/FAQPage'));
const NotFound = lazyImport(() => import('./pages/NotFound'));

// Auth components
const UserLoginForm = lazyImport(() => import('./components/User/UserLoginForm'));
const UserRegistrationForm = lazyImport(() => import('./components/User/UserRegistrationForm'));
const ForgotPasswordForm = lazyImport(() => import('./components/User/ForgotPasswordForm'));
const ResetPasswordForm = lazyImport(() => import('./components/User/ResetPasswordForm'));

const DriverLoginForm = lazyImport(() => import('./components/Driver/DriverLoginForm'));
const DriverRegistrationForm = lazyImport(() => import('./components/Driver/DriverRegistrationForm'));
const DriverForgotPasswordForm = lazyImport(() => import('./components/Driver/DriverForgotPasswordForm'));
const DriverResetPasswordForm = lazyImport(() => import('./components/Driver/DriverResetPasswordForm'));
const DocumentUploadForm = lazyImport(() => import('./components/Driver/DocumentUploadForm'));

const AdminLogin = lazyImport(() => import('./components/Admin/AdminLogin'));
const AdminSignup = lazyImport(() => import('./components/Admin/AdminSignup'));

// Layout components
const Layout = lazyImport(() => import('./components/Layout/User/Layout'));
const LayoutDriver = lazyImport(() => import('./components/Layout/Driver/LayoutDriver'));
const LayoutAdmin = lazyImport(() => import('./components/Layout/Admin/LayoutAdmin'));

// User dashboard components
const Dashboard = lazyImport(() => import('./components/User/Dashboard'));
const ProfilePage = lazyImport(() => import('./components/User/ProfilePage'));
const RideHistory = lazyImport(() => import('./pages/RideHistory'));
const UserCalendar = lazyImport(() => import('./components/User/UserCalendar'));
const Logout = lazyImport(() => import('./components/User/Logout'));

// Driver dashboard components
const DriverDashboard = lazyImport(() => import('./components/Driver/DriverDashboard'));
const DriverProfile = lazyImport(() => import('./components/Driver/DriverProfile'));
const History = lazyImport(() => import('./components/Driver/History'));
const DriverCalender = lazyImport(() => import('./components/Driver/DriverCalender'));
const DriverLogout = lazyImport(() => import('./components/Driver/DriverLogout'));

// Admin dashboard components
const AdminDashboard = lazyImport(() => import('./components/Admin/AdminDashboard'));
const AdminProfile = lazyImport(() => import('./components/Admin/AdminProfile'));
const Drivers = lazyImport(() => import('./components/Admin/Drivers'));
const Users = lazyImport(() => import('./components/Admin/Users'));
const Trips = lazyImport(() => import('./components/Admin/Trips'));
const Payments = lazyImport(() => import('./components/Admin/Payments'));
const AdminLogout = lazyImport(() => import('./components/Admin/AdminLogout'));
const DriverDetails = lazyImport(() => import('./components/Admin/DriverDetails'));

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();
  
  // Redirect to appropriate dashboard based on user role
  const getDashboardPath = () => {
    if (!user) return '/';
    
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'driver':
        return '/dashboard/driver';
      default:
        return '/dashboard/user';
    }
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/become-driver" element={<BecomeDriver />} />
        <Route path="/faqs" element={<FAQPage />} />
        
        {/* Authentication routes */}
        <Route path="/signup/user" element={<UserRegistrationForm />} />
        <Route path="/login/user" element={<UserLoginForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordForm />} />
        
        <Route path="/signup/driver" element={<DriverRegistrationForm />} />
        <Route path="/login/driver" element={<DriverLoginForm />} />
        <Route path="/driver-forgot-password" element={<DriverForgotPasswordForm />} />
        <Route path="/driver-reset-password/:uidb64/:token" element={<DriverResetPasswordForm />} />
        <Route path="/driver-verification-documents" element={
          <ProtectedRoute requiredRole="driver">
            <DocumentUploadForm />
          </ProtectedRoute>
        } />
        
        <Route path="/signup/admin" element={<AdminSignup />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        
        {/* User dashboard routes */}
        <Route path="/dashboard/user" element={
          <ProtectedRoute requiredRole="user">
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="trip-history" element={<RideHistory />} />
          <Route path="calendar" element={<UserCalendar />} />
          <Route path="logout" element={<Logout />} />
        </Route>
        
        {/* Driver dashboard routes */}
        <Route path="/dashboard/driver" element={
          <ProtectedRoute requiredRole="driver">
            <LayoutDriver />
          </ProtectedRoute>
        }>
          <Route index element={<DriverDashboard />} />
          <Route path="profile" element={<DriverProfile />} />
          <Route path="calendar" element={<DriverCalender />} />
          <Route path="trip-history" element={<History />} />
          <Route path="logout" element={<DriverLogout />} />
        </Route>
        
        {/* Admin dashboard routes */}
        <Route path="/dashboard/admin" element={
          <ProtectedRoute requiredRole="admin">
            <LayoutAdmin />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="users" element={<Users />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="driver/:id" element={<DriverDetails />} />
          <Route path="trips" element={<Trips />} />
          <Route path="payments" element={<Payments />} />
          <Route path="logout" element={<AdminLogout />} />
        </Route>
        
        {/* Redirect to dashboard if logged in */}
        <Route path="/dashboard" element={<Navigate to={getDashboardPath()} replace />} />
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
