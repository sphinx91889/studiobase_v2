import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Music2, User, CreditCard, Save, Eye, EyeOff, Upload, X, Lock, Pencil } from 'lucide-react';
import { uploadProfilePhoto } from '../lib/storage';

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  is_studio_owner: boolean;
  stripe_publishable_key?: string | null;
  stripe_secret_key?: string | null;
  stripe_webhook_secret?: string | null;
  stripe_enabled?: boolean;
}

export function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [stripeKeys, setStripeKeys] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
    enabled: false
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, is_studio_owner, stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, stripe_enabled')
        .eq('id', user.id)
        .single();

      setProfile(data);
      if (data) {
        setStripeKeys({
          publishableKey: data.stripe_publishable_key || '',
          secretKey: data.stripe_secret_key || '',
          webhookSecret: data.stripe_webhook_secret || '',
          enabled: data.stripe_enabled || false
        });
        setNewName(data.full_name || '');
      }
      setLoading(false);
    }

    loadProfile();
  }, [user]);

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate Stripe keys when enabled
    if (stripeKeys.enabled) {
      if (!stripeKeys.publishableKey.trim() || !stripeKeys.secretKey.trim() || !stripeKeys.webhookSecret.trim()) {
        setError('All Stripe keys are required when Stripe is enabled');
        setSaving(false);
        return;
      }

      if (!stripeKeys.publishableKey.startsWith('pk_')) {
        setError('Invalid Publishable Key format. Should start with "pk_"');
        setSaving(false);
        return;
      }

      if (!stripeKeys.secretKey.startsWith('sk_')) {
        setError('Invalid Secret Key format. Should start with "sk_"');
        setSaving(false);
        return;
      }

      if (!stripeKeys.webhookSecret.startsWith('whsec_')) {
        setError('Invalid Webhook Secret format. Should start with "whsec_"');
        setSaving(false);
        return;
      }
    }

    try {
      // If Stripe is disabled, clear the keys
      const updateData = stripeKeys.enabled ? {
        stripe_publishable_key: stripeKeys.publishableKey.trim(),
        stripe_secret_key: stripeKeys.secretKey.trim(),
        stripe_webhook_secret: stripeKeys.webhookSecret.trim(),
        stripe_enabled: true
      } : {
        stripe_publishable_key: null,
        stripe_secret_key: null,
        stripe_webhook_secret: null,
        stripe_enabled: false
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Reload profile
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Stripe keys');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload a profile photo');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(file);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    } catch (err) {
      setError('Error uploading photo. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
        <p className="text-xl text-gray-600">
          Update your personal information and preferences
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="text-center">
          {loading ? (
            <div className="py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            </div>
          ) : (
            <>
              <div className="relative inline-block group">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile?.full_name || 'Profile'}
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={async () => {
                    try {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        await handleFileUpload(file);
                      };
                      
                      input.click();
                    } catch (err) {
                      setError('Error initiating file upload. Please try again.');
                      console.error(err);
                    }
                  }}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </button>
                {profile?.avatar_url && (
                  <button
                    onClick={async () => {
                      try {
                        const { error: updateError } = await supabase
                          .from('profiles')
                          .update({ avatar_url: null })
                          .eq('id', user?.id);

                        if (updateError) throw updateError;
                        
                        // Update local state
                        setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
                      } catch (err) {
                        setError('Error removing photo. Please try again.');
                        console.error(err);
                      }
                    }}
                    className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingName ? (
                    <form 
                      className="flex items-center space-x-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const { error: updateError } = await supabase
                            .from('profiles')
                            .update({ full_name: newName })
                            .eq('id', user?.id);

                          if (updateError) throw updateError;
                          
                          // Update local state
                          setProfile(prev => prev ? { ...prev, full_name: newName } : null);
                          setEditingName(false);
                        } catch (err) {
                          setError('Failed to update name');
                          console.error(err);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-md text-lg"
                        placeholder="Enter your name"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setNewName(profile?.full_name || '');
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>{profile?.full_name || 'Anonymous User'}</span>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </h2>
                <div className="mt-1 flex items-center justify-center text-sm">
                  {profile?.is_studio_owner ? (
                    <>
                      <Building2 className="w-4 h-4 text-indigo-600 mr-1" />
                      <span className="text-indigo-600 font-medium">Studio Owner</span>
                    </>
                  ) : (
                    <>
                      <Music2 className="w-4 h-4 text-indigo-600 mr-1" />
                      <span className="text-indigo-600 font-medium">Artist</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.is_studio_owner ? 'Studio Owner' : 'Artist'}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </div>
        
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-gray-400" />
            Change Password
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Update your password to keep your account secure
          </p>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setChangingPassword(true);
              setError(null);

              try {
                // Validate passwords
                if (passwordForm.newPassword.length < 6) {
                  throw new Error('New password must be at least 6 characters');
                }

                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  throw new Error('New passwords do not match');
                }

                // Update password
                const { error: updateError } = await supabase.auth.updateUser({
                  password: passwordForm.newPassword
                });

                if (updateError) throw updateError;

                // Clear form
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });

                // Show success message
                alert('Password updated successfully');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update password');
              } finally {
                setChangingPassword(false);
              }
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {changingPassword ? (
                <>
                  <Save className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        {profile?.is_studio_owner && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
              Stripe Integration
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Configure your Stripe account to process payments directly to your account
            </p>

            <form onSubmit={handleStripeSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="publishableKey" className="block text-sm font-medium text-gray-700">
                  Publishable Key
                </label>
                <input
                  type="text"
                  id="publishableKey"
                  value={stripeKeys.publishableKey}
                  disabled={!stripeKeys.enabled}
                  onChange={(e) => setStripeKeys(prev => ({ ...prev, publishableKey: e.target.value }))}
                  placeholder="pk_test_..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                  Secret Key
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    id="secretKey"
                    value={stripeKeys.secretKey}
                    disabled={!stripeKeys.enabled}
                    onChange={(e) => setStripeKeys(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="sk_test_..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                  >
                    {showSecretKey ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-700">
                  Webhook Secret
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    id="webhookSecret"
                    value={stripeKeys.webhookSecret}
                    disabled={!stripeKeys.enabled}
                    onChange={(e) => setStripeKeys(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    placeholder="whsec_..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={stripeKeys.enabled}
                  onChange={(e) => setStripeKeys(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                  Enable Stripe Integration
                </label>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Save className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  'Save Stripe Settings'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
