import type { EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "./provider-events";
import { EIP6963RequestProviderEvent } from "./provider-events";
import { EventEmitter } from "eventemitter3";


// This class extends EventEmitter to be able to emit events and give our DApp an interface to subscribe to
export class InjectedWalletProvider extends EventEmitter {
  // This will hold the details of the providers received
  providerDetails: EIP6963ProviderDetail[];

  constructor() {
    super()
    this.providerDetails = [];
  }

  private log(log: any): void {
    console.log(`InjectedWalletProvider: ${log}`);
  }

  // This method listens for the 'announceProvider' event and processes the provider details announced
  subscribe(): void {
    window.addEventListener("eip6963:announceProvider", (event: EIP6963AnnounceProviderEvent) => {
        this.log(`received 'announceProvider' emitted by ${event.detail.info.name} / ${event.detail.info.rdns}`);
        this.providerReceived(event.detail);
      }
    );
  }

  // This method processes the provider details announced and adds them to the providerDetails array
  private providerReceived(providerDetail: EIP6963ProviderDetail): void {
    this.providerDetails.push(providerDetail);
    this.log(`updated wallet provider details from '${providerDetail.info.name}' extension`);
    this.emit('providerDetailsUpdated')
  }
  
  // This method is used to request wallet providers by firing a 'EIP6963RequestProviderEvent'
  requestProviders(): void {
    this.log("emitting 'requestProvider' event");
    this.providerDetails = [];
    window.dispatchEvent(new EIP6963RequestProviderEvent());
  }
}
