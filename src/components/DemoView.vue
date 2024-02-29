<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Button } from '@/components/shadcn/ui/button'
import { type EIP6963ProviderDetail } from '../injected-wallet-provider/types';
import { InjectedWalletProvider } from '../injected-wallet-provider/injected-wallet-provider';

// Define our custom Injected Wallet Provider
const injectedWalletProvider = new InjectedWalletProvider();

// parameter that is true when no providers were received after clicking 'Request Providers' button
const noProvidersAvailableAfterRequest = ref<boolean>(false);
// availableProviderDetails will store all providers from InjectedWalletProvider.providerDetails
const availableProviderDetails = ref<EIP6963ProviderDetail[]>([]);
// availableProviderDetails stores currently selected wallet provider
const selectedProviderDetail = ref<EIP6963ProviderDetail | null>(null);
// holds value of default provider rdns, chosen by the user
const defaultProviderRdns = ref<string | null>(null);

// all addresses available at current provider
const allProviderAddresses = ref<string[]>([]);
// currently selected provider address
const currentAccountAddress = ref<string | null>(null);

// signature interface
interface SignedMessage {
  providerName: string
  message: string
  address: string
  signature: string
}

// Account actions input refs:
//   sign message 
const signatureInputText = ref<string>('');
const signatures = ref<SignedMessage[]>([]);
//   sign transaction
const txToAddress = ref<string>('');
const txValue = ref<string>('500000000000000000');

