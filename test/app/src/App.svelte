<h1>svelte-spa-router example</h1>
<!-- Navigation links, using the "link" action -->
<!-- Also, use the "active" action to add the "active" CSS class when the URL matches -->
<ul class="navigation-links">
    <li><a href="/" use:link use:active>Home</a></li>
    <li><a href="/brand" use:link><b>Brand</b></a></li>
    <li><a href="/hello/svelte" use:link use:active={{path: '/hello/*', className: 'active another-class', inactiveClassName: 'inactive'}}>Say hi!</a></li>
    <li><a href="/does/not/exist" use:link>Not found</a></li>
</ul>

<!-- Navigate with buttons -->
<p class="navigation-buttons">
    <button on:click={() => push('/wild/something')}>Visit /wild/something</button>
    <button on:click={() => pop()}>Go back</button>
    <button on:click={() => replace('/wild/replaced')}>Replace current page</button>
</p>

<!-- Query string -->
<a href="/hello/svelte?quantity=100" use:link use:active={'/hello/*'}>Querystring args</a>

<!-- Show the current path -->
<p>
    Current path: <code id="currentpath">{$location}</code>
    <br/>
    Querystring: <code id="currentqs">{$querystring}</code>
    <br/>
    Params: <code id="currentparams">{JSON.stringify($params)}</code>
</p>

<!-- Show the router -->
<Router
  {routes}
  {conditionsFailed}
  {routeLoaded}
  {routeLoading}
  routeEvents={[routeEvent]}
  {restoreScrollState}
/>

<!-- Testing dynamic list of links -->
<h2>Dynamic links</h2>
<ul class="navigation-dynamic-links">
{#each dynamicLinks as dl (dl.id)}
    <li>
        <a id="dynamic-link-{dl.id}" href={dl.link} use:link use:active>Dynamic Link {dl.id}</a>
         - 
        <i role="button" id="delete-link-{dl.id}" on:click={() => dynamicLinks = dynamicLinks.filter(e => e.id != dl.id)}>delete link</i>
    </li>
{/each}
</ul>

<!-- Testing links that can be disabled -->
<h2>Dynamic links</h2>
<ul class="navigation-disable-links">
{#each disableLinks as dl, i (dl.id)}
    <li>
        <a id="disable-link-{dl.id}" href="/foo" use:link={dl.opts} use:active>Dynamic Link {dl.id}</a>
         - 
        <i role="button" id="toggle-link-{dl.id}" on:click={dl.toggle}>
            {#if dl.opts.disabled}
                enable link
            {:else}
                disable link
            {/if}
        </i>
    </li>
{/each}
</ul>

<!-- Test use:active with a regular expression -->
<p><a href="#/" use:active={/\/*\/hi/}>This link</a> is active when you're matching <code>/*/hi</code></p>

<!-- Used for testing -->
<pre id="logbox">{logbox}</pre>

<style>
/* Style for "active" links; need to mark this :global because the router adds the class directly */
:global(a.active) {
    color: crimson;
}
/* Style for "inactive" links; need to mark this :global because the router adds the class directly */
:global(a.inactive) {
    color: gray;
}
</style>

<script>
// Import the router component
// Normally, this would be: `import Router from 'svelte-spa-router'`
import Router from '../../../lib/index.js'
// Import the "link" action, the methods to control history programmatically from the same module, and the location store
// The params store contains the current list of params, parsed
// Normally, this would be: `import {link, push, pop, replace, location, querystring} from 'svelte-spa-router/active'`
import {link, push, pop, replace, location, querystring, params} from '../../../lib/index.js'

// Import the "active" action
// Normally, this would be: `import active from 'svelte-spa-router/active'`
import active from '../../../lib/active/active.js'

// Import the list of routes
import routes from './routes'

// Contains logging information used by tests
let logbox = ''

// Handles the "conditionsFailed" event dispatched by the router when a component can't be loaded because one of its pre-condition failed
function conditionsFailed(event) {
    // eslint-disable-next-line no-console
    console.error('Caught event conditionsFailed', event)
    logbox += 'conditionsFailed - ' + JSON.stringify(event) + '\n'

    // Replace the route
    replace('/wild/conditions-failed')
}

// Handles the "routeLoaded" event dispatched by the router after a route has been successfully loaded
function routeLoaded(event) {
    // eslint-disable-next-line no-console
    console.info('Caught event routeLoaded', event)
    logbox += 'routeLoaded - ' + JSON.stringify(event) + '\n'
}

// Handles the "routeLoading" event dispatched by the router whie a route is being loaded
// If the route is dynamically imported, such as with the `import()` syntax, then there might be a delay before the route is loaded
function routeLoading(event) {
    // eslint-disable-next-line no-console
    console.info('Caught event routeLoading', event)
    logbox += 'routeLoading - ' + JSON.stringify(event) + '\n'
}

// Handles event bubbling up from nested routes
function routeEvent(event) {
    // eslint-disable-next-line no-console
    console.info('Caught event routeEvent', event)
    logbox += 'routeEvent - ' + JSON.stringify(event) + '\n'
}

// Enables the restoreScrollState option by checking for the "scroll=1" querystring parameter
// We're checking this for the tests, but in your code you will likely want to set this value manually
const urlParams = new URLSearchParams(window.location.search)
const restoreScrollState = !!urlParams.has('scroll')

// List of dynamic links
let dynamicLinks = [
    {
        id: 1,
        link: '/hello/dynamic-link-1'
    },
    {
        id: 2,
        link: '/hello/dynamic-link-2'
    },
    {
        id: 3,
        link: '/hello/dynamic-link-3'
    }
]

// List of links that can be disabled
let disableLinks = [
    {
        id: 1,
        opts: {
            //href: '/hello/disable-link-1',
            disabled: false
        }
    },
    {
        id: 2,
        opts: {
            //href: '/hello/disable-link-2',
            disabled: false
        }
    },
    {
        id: 3,
        opts: {
            href: '/hello/disable-link-3',
            disabled: false
        }
    }
].map((el) => {
    el.toggle = () => {
        el.opts.disabled = !el.opts.disabled
        disableLinks = disableLinks
    }
    return el
})
</script>
