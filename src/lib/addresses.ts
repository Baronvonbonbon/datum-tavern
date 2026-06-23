// Populated after running: npx hardhat run scripts/deploy.ts --network paseo
// Update these after each deploy.

export const ADDRESSES = {
  tavernBoard:   "0x0000000000000000000000000000000000000000",
  tavernBetting: "0x0000000000000000000000000000000000000000",

  // Datum alpha-core contracts (read-only, Paseo)
  datumCampaigns:       "0x0000000000000000000000000000000000000000",
  datumCampaignCreative:"0x0000000000000000000000000000000000000000",
  datumPublishers:      "0x0000000000000000000000000000000000000000",

  // This tavern's publisher address (registered in DatumPublishers)
  tavernPublisher:      "0x0000000000000000000000000000000000000000",
} as const;

export const PASEO_CHAIN_ID = 420420421;
