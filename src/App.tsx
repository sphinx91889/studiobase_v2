import React from 'react';
import { Routes, Route, unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Studios } from './pages/Studios';
import { StudioSettings } from './pages/StudioSettings';
import { RoomNew } from './pages/RoomNew';
import { StudioManage } from './pages/StudioManage';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { StudioDetails } from './pages/StudioDetails';
import { BookingPage } from './pages/BookingPage';
import { BookingSuccess } from './pages/BookingSuccess';
import { StudioNew } from './pages/StudioNew';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { RoomEdit } from './pages/RoomEdit';
import { AuthProvider, RequireAuth } from './contexts/AuthContext';
import { ScrollToTop } from './components/ScrollToTop';

const history = createBrowserHistory();

function App() {
  return (
    <HistoryRouter history={history}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <ScrollToTop />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/studios" element={<Studios />} />
              <Route path="/studios/:id" element={<StudioDetails />} />
              <Route path="/booking/:roomId" element={<BookingPage />} />
              <Route path="/booking/success" element={<BookingSuccess />} />
              
              {/* Protected Routes */}
              <Route element={<RequireAuth />}>
                <Route path="/studios/new" element={<StudioNew />} />
                <Route path="/studios/:id/settings" element={<StudioSettings />} />
                <Route path="/studios/:id/rooms/new" element={<RoomNew />} />
                <Route path="/studios/:id/rooms/:roomId/edit" element={<RoomEdit />} />
                <Route path="/studios/:id/manage" element={<StudioManage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </HistoryRouter>
  );
}

export default App;
