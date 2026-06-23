import { useState, useEffect } from "react";
import { fetchTavernAds, DatumAd } from "../lib/datumContracts";

export function useDatumCampaigns() {
  const [ads, setAds]       = useState<DatumAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTavernAds()
      .then(setAds)
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, []);

  return { ads, loading };
}
