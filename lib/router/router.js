import {readable, writable, derived} from 'svelte/store'
import {tick} from 'svelte'

/**
 * @typedef {Object} Location
 * @property {string} location - Location (page/view), for example `/book`
 * @property {string} [querystring] - Querystring from the hash, as a string not parsed
 */
/**
 * Returns the current location from the hash.
 *
 * @returns {Location} Location object
 * @private
 */
function getLocation() {
    const hashPosition = window.location.href.indexOf('#/')
    let location = (hashPosition > -1) ? window.location.href.substr(hashPosition + 1) : '/'

    // Check if there's a querystring
    const qsPosition = location.indexOf('?')
    let querystring = ''
    if (qsPosition > -1) {
        querystring = location.substr(qsPosition + 1)
        location = location.substr(0, qsPosition)
    }

    return {location, querystring}
}

/**
 * Readable store that returns the current full location (incl. querystring)
 */
export const loc = readable(
    null,
    // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
        set(getLocation())

        const update = () => {
            set(getLocation())
        }
        window.addEventListener('hashchange', update, false)

        return function stop() {
            window.removeEventListener('hashchange', update, false)
        }
    }
)

/**
 * Readable store that returns the current location
 */
export const location = derived(
    loc,
    (_loc) => _loc.location
)

/**
 * Readable store that returns the current querystring
 */
export const querystring = derived(
    loc,
    (_loc) => _loc.querystring
)

/**
 * Store that returns the currently-matched params.
 * Despite this being writable, consumers should not change the value of the store.
 * It is exported as a readable store only (in the typings file)
 */
export const params = writable(undefined)

/**
 * Navigates to a new page programmatically.
 *
 * @param {string} location - Path to navigate to (must start with `/` or '#/')
 * @return {Promise<void>} Promise that resolves after the page navigation has completed
 */
export async function push(location) {
    if (!location || location.length < 1 || (location.charAt(0) != '/' && location.indexOf('#/') !== 0)) {
        throw Error('Invalid parameter location')
    }

    // Execute this code when the current call stack is complete
    await tick()

    // Note: this will include scroll state in history even when restoreScrollState is false
    history.replaceState({...history.state, __svelte_spa_router_scrollX: window.scrollX, __svelte_spa_router_scrollY: window.scrollY}, undefined)
    window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location
}

/**
 * Navigates back in history (equivalent to pressing the browser's back button).
 *
 * @return {Promise<void>} Promise that resolves after the page navigation has completed
 */
export async function pop() {
    // Execute this code when the current call stack is complete
    await tick()

    window.history.back()
}

/**
 * Replaces the current page but without modifying the history stack.
 *
 * @param {string} location - Path to navigate to (must start with `/` or '#/')
 * @return {Promise<void>} Promise that resolves after the page navigation has completed
 */
export async function replace(location) {
    if (!location || location.length < 1 || (location.charAt(0) != '/' && location.indexOf('#/') !== 0)) {
        throw Error('Invalid parameter location')
    }

    // Execute this code when the current call stack is complete
    await tick()

    const dest = (location.charAt(0) == '#' ? '' : '#') + location
    try {
        const newState = {
            ...history.state
        }
        delete newState['__svelte_spa_router_scrollX']
        delete newState['__svelte_spa_router_scrollY']
        window.history.replaceState(newState, undefined, dest)
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.')
    }

    // The method above doesn't trigger the hashchange event, so let's do that manually
    window.dispatchEvent(new Event('hashchange'))
}

/**
 * Dictionary with options for the link action.
 * @typedef {Object} LinkActionOpts
 * @property {string} href - A string to use in place of the link's href attribute. Using this allows for updating link's targets reactively.
 * @property {boolean} disabled - If true, link is disabled
 */

/**
 * Svelte Action that enables a link element (`<a>`) to use our history management.
 *
 * For example:
 *
 * ````html
 * <a href="/books" use:link>View books</a>
 * ````
 *
 * @param {HTMLElement} node - The target node (automatically set by Svelte). Must be an anchor tag (`<a>`) with a href attribute starting in `/`
 * @param {string|LinkActionOpts} opts - Options object. For legacy reasons, we support a string too which will be the value for opts.href
 */
export function link(node, opts) {
    opts = linkOpts(opts)

    // Only apply to <a> tags
    if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
        throw Error('Action "link" can only be used with <a> tags')
    }

    updateLink(node, opts)

    return {
        update(updated) {
            updated = linkOpts(updated)
            updateLink(node, updated)
        }
    }
}

/**
 * Tries to restore the scroll state from the given history state.
 *
 * @param {{__svelte_spa_router_scrollX: number, __svelte_spa_router_scrollY: number}} [state] - The history state to restore from.
 */
export function restoreScroll(state) {
    // If this exists, then this is a back navigation: restore the scroll position
    if (state) {
        window.scrollTo(state.__svelte_spa_router_scrollX, state.__svelte_spa_router_scrollY)
    }
    else {
        // Otherwise this is a forward navigation: scroll to top
        window.scrollTo(0, 0)
    }
}

// Internal function used by the link function
function updateLink(node, opts) {
    let href = opts.href || node.getAttribute('href')

    // Destination must start with '/' or '#/'
    if (href && href.charAt(0) == '/') {
        // Add # to the href attribute
        href = '#' + href
    }
    else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
        throw Error('Invalid value for "href" attribute: ' + href)
    }

    node.setAttribute('href', href)
    node.addEventListener('click', (event) => {
        // Prevent default anchor onclick behaviour
        event.preventDefault()
        if (!opts.disabled) {
            scrollstateHistoryHandler(event.currentTarget.getAttribute('href'))
        }
    })
}

// Internal function that ensures the argument of the link action is always an object
function linkOpts(val) {
    if (val && typeof val == 'string') {
        return {
            href: val
        }
    }
    else {
        return val || {}
    }
}

/**
 * The handler attached to an anchor tag responsible for updating the
 * current history state with the current scroll state
 *
 * @param {string} href - Destination
 */
function scrollstateHistoryHandler(href) {
    // Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    history.replaceState({...history.state, __svelte_spa_router_scrollX: window.scrollX, __svelte_spa_router_scrollY: window.scrollY}, undefined)
    // This will force an update as desired, but this time our scroll state will be attached
    window.location.hash = href
}
