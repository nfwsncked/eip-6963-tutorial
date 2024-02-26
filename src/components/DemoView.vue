<script setup lang="ts">
import { onMounted, ref, watch, watchEffect } from 'vue';
import { Button } from '@/components/shadcn/ui/button'
import { type EIP6963ProviderDetail } from '../injected-wallet-provider/provider-events';
import { InjectedWalletProvider } from '../injected-wallet-provider/injected-wallet-provider';

// Define our custom Injected Wallet Provider
const injectedWalletProvider = new InjectedWalletProvider();

const localStorageName = 'demoAppDefaultWalletProviderRdns';

const availableProviders = ref<EIP6963ProviderDetail[]>([]);
const selectedProviderDetail = ref<EIP6963ProviderDetail | null>(null);

const defaultProviderRdns = ref<string | null>(null);

const currentAccountAddress = ref<string | null>(null);

// Input value refs:
const signatureInputText = ref<string>('');
const signatures = ref<string[]>([]);

const txToAddress = ref<string>('');
const txValue = ref<string>('500000000000000000');

watch(selectedProviderDetail, () => {
  currentAccountAddress.value = null;
  isAccountConnected();
});

onMounted(() => {
  readDefaultProviderRdns();
  watchInjectedWalletDetailsChanges();
  injectedWalletProvider.subscribe();
})

function watchInjectedWalletDetailsChanges() {
  injectedWalletProvider.on('providerDetailsUpdated', ()=>{
    availableProviders.value = injectedWalletProvider.providerDetails
  })
}

function selectProvider(wallet: EIP6963ProviderDetail) {
  selectedProviderDetail.value = wallet;
}

function saveSelectedProviderAsDefault() {
  if (!selectedProviderDetail.value) {
    return
  }
  defaultProviderRdns.value = selectedProviderDetail.value.info.rdns
  window.localStorage.setItem(localStorageName, selectedProviderDetail.value.info.rdns)
  console.log(`default wallet provider was saved into localStorage: '${selectedProviderDetail.value.info.rdns}'`)
}

function readDefaultProviderRdns() {
  const storedProviderRdns = window.localStorage.getItem(localStorageName)
  if (!storedProviderRdns) {
    return
  }
  defaultProviderRdns.value = storedProviderRdns
  return storedProviderRdns
}

function removeDefaultProvider() {
  window.localStorage.removeItem(localStorageName)
  defaultProviderRdns.value = null
  console.log('default wallet provider was removed from localStorage')
}

async function isAccountConnected() {
  if (!selectedProviderDetail.value) {
    return
  }
  const provider = selectedProviderDetail.value.provider
  const accounts = await provider.request({ method: 'eth_accounts' })
  if (accounts) {
    setCurrentAccount(accounts[0])
  }
}

async function getCurrentAccount(): Promise<any> {
  if (!selectedProviderDetail.value) {
    return
  }
  const provider = selectedProviderDetail.value.provider
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' })
    setCurrentAccount(accounts[0])
  } catch (e) {
    console.error(`error getting account: ${e}`);
  }
}

function setCurrentAccount(account: string) {
  txToAddress.value = account;
  currentAccountAddress.value = account;
  console.log(`current account has been set to: ${account}`);
}

async function signWithSelectedProvider() {
  if (!selectedProviderDetail.value || !currentAccountAddress.value) {
    return;
  }
  const provider = selectedProviderDetail.value.provider;
  try {
    const msg = signatureInputText.value;
    const signature = await provider.request({ method: 'personal_sign', params: [msg, currentAccountAddress.value] });
    const signatureLog = `signed '${signatureInputText.value}' with ${selectedProviderDetail.value.info.name}, signature: ${signature}`;
    console.log(signatureLog);
    signatures.value.push(signatureLog);
  } catch (error) {
    console.error(`error signing: ${error}`);
  }
}

