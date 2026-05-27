import { useEffect, useMemo, useState } from 'react';

import { isCurrentUserAdmin } from '@/services/marketplace.helpers';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function useAdminViewOnly(adminViewParam: string | string[] | undefined) {
  const adminViewRequested = useMemo(() => getParamValue(adminViewParam) === '1', [adminViewParam]);
  const [adminViewAllowed, setAdminViewAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    if (!adminViewRequested) {
      setAdminViewAllowed(false);
      return () => {
        active = false;
      };
    }

    isCurrentUserAdmin().then((allowed) => {
      if (active) setAdminViewAllowed(allowed);
    });

    return () => {
      active = false;
    };
  }, [adminViewRequested]);

  return {
    adminViewOnly: adminViewRequested && adminViewAllowed,
    adminViewRequested,
  };
}
