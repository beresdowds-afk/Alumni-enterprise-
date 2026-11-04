import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantBrandingDetails } from '../db/brandingServices.ts';

interface TenantContextType {
  activeTenant: TenantBrandingDetails | null;
  availableTenants: Array<{ id: string; name: string; code: string }>;
  loading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  updateBranding: (updates: {
    schoolName?: string;
    associationName?: string;
    associationAcronym?: string;
    defaultCurrency?: string;
    defaultTimezone?: string;
    brandingConfig?: Record<string, any>;
  }) => Promise<{ success: boolean; error?: string }>;
  refreshBranding: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant_ags_abeokuta');
  const [activeTenant, setActiveTenant] = useState<TenantBrandingDetails | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAvailableTenants = async () => {
    try {
      const res = await fetch('/api/tenants');
      const data = await res.json();
      if (data.success && data.tenants) {
        setAvailableTenants(data.tenants.map((t: any) => ({ id: t.id, name: t.name, code: t.code })));
      }
    } catch (e) {
      console.error('Failed to load tenants list:', e);
    }
  };

  const loadTenantBranding = async (tenantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/branding/${tenantId}`);
      if (!res.ok) {
        throw new Error(`Failed to load branding: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.branding) {
        setActiveTenant(data.branding);
        setActiveTenantId(tenantId);
      }
    } catch (err: any) {
      console.error('Failed to load tenant branding:', err);
      setError(err.message || 'Could not load tenant branding.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableTenants();
    loadTenantBranding(activeTenantId);
  }, []);

  const switchTenant = async (tenantId: string) => {
    await loadTenantBranding(tenantId);
  };

  const updateBranding = async (updates: {
    schoolName?: string;
    associationName?: string;
    associationAcronym?: string;
    defaultCurrency?: string;
    defaultTimezone?: string;
    brandingConfig?: Record<string, any>;
  }) => {
    try {
      const res = await fetch(`/api/branding/${activeTenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update branding.' };
      }
      if (data.data) {
        setActiveTenant(data.data);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const refreshBranding = async () => {
    await loadTenantBranding(activeTenantId);
  };

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        availableTenants,
        loading,
        error,
        switchTenant,
        updateBranding,
        refreshBranding,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