async function sendTransactionWithSelectedProvider() {
  if (!selectedProviderDetail.value || !currentAccountAddress.value) {
    return;
  }
  // this is a demo implementation to avoid excesive dependencies
  // for production-ready apps you should use ethers / web3.js or bn.js to properly work with BigNumbers
  const value = `0x${parseInt(txValue.value).toString(16)}`;
  const provider = selectedProviderDetail.value.provider;
  try {
    const transactionParameters = {
      to: txToAddress.value,
      from: currentAccountAddress.value,
      value: value,
    };
    const txHash = await provider.request({
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
    <div class="space-y-2"><!-- Part 1: Request available providers -->
      <h2 class="text-2xl font-extrabold">Step 1: Request available providers</h2>
      <p class="text-gray-500">Click the button below to emit a <code
          class="text-sky-800">'eip6963:requestProvider'</code> event. This will request the list of available wallet
        providers.</p>
      <Button @click="injectedWalletProvider.requestProviders()" class="emit-button">Emit eip6963:requestProvider</Button>
    </div>
    <div class="space-y-2"><!-- Part 2: Display available providers -->
      <h2 class="text-2xl font-extrabold">Step 2: Select a provider</h2>
      <p class="text-gray-500">Here are the wallet providers that responded to the request. Click 'Select' to choose a
        provider.</p>
      <p class="text-gray-500"></p>
      <div v-for="provider in availableProviders" :key="provider.info.name"
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
    </div>

    <div class="space-y-2"><!-- Part 3: Display selected provider -->
      <h2 class="text-2xl font-extrabold">Step 3: Access selected provider info</h2>
      <p class="text-gray-500">Here are the details of the selected provider. These are contents of <code
          class="text-sky-800">'EIP6963AnnounceProviderEvent.detail.info'</code></p>
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
    <div class="space-y-2"><!-- Part 4: Save selected wallet as default using localStorage -->
      <h2 class="text-2xl font-extrabold">Step 4: Save selected wallet as default</h2>
      <p class="text-gray-500">Press 'Store' to save your chosen provider's RDNS value into localStorage. After refreshing
        the page, the DApp will use this value to automatically select your preferred wallet.</p>
      <div v-if="selectedProviderDetail">
        <Button v-if="selectedProviderDetail.info.rdns != defaultProviderRdns" @click="saveSelectedProviderAsDefault()"
          class="save-provider-button">Store {{ selectedProviderDetail.info.name }} as default</Button>
        <Button v-else @click="removeDefaultProvider()" class="remove-provider-button">Remove {{
          selectedProviderDetail.info.name }} as default</Button>
      </div>
      <div v-else>
        No provider selected
      </div>
    </div>
    <div class="space-y-2"><!-- Part 5: Connected wallet account -->
      <h2 class="text-2xl font-extrabold">Step 5: Connected Wallet Account</h2>
      <p class="text-gray-500"><code class="text-sky-800">'EIP6963AnnounceProviderEvent.detail.provider'</code> can be
        used to send <code class="text-sky-800">'eth_requestAccounts'</code> and get the address of the connected wallet
        account:
      </p>
      <div v-if="!currentAccountAddress" class="bg-pink-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            account[0]: Not Available
          </p>
        </div>
      </div>
      <div v-else class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
        <p class="text-sm text-gray-500 truncate dark:text-gray-400">
          account[0]: {{ currentAccountAddress }}
        </p>
      </div>
      <p class="text-gray-500">Remember, if you've already connected an account with the same provider, you won't need to
        do it again after refreshing the page. The wallet extension keeps track of all connected accounts.</p>
      <Button @click="getCurrentAccount()" class="connect-button"
        :disabled="!selectedProviderDetail || (selectedProviderDetail && currentAccountAddress)">Request accounts</Button>
    </div>
    <div class="space-y-2"><!-- Part 6: Sign a message -->
      <h2 class="text-2xl font-extrabold">Step 6: Sign a message</h2>
      <p class="text-gray-500">Here <code class="text-sky-800">'EIP6963AnnouncePrasasdoviderEvent.detail.provider'</code>
        is used to sign a message using the connected wallet account:</p>
      <div v-if="selectedProviderDetail && currentAccountAddress">
        <div class="bg-green-50 flex items-center space-x-4 rtl:space-x-reverse px-4 py-4">
          <div class="flex-1 min-w-0">
            <label for="signature-text" class="block text-sm font-medium text-gray-700">Message to sign:</label>
            <div class="mt-1">
              <input v-model="signatureInputText" type="text" placeholder="some string to sign"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 my-4" />
            </div>
            <Button @click="signWithSelectedProvider()" class="sign-button"
              :disabled="!selectedProviderDetail || !signatureInputText">Sign Message</Button>
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
    <div class="space-y-2"><!-- Part 7: Send a transaction -->
      <h2 class="text-2xl font-extrabold">Step 7: Send a transaction</h2>
      <p class="text-gray-500">Here <code class="text-sky-800">'EIP6963AnnounceProviderEvent.detail.provider'</code> is
        used to send a transaction using the connected wallet account:</p>
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
          <Button @click="sendTransactionWithSelectedProvider()" class="send-button"
            :disabled="!selectedProviderDetail || !txToAddress">Send Transaction</Button>
        </div>
      </div>
    </div>
    <div v-else>
      No account available yet
    </div>
  </div>
</div></template>
../injected-wallet-provider/wallet-provider-events../injected-wallet-provider/events../injected-wallet-provider/provider-events