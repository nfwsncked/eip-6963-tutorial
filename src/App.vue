<script setup lang="ts">
import DemoView from './components/DemoView.vue'
</script>

<template>
  <div>
    
    <div class="flex-1 lg:max-w-xl mx-auto py-10 md: py-20 space-y-6">
      
      <div class="space-y-2">
        <div class="flex items-center space-x-2">
          <p class="text-sm text-gray-300">by <a  class="text-fuchsia-300 font-medium " href="https://warpcast.com/nfwsncked"><img src="/favicon.ico" class="w-4 h-4 rounded-full inline-block ml-1 opacity-30"> @nfwsncked </a></p>
        </div>
        <h1 class="scroll-m-20 text-4xl font-bold tracking-tight"><span class="text-transparent bg-clip-text bg-gradient-to-r to-cyan-600 from-sky-500"><svg class="inline-block w-4 h-10 -mt-2 text-sky-500" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="ethereum" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="currentColor" d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"></path></svg> EIP-6963:</span> Embrace Connectivity, Reject Limitations</h1>
        <p class="text-lg text-muted-foreground">A short guide on how to make wallet connection less stressfull.</p>
      </div>
      <p class="text-gray-500">
        This demo is your interactive guide to request and select a crypto wallet provider, and then access the details of the selected provider. Let's dive in to understand how the <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong>EIP-6963</strong></a> protocol works.
      </p>
      <p class="text-gray-500">For a more detailed dive into the topic, feel free to check out the official <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank"><strong class="text-sky-500">EIP-6963 Specification</strong></a>.</p>
      <p class="text-gray-500 text-xl">You can find this guide and all the related code on <a href="https://github.com/nfwsncked/eip-6963-tutorial" target="_blank"><strong class="text-sky-500">GitHub</strong></a></p>
      <main>
        <DemoView />
      </main>
    </div>
  </div>
</template>

<style>
@media (max-width: 640px) {
  body {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

</style>
