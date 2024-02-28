<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Button } from '@/components/shadcn/ui/button'
import { type EIP6963ProviderDetail } from '../injected-wallet-provider/provider-events';
import { InjectedWalletProvider } from '../injected-wallet-provider/injected-wallet-provider';

// Define our custom Injected Wallet Provider
const injectedWalletProvider = new InjectedWalletProvider();

// availableProviderDetails will store all providers from InjectedWalletProvider.providerDetails
const availableProviderDetails = ref<EIP6963ProviderDetail[]>([]);
// availableProviderDetails stores currently selected wallet provider
const selectedProviderDetail = ref<EIP6963ProviderDetail | null>(null);
// holds value of default provider rdns, chosen by the user
const defaultProviderRdns = ref<string | null>(null);

// currently connected ethereum account address
const currentAccountAddress = ref<string | null>(null);

// Input value refs:
//   sign message 
const signatureInputText = ref<string>('');
const signatures = ref<string[]>([]);
//   sign transaction
const txToAddress = ref<string>('');
const txValue = ref<string>('500000000000000000');

// watch for selectedProviderDetail changes
watch(selectedProviderDetail, () => {
  currentAccountAddress.value = null;
  if (selectedProviderDetail.value) {
    getConnectedWalletAccount(selectedProviderDetail.value);
  }
});

onMounted(() => {
  // read default provider rdns from local storage to persist user's provider of choice
  readDefaultProvider();
  // start watching changes to InjectedWalletProvider.providerDetails
  watchInjectedWalletDetailsChanges();
  // start InjectedWalletProvider subscription to 'announceProvider' event
  injectedWalletProvider.subscribe();
})

// syncs module's injectedWalletProvider.providerDetails and availableProviderDetails of the Vue component
function watchInjectedWalletDetailsChanges() {
  // wait until injectedWalletProvider emits 'providerDetailsUpdated' event
  injectedWalletProvider.on('providerDetailsUpdated', () => {
    // store injectedWalletProvider.providerDetails value into the component ref
    availableProviderDetails.value = injectedWalletProvider.providerDetails;
    // check if default provider was retrieved
    selectDefaultProvider();
  })
}

// is setting the selectedProviderDetail value to the selected provider detail
function selectProvider(providerDetail: EIP6963ProviderDetail) {
  selectedProviderDetail.value = providerDetail;
  console.log(`provider was selected: ${providerDetail.info.name}`);
}

// checks if default provider was set and if it's present in injectedWalletProvider.providerDetails — select it by default
function selectDefaultProvider() {
  const defaultProvider = readDefaultProvider();
  if (!defaultProvider) {
    return
  }
  injectedWalletProvider.providerDetails.forEach(v => {
    if (v.info.rdns === defaultProvider) {
      selectProvider(v);
    }
  });
}

// sets the default provider by storing the provider's rdns in the localStorage
function setDefaultProvider(providerDetail: EIP6963ProviderDetail) {
  defaultProviderRdns.value = providerDetail.info.rdns;
  injectedWalletProvider.storeDefaultProviderRdns(providerDetail.info.rdns);
}

// reads the default provider by retrieving the stored rdns from localStorage
function readDefaultProvider() {
  const storedProviderRdns = injectedWalletProvider.readDefaultProviderRdns();
  defaultProviderRdns.value = storedProviderRdns;
  return storedProviderRdns
}

// removes the default provider removing default provider rdns from localStorage
function removeDefaultProvider() {
  injectedWalletProvider.removeDefaultProvider();
  defaultProviderRdns.value = null;
}

// connects to a wallet account by requesting the 'eth_requestAccounts' method from the provider
async function connectWalletAccount(providerDetail: EIP6963ProviderDetail) {
  try {
    const accounts = await providerDetail.provider.request({ method: 'eth_requestAccounts' });
    setCurrentWalletAccount(accounts[0]);
  } catch (e) {
    console.error(`error getting account: ${e}`);
  }
}

