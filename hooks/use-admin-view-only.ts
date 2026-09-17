import { useEffect, useMemo, useState } from 'react';

import { isCurrentUserAdmin } from '@/services/marketplace.helpers';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function useAdminViewOnly(adminViewParam: string | string[] | undefined) {
  const adminViewRequested = useMemo(() => getParamValue(adminViewParam) === '1', [adminViewParam]);
  const [adminViewAllowed, setAdminViewAllowed] = useState(false);

  // Drop a previous grant the moment the param goes away, during render.
  // Without this, toggling admin view off and back on would report the old
  // `true` until the fresh check resolves -- a brief window where a stale
  // authorization is visible. `adminViewOnly` below also ANDs with the param,
  // so this only guards the re-request case.
  const [lastRequested, setLastRequested] = useState(adminViewRequested);
  if (adminViewRequested !== lastRequested) {
    setLastRequested(adminViewRequested);
    if (!adminViewRequested) setAdminViewAllowed(false);
  }

  useEffect(() => {
    let active = true;

    if (!adminViewRequested) {
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
