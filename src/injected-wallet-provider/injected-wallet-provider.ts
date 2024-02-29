import type { EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "./types";
import { EIP6963RequestProviderEvent } from "./types";
import { EventEmitter } from "eventemitter3";

const defaultProviderLocalStorageName = 'dAppDefaultWalletProviderRdns';

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

  // This method processes the provider details announced and adds them to the providerDetails array
  private providerReceived(providerDetail: EIP6963ProviderDetail): void {
    this.providerDetails.push(providerDetail);
    this.emit('providerDetailsUpdated')
    this.log(`updated wallet provider details from '${providerDetail.info.name}' extension`);
  }

  // This method listens for the 'announceProvider' event and processes the provider details announced
  subscribe(): void {
    window.addEventListener("eip6963:announceProvider", (event: EIP6963AnnounceProviderEvent) => {
        this.log(`received 'announceProvider' emitted by ${event.detail.info.name} / ${event.detail.info.rdns}`);
        this.providerReceived(event.detail);
      }
    );
  }
  
  // This method is used to request wallet providers by firing a 'EIP6963RequestProviderEvent'
  requestProviders(): void {
    this.log("emitting 'requestProvider' event");
    this.providerDetails = [];
    window.dispatchEvent(new EIP6963RequestProviderEvent());
  }

  // This function stores the default provider.info.rdns in the local storage
  storeDefaultProviderRdns(providerRdns: string): void {
    window.localStorage.setItem(defaultProviderLocalStorageName, providerRdns);
    this.log(`stored default provider rdns '${providerRdns}' in local storage.`);
  }

  // This function retrieves the default provider.info.rdns from the local storage
  readDefaultProviderRdns(): string | null {
    const providerRdns = window.localStorage.getItem(defaultProviderLocalStorageName);
    this.log(`read default provider rdns '${providerRdns}' from local storage.`);
    return providerRdns;
  }

  // This function removes the default provider.info.rdns from the local storage
  removeDefaultProvider(): void {
    window.localStorage.removeItem(defaultProviderLocalStorageName);
    this.log("removed default provider rdns from local storage");
  }
}
