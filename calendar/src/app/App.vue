<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div class="bg-gray-100 text-white flex flex-row p-4">
      <div class="inline basis-3/4 text-xl object-contain">
        <img alt="logo" src="../assets/img/HeaderLogo.png" class="object-contain h-20">
      </div>
      <div class="basis-1/4 flex items-center justify-end">
        <span class="text-black inline-block text-3xl">Calendar</span>
      </div>
    </div>
  </header>


  <main>
    <div class="h-[90vh] w-full pl-4 pr-4">
      <RouterView/>
    </div>
  </main>
</template>

<style>
</style>
