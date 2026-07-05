import { useEffect, useState } from 'react';
import {
  getManageAppDrawerPlacement,
  manageAppDrawerPlacementChangeEvent,
} from '@/utils/helper';

/**
 * Track the manage-page app drawer placement, staying in sync with changes
 * made in other components (via the custom event) and other tabs (via the
 * storage event).
 */
export function useManageAppDrawerPlacement() {
  const [placement, setPlacement] = useState(getManageAppDrawerPlacement);

  useEffect(() => {
    const syncPlacement = () => {
      setPlacement(getManageAppDrawerPlacement());
    };

    window.addEventListener(manageAppDrawerPlacementChangeEvent, syncPlacement);
    window.addEventListener('storage', syncPlacement);
    return () => {
      window.removeEventListener(
        manageAppDrawerPlacementChangeEvent,
        syncPlacement,
      );
      window.removeEventListener('storage', syncPlacement);
    };
  }, []);

  return [placement, setPlacement] as const;
}
