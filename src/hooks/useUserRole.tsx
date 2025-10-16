import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'manager' | 'cashier' | null;

export const useUserRole = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, profiles(site_id, sites(name)))')
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
          setSiteId(null);
          setSiteName(null);
        } else if (data && data.length > 0) {
          const userRoleData = data[0];
          setRole(userRoleData.role as UserRole);
          // Correction: `profiles` est un objet, pas un tableau. On vérifie juste son existence.
          if (userRoleData.profiles) {
            const profile = userRoleData.profiles;
            setSiteId(profile.site_id);
            setSiteName(profile.sites?.name || null);
          } else {
            setSiteId(null);
            setSiteName(null);
          }
        } else {
          setRole(null);
          setSiteId(null);
          setSiteName(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    };

    fetchUserRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserRole();
        } else {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, role, loading, isAdmin: role === 'admin', isManager: role === 'manager', isCashier: role === 'cashier', siteId, siteName };
};