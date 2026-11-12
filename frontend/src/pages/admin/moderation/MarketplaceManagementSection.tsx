import MarketplaceControl from '@/pages/moderator/marketplace-moderator/MarketplaceControl';

/**
 * Moderation → Management → Marketplace.
 *
 * Shares Marketplace Control with the Marketplace Moderator desk; only the API
 * root differs so admin and mod cannot drift apart.
 */
export default function MarketplaceManagementSection() {
  return (
    <MarketplaceControl apiBase="/api/admin/moderation/marketplace" embedded />
  );
}
