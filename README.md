# Interactive EIP-6963 Tutorial
## Overview

This tutorial will guide you in transforming the Web3 user experience by contributing to the development of [EIP-6963: Multi Injected Provider Discovery](https://eips.ethereum.org/EIPS/eip-6963). This Ethereum Improvement Proposal (EIP) is designed to boost connectivity in the blockchain space by offering an alternative discovery mechanism to `window.ethereum`. By enabling the discovery of multiple injected wallet providers, [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) not only simplifies wallet interactions for developers, but also gives them more control over their DApps. For end-users, it enhances the user experience by allowing them to use any installed wallet of their choice, thus facilitating seamless communication between decentralized applications (DApps) and browser extension wallets.

## Objective

The primary goal of this tutorial is to speed up the adoption of [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) among DApp developers and the broader blockchain community. It aims to make the integration of wallet providers into the decentralized ecosystem not only more intuitive but also more reliable. This guide serves as a comprehensive resource, equipping you with the knowledge and tools to implement [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) within your DApp in just 15 minutes. For developers, this means less time spent on understanding the complexities of wallet provider integration and more time dedicated to creating remarkable DApps. For engineering managers, this tutorial serves as a clear and concise resource to share with your team, ensuring everyone understands the concept and speeding up the development process. By working together, it's possible to enhance the blockchain space, making it more accessible and efficient for everyone.

## Quickest Start

Get your hands on a ready-to-use **InjectedWalletProvider** setup right away. Simply add this file into your project, and you'll be all set to connect your DApp with [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) in a moment:

<details>
<summary>InjectedWalletProvider</summary>

[injected-wallet-provider.ts](src/injected-wallet-provider/injected-wallet-provider.ts)

</details>

Later in this tutorial, we'll construct this implementation step by step to give you a comprehensive understanding of its internal mechanics.

## 

## The Roadmap

This guide will walk you through the process of implementing **[EIP-6963: Multi Injected Provider Discovery](https://eips.ethereum.org/EIPS/eip-6963)** from the ground up. It's broken down into a few easy-to-follow sections:

### 1. Connection Flow

This part will demystify the 'requestProvider' and 'announceProvider' events and how they work. It will give you a clear understanding of how DApps can kick-start connections with multiple injected wallet providers. Plus, it will share examples of these and related interfaces that are crucial for communicating with the wallets.

You can dive into the connection flow in steps 1-3 of the [interactive tutorial](https://eip-6963-tutorial.pages.dev/).

### 2. Persistence Handling

This part will show you how the browser keeps a connection with the wallet alive even after a page refresh. It will also guide you on how to store a preferred wallet provider into localStorage for reuse after the page is refreshed. 

This is what makes [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) so special for your DApp users: now they have the freedom to connect with their preferred wallet, instead of being limited to the wallet available in `window.ethereum`.

You can get hands-on with persistence handling in steps 4-5 of the [interactive tutorial](https://eip-6963-tutorial.pages.dev/).

### 3. Message Signing and Sending a Transaction

This part will demonstrate how your DApp can utilize connected wallet providers to sign transactions using their preferred wallet.

You can practice using an account to sign messages and send transactions in steps 6-7 of the [interactive tutorial](https://eip-6963-tutorial.pages.dev/).

> Some code snippets provided in this guide have been intentionally simplified to make the tutorial easy to grasp. For a fully functional and integrated solution, please refer to the application code.

## Section 0: Cloning and running the interactive tutorial app

#### Clone the repository

```bash
git clone git@github.com:nfwsncked/eip-6963-tutorial.git
```

#### Navigate into the project directory

```bash
cd eip-6963-tutorial
```

#### Make sure installing all the deps
```bash
npm i
```

#### Run the project locally
```bash
npm run dev
```

#### Open served app in your browser
```
http://localhost:5173/
```


## Section 1: Connection Flow

Simplicity is the key to adoption. 

The [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) protocol works in a pretty straightforward way: 

A DApp can fire the **'requestProvider'** event at any moment, and as a reaction, every [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) compatible wallet extension in your browser instantly firest **'announceProvider'** event in response.

To see this interaction in action, let's add an event listener for **'eip6963:announceProvider'** and initiate the **'eip6963:requestProvider'** event.

First let's define all the necessary classes and interfaces in one go:

```typescript
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

// Define an interface for the wallet extension metadata
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
```

- The global interface **WindowEventMap** declaration above is used to extend the existing **WindowEventMap** interface with a new event type, **'eip6963:announceProvider'**.
- **EIP6963RequestProviderEvent** — an event class that's used to request the wallet providers. It's created by firing the **'eip6963:requestProvider'** event.
- **EIP6963AnnounceProviderEvent** — an interface that represents the response from the wallet extension when the **'eip6963:requestProvider'** event is fired.

**EIP6963ProviderDetail** is the main object we're interested in here. It contains two important properties:
**EIP6963ProviderInfo** which exposes metadata about the wallet extension;
**EIP1193Provider** which is a provider interface from the [EIP-1193 specification](https://eips.ethereum.org/EIPS/eip-1193#appendix-i-consumer-facing-api-documentation). This should be used in the same way as the window.ethereum provider.


With these elements set up, we're now ready to start building a basic implementation of EIP-6963 communication:

```typescript
export class InjectedWalletProvider {
  // This will hold the details of the providers received
  providerDetails: EIP6963ProviderDetail[];

  ...

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
  }
  
  // This method is used to request wallet providers by firing a 'EIP6963RequestProviderEvent'
  requestProviders(): void {
    this.log("emitting 'requestProvider' event");
    this.providerDetails = [];
    window.dispatchEvent(new EIP6963RequestProviderEvent());
  }
}
```

First we have to call `listenToAnnouncedProviders` that will set up an event listener for `eip6963:announceProvider` event.
Next step is calling `requestProviders` to emit our request event.

Finally, we can see our events in the console:

![001-events-in-console.png](docs/001-events-in-console.png)

We are particularly interested in **detail** parameter of the **'EIP6963ProviderDetail'**. It has two children: **info** and **provider**.

### EIP6963AnnounceProviderEvent.detail.info

The first one, **info**, holds all the metadata that the extension shares with the DApp. We have previously defined its interface as — **EIP6963ProviderInfo**:

```json
{
    "uuid": "36072975-ed89-4a55-a0d0-e7523f1413a8",
    "name": "Zerion",
    "icon": "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22512%22%20height%3D%22512%22%20viewBox%3D%220%200%20512%20512%22%20fill%3D%22none%22%3E%3Crect%20width%3D%22512%22%20height%3D%22512%22%20rx%3D%22170.667%22%20fill%3D%22url%28%27%23paint0_linear_1098_5380%27%29%22%2F%3E%3Crect%20x%3D%2242.667%22%20y%3D%2242.667%22%20width%3D%22426.667%22%20height%3D%22426.667%22%20rx%3D%22170.667%22%20fill%3D%22%232461ED%22%2F%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M286.757%20250.326c-41.73-22.55-92.506-51.794-130.72-75.629-11.276-8.123-5.553-25.364%208.074-25.364h189.086c10.548%200%2017.604%2011.761%2012.318%2020.66-12.706%2021.944-31.256%2049.805-46.75%2071.895-8.317%2011.857-21.872%2013.894-32.008%208.438Zm-60.862%207.323c40.349%2021.508%2096.895%2054.218%20137.074%2078.951%2012.415%207.663%207.468%2026.042-7.032%2026.042-23.728%200-62.285.007-100.641.013-37.961.006-75.725.012-98.726.012-11.59%200-17.531-12.027-12.609-20.417%2016.634-28.346%2035.33-56.959%2050.872-78.321%206.911-9.529%2020.975-11.663%2031.062-6.28Z%22%20fill%3D%22%23fff%22%2F%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_1098_5380%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%22604.983%22%20y2%3D%22352.348%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%232962EF%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23255CE5%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3C%2Fsvg%3E",
    "rdns": "io.zerion.wallet"
}
```
```json
{
    "uuid": "f13cd14b-e30e-44b1-8ce7-2c4354ce1d9e",
    "name": "MetaMask",
    "icon": "data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20height%3D%2233%22%20viewBox%3D%220%200%2035%2033%22%20width%3D%2235%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%22.25%22%3E%3Cpath%20d%3D%22m32.9582%201-13.1341%209.7183%202.4424-5.72731z%22%20fill%3D%22%23e17726%22%20stroke%3D%22%23e17726%22%2F%3E%3Cg%20fill%3D%22%23e27625%22%20stroke%3D%22%23e27625%22%3E%3Cpath%20d%3D%22m2.66296%201%2013.01714%209.809-2.3254-5.81802z%22%2F%3E%3Cpath%20d%3D%22m28.2295%2023.5335-3.4947%205.3386%207.4829%202.0603%202.1436-7.2823z%22%2F%3E%3Cpath%20d%3D%22m1.27281%2023.6501%202.13055%207.2823%207.46994-2.0603-3.48166-5.3386z%22%2F%3E%3Cpath%20d%3D%22m10.4706%2014.5149-2.0786%203.1358%207.405.3369-.2469-7.969z%22%2F%3E%3Cpath%20d%3D%22m25.1505%2014.5149-5.1575-4.58704-.1688%208.05974%207.4049-.3369z%22%2F%3E%3Cpath%20d%3D%22m10.8733%2028.8721%204.4819-2.1639-3.8583-3.0062z%22%2F%3E%3Cpath%20d%3D%22m20.2659%2026.7082%204.4689%202.1639-.6105-5.1701z%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22m24.7348%2028.8721-4.469-2.1639.3638%202.9025-.039%201.231z%22%20fill%3D%22%23d5bfb2%22%20stroke%3D%22%23d5bfb2%22%2F%3E%3Cpath%20d%3D%22m10.8732%2028.8721%204.1572%201.9696-.026-1.231.3508-2.9025z%22%20fill%3D%22%23d5bfb2%22%20stroke%3D%22%23d5bfb2%22%2F%3E%3Cpath%20d%3D%22m15.1084%2021.7842-3.7155-1.0884%202.6243-1.2051z%22%20fill%3D%22%23233447%22%20stroke%3D%22%23233447%22%2F%3E%3Cpath%20d%3D%22m20.5126%2021.7842%201.0913-2.2935%202.6372%201.2051z%22%20fill%3D%22%23233447%22%20stroke%3D%22%23233447%22%2F%3E%3Cpath%20d%3D%22m10.8733%2028.8721.6495-5.3386-4.13117.1167z%22%20fill%3D%22%23cc6228%22%20stroke%3D%22%23cc6228%22%2F%3E%3Cpath%20d%3D%22m24.0982%2023.5335.6366%205.3386%203.4946-5.2219z%22%20fill%3D%22%23cc6228%22%20stroke%3D%22%23cc6228%22%2F%3E%3Cpath%20d%3D%22m27.2291%2017.6507-7.405.3369.6885%203.7966%201.0913-2.2935%202.6372%201.2051z%22%20fill%3D%22%23cc6228%22%20stroke%3D%22%23cc6228%22%2F%3E%3Cpath%20d%3D%22m11.3929%2020.6958%202.6242-1.2051%201.0913%202.2935.6885-3.7966-7.40495-.3369z%22%20fill%3D%22%23cc6228%22%20stroke%3D%22%23cc6228%22%2F%3E%3Cpath%20d%3D%22m8.392%2017.6507%203.1049%206.0513-.1039-3.0062z%22%20fill%3D%22%23e27525%22%20stroke%3D%22%23e27525%22%2F%3E%3Cpath%20d%3D%22m24.2412%2020.6958-.1169%203.0062%203.1049-6.0513z%22%20fill%3D%22%23e27525%22%20stroke%3D%22%23e27525%22%2F%3E%3Cpath%20d%3D%22m15.797%2017.9876-.6886%203.7967.8704%204.4833.1949-5.9087z%22%20fill%3D%22%23e27525%22%20stroke%3D%22%23e27525%22%2F%3E%3Cpath%20d%3D%22m19.8242%2017.9876-.3638%202.3584.1819%205.9216.8704-4.4833z%22%20fill%3D%22%23e27525%22%20stroke%3D%22%23e27525%22%2F%3E%3Cpath%20d%3D%22m20.5127%2021.7842-.8704%204.4834.6236.4406%203.8584-3.0062.1169-3.0062z%22%20fill%3D%22%23f5841f%22%20stroke%3D%22%23f5841f%22%2F%3E%3Cpath%20d%3D%22m11.3929%2020.6958.104%203.0062%203.8583%203.0062.6236-.4406-.8704-4.4834z%22%20fill%3D%22%23f5841f%22%20stroke%3D%22%23f5841f%22%2F%3E%3Cpath%20d%3D%22m20.5906%2030.8417.039-1.231-.3378-.2851h-4.9626l-.3248.2851.026%201.231-4.1572-1.9696%201.4551%201.1921%202.9489%202.0344h5.0536l2.962-2.0344%201.442-1.1921z%22%20fill%3D%22%23c0ac9d%22%20stroke%3D%22%23c0ac9d%22%2F%3E%3Cpath%20d%3D%22m20.2659%2026.7082-.6236-.4406h-3.6635l-.6236.4406-.3508%202.9025.3248-.2851h4.9626l.3378.2851z%22%20fill%3D%22%23161616%22%20stroke%3D%22%23161616%22%2F%3E%3Cpath%20d%3D%22m33.5168%2011.3532%201.1043-5.36447-1.6629-4.98873-12.6923%209.3944%204.8846%204.1205%206.8983%202.0085%201.52-1.7752-.6626-.4795%201.0523-.9588-.8054-.622%201.0523-.8034z%22%20fill%3D%22%23763e1a%22%20stroke%3D%22%23763e1a%22%2F%3E%3Cpath%20d%3D%22m1%205.98873%201.11724%205.36447-.71451.5313%201.06527.8034-.80545.622%201.05228.9588-.66255.4795%201.51997%201.7752%206.89835-2.0085%204.8846-4.1205-12.69233-9.3944z%22%20fill%3D%22%23763e1a%22%20stroke%3D%22%23763e1a%22%2F%3E%3Cpath%20d%3D%22m32.0489%2016.5234-6.8983-2.0085%202.0786%203.1358-3.1049%206.0513%204.1052-.0519h6.1318z%22%20fill%3D%22%23f5841f%22%20stroke%3D%22%23f5841f%22%2F%3E%3Cpath%20d%3D%22m10.4705%2014.5149-6.89828%202.0085-2.29944%207.1267h6.11883l4.10519.0519-3.10487-6.0513z%22%20fill%3D%22%23f5841f%22%20stroke%3D%22%23f5841f%22%2F%3E%3Cpath%20d%3D%22m19.8241%2017.9876.4417-7.5932%202.0007-5.4034h-8.9119l2.0006%205.4034.4417%207.5932.1689%202.3842.013%205.8958h3.6635l.013-5.8958z%22%20fill%3D%22%23f5841f%22%20stroke%3D%22%23f5841f%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E",
    "rdns": "io.metamask"
}
```

Let's go one by one over the data points we received (descriptions were taken from [EIP-6963 specification](https://eips.ethereum.org/EIPS/eip-6963#specification)):

> **uuid** — a globally unique identifier the Wallet Provider that MUST be (UUIDv4 compliant) to uniquely distinguish different EIP-1193 provider sessions that have matching properties defined below during the lifetime of the page. The cryptographic uniqueness provided by UUIDv4 guarantees that two independent EIP6963ProviderInfo objects can be separately identified.

**Important:** Please note that the 'uuid' will alter with each announcement, thus it cannot be reliably used to consistently identify the wallet extension.

> **name** — a human-readable local alias of the Wallet Provider to be displayed to the user on the DApp.

> **icon** — a URI pointing to an image. The image SHOULD be a square with 96x96px minimum resolution. See the Images/Icons below for further requirements of this property.The icon string MUST be a data URI as defined in RFC-2397. The image SHOULD be a square with 96x96px minimum resolution. The image format is RECOMMENDED to be either lossless or vector based such as PNG, WebP or SVG to make the image easy to render on the DApp. Since SVG images can execute Javascript, applications and libraries MUST render SVG images using the <img> tag to ensure no untrusted Javascript execution can occur.


> **rdns** — the Wallet MUST supply the rdns property which is intended to be a domain name from the Domain Name System in reverse syntax ordering such as com.example.subdomain. It’s up to the Wallet to determine the domain name they wish to use, but it’s generally expected the identifier will remain the same throughout the development of the Wallet. It’s also worth noting that similar to a user agent string in browsers, there are times where the supplied value could be unknown, invalid, incorrect, or attempt to imitate a different Wallet. Therefore, the DApp SHOULD be able to handle these failure cases with minimal degradation to the functionality of the DApp. **The rdns (Reverse-DNS) property serves to provide an identifier which DApps can rely on to be stable between sessions.** The Reverse Domain Name Notation is chosen to prevent namespace collisions. The Reverse-DNS convention implies that the value should start with a reversed DNS domain name controlled by the Provider. 

**Important:** RDNS serves as a consistent parameter that enables us to identify the wallet across different sessions, we will use that later for persistency.


### EIP6963AnnounceProviderEvent.detail.provider

The second parameter, **provider**, is an interface we previously defined as **EIP1193Provider**. It functions as an exposed account provider, which you can utilize similarly to how you would use **window.ethereum**.

EIP1193Provider is an interface that represents the Ethereum provider API. It is a standard interface for Ethereum wallets that allows them to communicate with DApps. The EIP1193Provider interface has a method that is mostly used, 'request', which takes a request object as a parameter. The request object should have a 'method' property, which is a string representing the name of the method to be called, and an optional 'params' property, which can be an array or an object containing the parameters to be passed to the method. The 'request' method returns a Promise that resolves to the result of the method call. This allows DApps to interact with the Ethereum blockchain in an asynchronous manner, without blocking the user interface.

```typescript
await provider.request({method: 'eth_accounts'})

await provider.request({method: 'personal_sign', params: ['some message to sign', '0x0000000000000000000000000000000000000000']});

```

## Section 2: Persistence Handling

### eth_requestAccounts

After obtaining the provider for the wallet of choice, we can establish a connection with the accounts available in the wallet extension, to do so we use **'eth_requestAccounts'**:

```typescript
async function getCurrentAccount(): Promise<any> {
  const accounts = await provider.request({method: 'eth_requestAccounts'})
  setCurrentAccount(accounts[0])
}
```

This will trigger chosen extension to present a dialog to connect to the available account:

![002-request-accounts.png](docs/002-request-accounts.png)

You will see the following in the console:

`current account has been set to: 0x4adad79b327a627395a5ed54f051b64f42249d3d`

Which means our DApp successfully requested the accounts available in chosen extension.

**Important:** This process is being handled and stored within the extension itself, so connection between the DApp and the wallet extension will persist between page reloads and has to be done once per wallet extension.

### eth_accounts

To check for accounts that were previously connected to the DApp via chosen extension:

```typescript
async function isAccountConnected() {
  const accounts = await provider.request({method: 'eth_accounts'})
  if (accounts) {
    setCurrentAccount(accounts[0])
  }
}
```

Note that method **'eth_accounts'** we're triggering above is used to access to accounts already connected to the DApp before. We can use this method to connect to the available accounts after page refresh.

### localStorage

With EIP-6963 we are now able to use multiple wallet extensions simultaneously and this introduces a use-case when the user wants to use same wallet extension every time he uses our DApp. We can persist his choice by using localStorage to save RDNS value of the extension user has chosen. As we already mentioned before, RDNS parameter is a unique identifier provided by each wallet extension.

```typescript
function saveSelectedProviderAsDefault(selectedProviderInfo: EIP6963ProviderInfo) {
  window.localStorage.setItem(localStorageName, selectedProviderInfo.rdns)
  console.log(`default wallet provider was saved into localStorage: '${selectedProviderInfo.rdns}'`)
}
```

## Section 3: Message Signing and Sending a Transaction

This section shows how DApps can utilize connected wallet providers to sign transactions securely.

Let's start with an example of signing a string with the selected wallet:

```typescript
async function signWithSelectedProvider(msg: string, currentAccountAddress: string, selectedProviderInfo: EIP6963ProviderInfo) {
  const signature = await provider.request({method: 'personal_sign', params: [msg, currentAccountAddress]});
  console.log(`signed '${signatureInputText.value}' with ${selectedProviderInfo.name}, signature: ${signature}`);
}
```

Now we can utilize **'eth_sendTransaction'** to send a transaction into the network:

```typescript
async function sendTransactionWithSelectedProvider(txToAddress: string, currentAccountAddress: string, value: string) {
  const transactionParameters = {
      to: txToAddress,
      from: currentAccountAddress,
      value: value,
    };
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [transactionParameters],
    });
    console.log(`transaction sent with hash: ${txHash}`);
}
```