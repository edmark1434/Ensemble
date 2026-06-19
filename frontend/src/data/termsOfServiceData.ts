export interface TermsOfServiceItem {
  id: string;
  name: string;
  details: string;
}

export const TERMS_OF_SERVICE_DATA: TermsOfServiceItem[] = [
  {
    id: "tos-01",
    name: "Standard Creative License",
    details: "The creator retains the underlying intellectual property (IP) and copyright of the working assets. The client receives an exclusive, perpetual, non-transferable license to use the final delivered media assets for personal or designated commercial distribution channels outlined in the contract agreement."
  },
  {
    id: "tos-02",
    name: "Full IP Transfer Ownership",
    details: "Upon successful payment clearing and project completion, complete copyright, trade execution rights, and intellectual property ownership transfer entirely from the creator to the client. The creator forfeits redistribution rights except for personal, non-commercial self-promotional portfolio showcase purposes."
  },
  {
    id: "tos-03",
    name: "Non-Commercial Portfolio Rights Only",
    details: "Delivered content is strictly restricted to educational, internal corporate presentation, personal, or non-monetized distributions. Any deployment for paid advertisements, broadcast media, or subscription-gated digital distribution models requires explicit written re-licensing approval from the author."
  }
];