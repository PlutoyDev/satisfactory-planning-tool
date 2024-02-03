// Production metadata page, for creating and editing production metadata

import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import useAppStore from '../stores';

export function Metadata() {
  const [match, params] = useRoute('/prod-meta/:id');
  const [, navigate] = useLocation();
  const plmds = useAppStore(state => state.plMeta);
  const metaData = params?.id && plmds.find(md => md.id === params.id);

  useEffect(() => {
    if (!match) {
      navigate('/');
    }
  }, [match, navigate]);

  return (
    <div>
      <h1>Production Metadata</h1>
      {metaData ? (
        <div>
          <p>Metadata ID: {metaData.id}</p>
          <h2>{metaData.title}</h2>
        </div>
      ) : (
        <p>Metadata not found</p>
        // TODO: Create page for creating new production line metadata
      )}
    </div>
  );
}
