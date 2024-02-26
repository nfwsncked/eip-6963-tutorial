
// Please refer to EIP-6963 specs: https://eips.ethereum.org/EIPS/eip-6963
// Declare a global interface to extend the WindowEventMap with a custom event "eip6963:announceProvider"
declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent;
  }
}

// Define a class for the "eip6963:requestProvider" event
export class EIP6963RequestProviderEvent extends Event {
  constructor() {
    super("eip6963:requestProvider");
  }
}

// Define an interface for the "eip6963:announceProvider" event
export interface EIP6963AnnounceProviderEvent extends Event {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

// Define an interface for the provider details
export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

// Define an interface for the provider information
export interface EIP6963ProviderInfo {
  uuid: string; // Unique identifier of the wallet extension announcement, keep in mind it changes on every request-announcement cycle
  name: string; // Name of the wallet extension
  icon: string; // Icon for the wallet extension
  rdns: string; // Reverse DNS name of the wallet extension
}

// Define an interface for the EIP1193 provider.
// It's the same interface we are used to access with 'window.ethereum'
export interface EIP1193Provider {
    request(request: {
      method: string;
      params?: Array<any> | Record<string, any>;
    }): Promise<any>;
  }
