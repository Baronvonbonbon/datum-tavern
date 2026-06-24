import { useState, useEffect } from "react";
import { fetchTavernAds, DatumAd } from "../lib/datumContracts";

export function useDatumCampaigns() {
  const [ads, setAds]         = useState<DatumAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchTavernAds()
      .then((a) => { if (live) setAds(a); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "couldn't reach the chain"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  return { ads, loading, error };
}