// retrieves the connected wallet account by requesting the 'eth_accounts' method from the provider
async function getConnectedWalletAccount(providerDetail: EIP6963ProviderDetail) {
  const accounts = await providerDetail.provider.request({ method: 'eth_accounts' });
  if (accounts) {
    setCurrentWalletAccount(accounts[0]);
  }
}

// sets the current wallet account by assigning the provided account to the txToAddress and currentAccountAddress values for later use
function setCurrentWalletAccount(account: string) {
  txToAddress.value = account;
  currentAccountAddress.value = account;
  console.log(`current account has been set to: ${account}`);
}

// signs a message by requesting the 'personal_sign' method from the provider
async function signMessage(providerDetail: EIP6963ProviderDetail) {
  try {
    const msg = signatureInputText.value;
    const signature = await providerDetail.provider.request({ method: 'personal_sign', params: [msg, currentAccountAddress.value] });
    const signatureLog = `signed '${signatureInputText.value}' with ${providerDetail.info.name}, signature: ${signature}`;
    console.log(signatureLog);
    signatures.value.push(signatureLog);
  } catch (error) {
    console.error(`error signing: ${error}`);
  }
}

// sends a transaction by requesting the 'eth_sendTransaction' method from the provider
async function sendTransaction(providerDetail: EIP6963ProviderDetail) {
  // this is a demo implementation to avoid excesive dependencies
  // for production-ready apps you should use ethers / web3.js or bn.js to properly work with BigNumbers
  const value = `0x${parseInt(txValue.value).toString(16)}`;
  try {
    const transactionParameters = {
      to: txToAddress.value,
      from: currentAccountAddress.value,
      value: value,
    };
    const txHash = await providerDetail.provider.request({
      method: 'eth_sendTransaction',
      params: [transactionParameters],
    });
    console.log(`transaction sent with hash: ${txHash}`);
  } catch (error) {
    console.error(`error sending transaction: ${error}`);
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-4"><!-- Part 1: Request available providers -->
      <h2 class="text-2xl font-extrabold">Step 1: Request Available Providers</h2>
      <p class="text-gray-500">When you click the button below, the <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a> magic begins. This button triggers <code class="text-sky-800 text-s">InjectedWalletProvider.requestProviders</code>.</p>
      <p class="text-gray-500">It sends out an <code class="text-sky-800 text-s">eip6963:requestProvider</code> event. All <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a> compatible wallet extensions in your browser will hear this call and respond with an <code class="text-sky-800 text-s">eip6963:announceProvider</code> event. Each of these events carries the details of a wallet provider. This way, your DApp gets to know all the available wallet providers in the user's browser.</p>
      <Button @click="injectedWalletProvider.requestProviders()" class="emit-button">Request Providers</Button>
    </div>
    <div class="space-y-4"><!-- Part 2: Display available providers -->
      <h2 class="text-2xl font-extrabold">Step 2: Select a Provider</h2>
      <p class="text-gray-500">Before the introduction of <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a>, regardless of the number of wallets installed in your browser, only one could be active on a page at a time, occupying the <code class="text-sky-800 text-s">window.ethereum</code> space. This limitation meant that during page load, a race condition would occur, and the last wallet to load would take up this space. Developers had no control over this process. However, the advent of <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a> has dramatically changed this scenario.</p>
      <p class="text-gray-500">Now you can use as many providers as you may need.</p>
      <p class="text-gray-500">Here are the wallet providers that responded to the request. Click <strong>'Select'</strong> to choose a provider:</p>
      <div v-if="availableProviderDetails.length" v-for="provider in availableProviderDetails" :key="provider.info.name"
        class="flex items-center space-x-4 rtl:space-x-reverse  max-w-xs bg-gray-100 px-4 py-2">
        <div class="flex-shrink-0">
          <img class="w-8 h-8 rounded-full" :src="provider.info.icon" alt="Provider image">
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
            {{ provider.info.name }} <span v-if="defaultProviderRdns && defaultProviderRdns == provider.info.rdns"
              class="text-gray-500">(default)</span>
          </p>
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            {{ provider.info.rdns }}
          </p>
        </div>
        <div>
          <Button @click="selectProvider(provider)" class="select-button" variant="secondary">Select</Button>
        </div>
      </div>
      <div v-else>No providers available yet</div>
    </div>

    <div class="space-y-4"><!-- Part 3: Display selected provider -->
      <h2 class="text-2xl font-extrabold">Step 3: Get to Know Your Provider Metadata</h2>
      <p class="text-gray-500">Let's take a look at the details of the provider you've selected. These details are found in the <code class="text-sky-800 text-s">'EIP6963AnnounceProviderEvent.detail.info'</code>.</p>
      <div v-if="selectedProviderDetail" class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
        <div class="flex-shrink-0">
          <img class="w-8 h-8 rounded-full" :src="selectedProviderDetail.info.icon" alt="selectedProviderDetail image">
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
            name: {{ selectedProviderDetail.info.name }}
          </p>
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            rdns: {{ selectedProviderDetail.info.rdns }}
          </p>
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            uuid: {{ selectedProviderDetail.info.uuid }}
          </p>
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            icon: {{ selectedProviderDetail.info.icon.length > 50 ? selectedProviderDetail.info.icon.substring(0, 24) +
              '...' + selectedProviderDetail.info.icon.substring(selectedProviderDetail.info.icon.length - 24) :
              selectedProviderDetail.info.icon }}
          </p>
        </div>
      </div>
      <div v-else>
        <p>No provider selected</p>
      </div>
    </div>
    <div class="space-y-4"><!-- Part 4: Save selected wallet as default using localStorage -->
      <h2 class="text-2xl font-extrabold">Step 4: Make Your Wallet the Default Choice</h2>
      <p class="text-gray-500">Imagine you have a favorite wallet extension that you want to use every time you interact with this DApp. With <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a> you finally can make this happen!</p>
      <p class="text-gray-500">Clicking <strong>'Store'</strong> will call <code class="text-sky-800 text-s">storeDefaultProviderRdns</code> on <code class="text-sky-800 text-s">InjectedWalletProvider</code> that will save the unique <code class="text-sky-800 text-s">info.rdns</code> value of your chosen provider into <strong>localStorage</strong>. So, the next time you refresh the page, the DApp will be able to read <strong>localStorage</strong> and automatically select your preferred wallet.</p>
      <div v-if="selectedProviderDetail">
        <Button v-if="selectedProviderDetail.info.rdns != defaultProviderRdns"
          @click="setDefaultProvider(selectedProviderDetail)" class="save-provider-button">Set {{
            selectedProviderDetail.info.name }} as Default</Button>
        <Button v-else @click="removeDefaultProvider()" class="remove-provider-button">Unset {{
          selectedProviderDetail.info.name }} as Default</Button>
      </div>
      <div v-else>
        No wallet selected yet
      </div>
    </div>
    <div class="space-y-4"><!-- Part 5: Connected wallet account -->
      <h2 class="text-2xl font-extrabold">Step 5: Connect to Your Wallet Account</h2>
      <p class="text-gray-500">Once you've chosen a provider, the next step is to link up with the accounts in your wallet extension. To do this, we'll use <code class="text-sky-800 text-s">provider.request</code> to send a <code class="text-sky-800 text-s">'eth_requestAccounts'</code> command. This will connect your DApp to your wallet extension for the first time.</p>
      <p class="text-gray-500">If you refresh the page or come back later, your DApp will still have access to the accounts you've already connected. So, all you'll need to do is call <code class="text-sky-800 text-s">eth_accounts</code> to retrieve them in the background.</p>
      <div v-if="selectedProviderDetail">
        <div v-if="!currentAccountAddress" class="bg-pink-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4 mb-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-500 truncate dark:text-gray-400">
              account[0]: Not Available
            </p>
          </div>
        </div>
        <div v-else class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4 mb-4">
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            account[0]: {{ currentAccountAddress }}
          </p>
        </div>
        <Button @click="connectWalletAccount(selectedProviderDetail)" class="connect-button"
          :disabled="!selectedProviderDetail || (selectedProviderDetail && currentAccountAddress)">Request
          accounts</Button>
      </div>
      <div v-else>
        No provider selected
      </div>
    </div>
    <div class="space-y-4"><!-- Part 6: Sign a message -->
      <h2 class="text-2xl font-extrabold">Step 6: Sign a Message</h2>
      <p class="text-gray-500">In this step, you'll use the selected provider to sign a message.</p>
      <p class="text-gray-500">With the help of <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a></a>, you can choose which wallet to use to sign whatever you need to.</p>
      <p class="text-gray-500">Give it a try! Sign a message, then choose another wallet provider and repeat the process. You'll notice that messages in the log are being signed by different wallets.</p>
      <div v-if="selectedProviderDetail && currentAccountAddress">
        <div class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
          <div class="flex-1 min-w-0">
            <label for="signature-text" class="block text-sm font-medium text-gray-700">String to sign:</label>
            <div class="mt-1">
              <input v-model="signatureInputText" type="text" placeholder="some string to sign"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 my-4" />
            </div>
            <Button @click="signMessage(selectedProviderDetail)" class="sign-button"
              :disabled="!selectedProviderDetail || !signatureInputText">Sign String</Button>
          </div>
        </div>
        <div class="bg-green-50 flex flex-col items-start space-y-4 px-4 py-4">
          <div v-for="signature in signatures">
            <p class="text-sm text-gray-500 truncate dark:text-gray-400">
              {{ signature.slice(0, 64) + (signature.length > 64 ? '...' : '') }}
            </p>
          </div>
        </div>
      </div>
      <div v-else>
        No account available yet
      </div>
    </div>
    <div class="space-y-4"><!-- Part 7: Send a transaction -->
      <h2 class="text-2xl font-extrabold">Step 7: Send a Transaction</h2>
      <p class="text-gray-500">And now, for the grand finale! Let's send a transaction. It's just as easy as everything else we've done:</p>
      <div v-if="selectedProviderDetail && currentAccountAddress">
        <div class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
          <div class="flex-1 min-w-0">
            <label for="to-address" class="block text-sm font-medium text-gray-700">To Address:</label>
            <div class="mt-1">
              <input v-model="txToAddress" type="text" placeholder="Enter to address"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 my-4" />
            </div>
            <label for="transaction-value" class="block text-sm font-medium text-gray-700">Value (Wei):</label>
            <div class="mt-1">
              <input v-model="txValue" type="text" placeholder="Enter transaction value"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 my-4" />
            </div>
            <Button @click="sendTransaction(selectedProviderDetail)" class="send-button"
              :disabled="!selectedProviderDetail || !txToAddress">Send Transaction</Button>
          </div>
        </div>
      </div>
      <div v-else>
        No account available yet
      </div>
    </div>
    <div class="space-y-4"><!-- Part 7: Send a transaction -->
      <h2 class="text-2xl font-extrabold">Thanks for joining the exploration!</h2>
      <div class="bg-cyan-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
      <p class="text-sm text-gray-500 truncate dark:text-gray-400">
        Connect with me on socials:
      </p>
      <div class="flex space-x-4">
        <a href="https://warpcast.com/nfwsncked" target="_blank" class="text-sky-700 hover:text-red-700">Farcaster</a>
        <a href="https://discord.com/users/nfwsncked" target="_blank" class="text-sky-700 hover:text-red-700">Discord</a>
        <a href="https://twitter.com/nfwsncked" target="_blank" class="text-sky-700 hover:text-red-700">Twitter</a>
      </div>
      </div>
    </div>
  </div>
  </template>
