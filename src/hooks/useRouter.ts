/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export function useRouter() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    // Standardize path with a leading slash and no trailing slash (unless root)
    let formattedPath = to;
    if (!formattedPath.startsWith('/')) {
      formattedPath = '/' + formattedPath;
    }
    if (formattedPath.length > 1 && formattedPath.endsWith('/')) {
      formattedPath = formattedPath.slice(0, -1);
    }

    if (window.location.pathname !== formattedPath) {
      window.history.pushState(null, '', formattedPath);
      setPath(formattedPath);
      
      // Dispatch a synthetic popstate event so all router hooks update in sync
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  return { path, navigate };
}
