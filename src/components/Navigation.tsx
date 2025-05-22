import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Music2, Search, User, LogOut, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        setAvatar(data?.avatar_url);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Music2 className="w-4 h-4 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">StudioBase</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              to="/studios"
              className="text-gray-600 hover:text-gray-900 p-2 rounded-md text-sm font-medium"
            >
              <Search className="w-5 h-5" />
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-md text-sm font-medium flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : avatar ? (
                    <img
                      src={avatar}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <User className="w-8 h-8 flex-shrink-0" />
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center text-gray-600 hover:text-gray-900 p-2 rounded-md text-sm font-medium"
                >
                  <LogOut className="w-5 h-5 text-gray-800" />
                </button>
              </>
            ) : (
              <>
              <Link
                to="/signup"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mr-3"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Log In
              </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
