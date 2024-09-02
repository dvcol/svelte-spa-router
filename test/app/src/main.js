import { mount } from 'svelte';

// Initialize the Svelte app and inject it in the DOM
import App from './App.svelte'
const app = mount(App, { target: document.body})

export default app