// watch for selectedProviderDetail changes
watch(selectedProviderDetail, () => {
  currentAccountAddress.value = null;
  if (selectedProviderDetail.value) {
    getConnectedWalletAccounts(selectedProviderDetail.value);
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

// uses injectedWalletProvider to request providers from installed extensions
function requestProviders() {
  injectedWalletProvider.requestProviders()
  setTimeout(() => {
    if (availableProviderDetails.value.length === 0) {
      noProvidersAvailableAfterRequest.value = true;
    }
  }, 300);
}

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
  injectedWalletProvider.providerDetails.forEach(v => {
    if (v.info.rdns === defaultProviderRdns.value) {
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
async function requestWalletAccounts(providerDetail: EIP6963ProviderDetail) {
  try {
    const accounts = await providerDetail.provider.request({ method: 'eth_requestAccounts' });
    updateProviderAddresses(accounts);
  } catch (e) {
    console.error(`error getting account: ${e}`);
  }
}

// retrieves the connected wallet account by requesting the 'eth_accounts' method from the provider
async function getConnectedWalletAccounts(providerDetail: EIP6963ProviderDetail) {
  const accounts = await providerDetail.provider.request({ method: 'eth_accounts' });
  if (accounts) {
    updateProviderAddresses(accounts);
  }
}

function updateProviderAddresses(accounts: string[]) {
  allProviderAddresses.value = accounts;
  setCurrentWalletAccount(accounts[0]);
}

// sets the current wallet account by assigning the provided account to the txToAddress and currentAccountAddress values for later use
function setCurrentWalletAccount(account: string) {
  txToAddress.value = account;
  currentAccountAddress.value = account;
  console.log(`current account has been set to: ${account}`);
}

// signs a message by requesting the 'personal_sign' method from the provider
async function signMessage(providerDetail: EIP6963ProviderDetail) {
  if (!currentAccountAddress.value) {
    return
  }
  try {
    const msg = signatureInputText.value;
    const signature = await providerDetail.provider.request({
      method: 'personal_sign',
      params: [msg, currentAccountAddress.value]
    });
    const signatureLog = `signed '${signatureInputText.value}' with [${providerDetail.info.name}] ${currentAccountAddress.value}, signature: ${signature}`;
    console.log(signatureLog);
    signatures.value.push({
      providerName: providerDetail.info.name,
      message: signatureInputText.value,
      address: currentAccountAddress.value,
      signature: signature
    });
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
      <h2 class="text-2xl font-extrabold">Step 1: Requesting Available Providers</h2>
      <p class="text-gray-500">After clicking the button below, the <a href="https://eips.ethereum.org/EIPS/eip-6963"
          target="_blank"><strong>EIP-6963</strong></a>
        magic begins. This button triggers <code
          class="text-sky-800 text-s">InjectedWalletProvider.requestProviders</code>.</p>
      <p class="text-gray-500">It sends out an <code class="text-sky-800 text-s">eip6963:requestProvider</code> event.
        All <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a> compatible
        wallet extensions in your browser will hear this call and respond with an <code
          class="text-sky-800 text-s">eip6963:announceProvider</code>
        event. Each of these events carries the details of a wallet provider. This way, your DApp gets to know all the
        available wallet providers in the user's browser.</p>
      <Button @click="requestProviders()" class="emit-button"
        :disabled="availableProviderDetails.length || noProvidersAvailableAfterRequest">Request Providers</Button>
      <div class="space-y-4" v-if="availableProviderDetails.length">
        <p class="text-gray-500">Here are the wallet providers that responded to the request with <code
            class="text-sky-800 text-s">announceProvider</code> event.</p>
        <p class="text-gray-500">Click <strong>'Select'</strong> to choose a provider:</p>
        <div v-for="provider in availableProviderDetails" :key="provider.info.name"
          :class="{ 'flex items-center space-x-4 rtl:space-x-reverse max-w-ld px-4 py-2': true, 'bg-green-100': selectedProviderDetail && selectedProviderDetail.info.name === provider.info.name, 'bg-gray-100': !selectedProviderDetail || selectedProviderDetail.info.name !== provider.info.name }">
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
          <Button @click="selectProvider(provider)" class="select-button" variant="secondary"
            :disabled="selectedProviderDetail && selectedProviderDetail.info.name == provider.info.name">Select</Button>
        </div>
      </div>
      <div class="space-y-4" v-else>
        <p class="text-gray-500">No providers responded to the request with <code
            class="text-sky-800 text-s">announceProvider</code> event yet. Let's get it rolling!</p>
        <p class="text-gray-500">Click <strong>'Request Providers'</strong> to ask your browser what's installed</p>
        <div v-if="noProvidersAvailableAfterRequest"
          class="flex items-center justify-center space-x-4 rtl:space-x-reverse max-w-ld bg-red-50 px-4 min-h-[8rem]">
          <p class="text-gray-500">No EIP-6963 providers found in your browser :(</p>
        </div>
        <div v-else
          class="flex justify-center items-center space-x-4 rtl:space-x-reverse max-w-ld bg-gray-100 px-4 min-h-[8rem]">
          <p class="text-gray-500">Wallet providers available in your browser will pop up right here.</p>
        </div>
      </div>
      <h2 class="text-l font-extrabold">Get to Know Your Provider Metadata</h2>
      <p class="text-gray-500">Let's dive into the details of the provider you've chosen. If you've selected one, you'll
        find contents of announced provider's <code class="text-sky-800 text-s">detail.info</code> in the box
        below:</p>
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
            icon: {{
              selectedProviderDetail.info.icon.length > 50 ? selectedProviderDetail.info.icon.substring(0, 24) +
              '...' + selectedProviderDetail.info.icon.substring(selectedProviderDetail.info.icon.length - 24) :
              selectedProviderDetail.info.icon
            }}
          </p>
        </div>
      </div>
      <div v-else
        class="bg-gray-100 flex justify-center items-center space-x-4 rtl:space-x-reverse px-4 py-4 min-h-[7rem]">
        <p class="text-gray-500">Haven't picked a provider yet? Go ahead and choose one!</p>
      </div>
      <p class="text-gray-500">Before the introduction of <a href="https://eips.ethereum.org/EIPS/eip-6963"
          target="_blank"><strong>EIP-6963</strong></a>, regardless
        of the number of wallets installed in your browser, only one could be active on a page at a time, occupying the
        <code class="text-sky-800 text-s">window.ethereum</code> space. This limitation meant that during page load, a
        race condition would occur, and the last wallet to load would take up this space. Developers had no control over
        this process. However, the advent of <a href="https://eips.ethereum.org/EIPS/eip-6963"
          target="_blank"><strong>EIP-6963</strong></a>
        has dramatically changed this scenario.
      </p>
      <p class="text-gray-500">Now, you're free to use multiple providers at the same time, as many as you need.</p>
    </div>
    <div class="space-y-4"><!-- Part 2: Connected wallet account -->
      <h2 class="text-2xl font-extrabold">Step 2: Connect to Your Wallet Account</h2>
      <p class="text-gray-500">Once you've chosen a provider, the next step is to link up with the accounts in your
        wallet extension. To do this, we have to send a
        <code class="text-sky-800 text-s">'eth_requestAccounts'</code> call using the <code
          class="text-sky-800 text-s">provider.request</code> method. This will connect your DApp to your
        wallet extension for the first time.
      </p>
      <p class="text-gray-500">If you refresh the page or come back later, your DApp will still have access to the
        accounts you've already connected. So, all you'll need to do is call <code
          class="text-sky-800 text-s">eth_accounts</code>
        to retrieve them in the background.</p>
      <div v-if="availableProviderDetails.length" class="space-y-4">
        <div v-for="provider in availableProviderDetails" :key="provider.info.name"
          :class="{ 'bg-green-100': selectedProviderDetail && selectedProviderDetail.info.name === provider.info.name, 'bg-gray-100': !(selectedProviderDetail && selectedProviderDetail.info.name === provider.info.name) }"
          class="flex items-center space-x-4 rtl:space-x-reverse max-w-ld px-4 py-2">
          <div class="flex-shrink-0">
            <img class="w-8 h-8 rounded-full" :src="provider.info.icon" alt="Provider image">
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
              {{ provider.info.name }} <span v-if="defaultProviderRdns && defaultProviderRdns === provider.info.rdns"
                class="text-gray-500">(default)</span>
            </p>
            <p class="text-sm text-gray-500 truncate dark:text-gray-400">
              {{ provider.info.rdns }}
            </p>
          </div>
          <div class="flex space-x-2">
            <Button @click="selectProvider(provider)" class="select-button" variant="secondary"
              :disabled="selectedProviderDetail && selectedProviderDetail.info.name === provider.info.name">Select</Button>
            <Button @click="requestWalletAccounts(provider)" class="connect-button" variant="secondary"
              :disabled="!selectedProviderDetail || ((selectedProviderDetail && selectedProviderDetail.info.name === provider.info.name) && allProviderAddresses.length) || (selectedProviderDetail && selectedProviderDetail.info.name !== provider.info.name)">Request
              Accounts</Button>
          </div>
        </div>
      </div>
      <div v-else class="bg-gray-100 flex items-center space-x-4 rtl:space-x-reverse px-4 py-12">
        <div class="flex justify-center items-center w-full">
          <p class="text-gray-500">Haven't requested providers yet?</p>
        </div>
      </div>
      <div v-if="allProviderAddresses.length">
        <div v-for="(address, index) in allProviderAddresses" :key="index"
          :class="{ 'bg-yellow-100': currentAccountAddress === address, 'bg-gray-100': currentAccountAddress !== address }"
          class="flex justify-between items-center px-4 py-2 mb-2 rounded-lg">
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            <strong>account[{{ index }}]:</strong> {{ address }}
          </p>
          <Button @click="setCurrentWalletAccount(address)" class="select-button" variant="secondary"
            :disabled="currentAccountAddress === address">Select</Button>
        </div>
      </div>
      <div v-else>
        <div class="bg-gray-100 flex items-center justify-center space-x-4 rtl:space-x-reverse px-4 py-12 min-h-[11rem]">
          <p v-if="selectedProviderDetail" class="text-gray-500">No wallets available for {{
            selectedProviderDetail.info.name }} yet.</p>
          <p v-else class="text-gray-500">There is no provider selected yet</p>
        </div>
      </div>
    </div>
    <div class="space-y-4"><!-- Part 3: Sign a message -->
      <h2 class="text-2xl font-extrabold">Step 3: Sign a Message</h2>
      <p class="text-gray-500">In this step, you'll use the selected provider to sign a message.</p>
      <p class="text-gray-500">With the help of <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><a
            href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a></a>, you can
        choose which wallet to use to sign whatever you need to.</p>
      <p class="text-gray-500">Give it a try! Sign a message, then choose another wallet provider and repeat the
        process. You'll notice that messages in the log are being signed by different wallets.</p>
      <div v-if="selectedProviderDetail && currentAccountAddress">
        <div class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
          <div class="flex-1 min-w-0">
            <label for="signature-text" class="block text-sm font-medium text-gray-700">String to sign with {{
              currentAccountAddress }}:</label>
            <div class="mt-1">
              <input v-model="signatureInputText" type="text" placeholder="some string to sign"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 my-4" />
            </div>
            <Button @click="signMessage(selectedProviderDetail)" class="sign-button"
              :disabled="!selectedProviderDetail || !signatureInputText">Sign String
            </Button>
          </div>
        </div>
      </div>
      <div v-else
        class="bg-gray-50 flex items-center justify-center space-x-4 rtl:space-x-reverse px-4 py-4 min-h-[11rem]">
        <p class="text-gray-500">No account available yet</p>
      </div>
      <div v-if="signatures.length" class="bg-yellow-50 flex flex-col items-start space-y-4 px-4 py-4">
        <div v-for="signature in signatures">
          <div class="text-sm text-gray-500 truncate dark:text-gray-400">
            <p><strong>[{{ signature.providerName }}]</strong>: {{ signature.address }}</p>
            <p><strong>message:</strong> {{ signature.message }} | <strong>signature:</strong> {{
              signature.signature.length > 30 ? signature.signature.substring(0, 15) + '...' +
            signature.signature.substring(signature.signature.length - 15) : signature.signature }}</p>
          </div>
        </div>
      </div>
      <div v-else class="bg-yellow-50 flex items-center justify-center space-x-4 rtl:space-x-reverse px-4 py-4">
        <p class="text-gray-500">Looks like there are no signed messages yet. Sign one?</p>
      </div>
    </div>
    <div class="space-y-4"><!-- Part 4: Send a transaction -->
      <h2 class="text-2xl font-extrabold">Step 4: Send a Transaction</h2>
      <p class="text-gray-500">And now, for the grand finale! Let's send a transaction. It's just as easy as everything
        else we've done:</p>
      <div v-if="selectedProviderDetail && currentAccountAddress">
        <div class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
          <div class="flex-1 min-w-0">
            <label for="from-address" class="block text-sm font-medium text-gray-700">From Address:</label>
            <div class="mt-1">
              <input v-model="currentAccountAddress" type="text" placeholder="Your address" disabled
                class="bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-600 dark:border-gray-600 dark:text-white my-4" />
            </div>
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
              :disabled="!selectedProviderDetail || !txToAddress">Send Transaction
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="bg-gray-50 flex items-center justify-center min-h-[22rem]">
        <p class="text-gray-500">No account available yet</p>
      </div>
    </div>
    <div class="space-y-4"><!-- Part 5: Save selected wallet as default using localStorage -->
      <h2 class="text-2xl font-extrabold">Step 5: Make Your Wallet the Default Choice</h2>
      <p class="text-gray-500">Bonus move: imagine you have a favorite wallet extension that you want to use every time you interact
        with this DApp. With <a href="https://eips.ethereum.org/EIPS/eip-6963"
          target="_blank"><strong>EIP-6963</strong></a>
        you finally can make this happen!</p>
      <p class="text-gray-500">Clicking <strong>'Store'</strong> will call <code
          class="text-sky-800 text-s">storeDefaultProviderRdns</code>
        on <code class="text-sky-800 text-s">InjectedWalletProvider</code> that will save the unique <code
          class="text-sky-800 text-s">info.rdns</code> value of your chosen provider into
        <strong>localStorage</strong>. So, the next time you refresh the page, the DApp will be able to read
        <strong>localStorage</strong>
        and automatically select your preferred wallet.
      </p>
      <div v-if="selectedProviderDetail"
        :class="{ 'bg-green-50': selectedProviderDetail.info.rdns === defaultProviderRdns, 'bg-yellow-50': selectedProviderDetail.info.rdns !== defaultProviderRdns }"
        class="flex flex-col items-center justify-center space-x-4 rtl:space-x-reverse px-4 py-4">
        <div class="flex items-center justify-center space-x-4 rtl:space-x-reverse">
          <Button v-if="selectedProviderDetail.info.rdns != defaultProviderRdns"
            @click="setDefaultProvider(selectedProviderDetail)" class="save-provider-button">Set {{
              selectedProviderDetail.info.name
            }} as Default
          </Button>
          <Button v-else @click="removeDefaultProvider()" class="remove-provider-button">Unset {{
            selectedProviderDetail.info.name
          }} as Default
          </Button>
        </div>
        <p class="text-gray-500 mt-6">Default provider stored in localStorage: <strong>{{ defaultProviderRdns || 'not set'
        }}</strong></p>
      </div>
      <div v-else class="bg-gray-50 flex items-center justify-center space-x-4 rtl:space-x-reverse px-4 py-10">
        <p class="text-gray-500">No provider selected yet</p>
      </div>
    </div>
    <div class="space-y-10">
      <h2 class="text-2xl font-semibold">Thanks for completing the exploration, continue to enhance this space together!</h2>
      <div class="bg-yellow-100 flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 rtl:space-x-reverse px-4 py-4">
        <p class="text-sm text-cyan-700 truncate dark:text-gray-400 font-extralight">
          Let's get connected (:
        </p>
        <div class="flex flex-wrap justify-center sm:block space-x-2 sm:space-x-4">
          <a href="https://twitter.com/nfwsncked" target="_blank"
            class="text-sky-700 hover:text-red-300 font-semibold mb-2 sm:mb-0">Twitter</a>
          <a href="https://warpcast.com/nfwsncked" target="_blank"
            class="text-sky-700 hover:text-red-300 font-semibold mb-2 sm:mb-0">Farcaster</a>
          <a href="https://discord.com/users/nfwsncked" target="_blank"
            class="text-sky-700 hover:text-red-300 font-semibold mb-2 sm:mb-0">Discord</a>
          <a href="https://github.com/nfwsncked" target="_blank"
            class="text-sky-700 hover:text-red-300 font-semibold">GitHub</a>
        </div>
      </div>
    </div>
  </div>
</template>
