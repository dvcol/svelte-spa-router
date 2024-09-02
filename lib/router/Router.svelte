<script>
    import {onDestroy} from 'svelte'
    import {restoreScroll, loc, params} from './router.js'
    import {RouteItem} from './route-item.js'
    import {dispatchNextTick} from '../utils/utils.js'

    const {
        /**
         * Dictionary of all routes, in the format `'/path': component`.
         *
         * For example:
         * ````js
         * import HomeRoute from './routes/HomeRoute.svelte'
         * import BooksRoute from './routes/BooksRoute.svelte'
         * import NotFoundRoute from './routes/NotFoundRoute.svelte'
         * routes = {
         *     '/': HomeRoute,
         *     '/books': BooksRoute,
         *     '*': NotFoundRoute
         * }
         * ````
         */
        routes = {},
        /**
         * Optional prefix for the routes in this router. This is useful for example in the case of nested routers.
         */
        prefix = '',
        /**
         * If set to true, the router will restore scroll positions on back navigation
         * and scroll to top on forward navigation.
         */
        restoreScrollState = false,
        conditionsFailed,
        routeLoading,
        routeLoaded,
        routeEvents,
    } = $props()

    // Set up all routes
    const routesList = $derived.by(
        () => {
            // If it's a map, iterate on it right away
            if (routes instanceof Map) {
                return routes.map((route, path) => (new RouteItem(path, route, prefix)))
            }
            // We have an object, so iterate on its own properties
            return Object.keys(routes).map((path) => (new RouteItem(path, routes[path], prefix)))

        }
    )

    // Props for the component to render
    let Component = $state(null)
    let componentParams = $state(null)
    let componentProps = $state({})

    // If this is set, then that means we have popped into this var the state of our last scroll position
    let previousScrollState = $state(null)

    $effect(() => {
        history.scrollRestoration = restoreScrollState ? 'manual' : 'auto'
    })
    
    let popStateChanged = $state(null)
    if (restoreScrollState) {
        popStateChanged = (event) => {
            // If this event was from our history.replaceState, event.state will contain
            // our scroll history. Otherwise, event.state will be null (like on forward
            // navigation)
            if (event.state && (event.state.__svelte_spa_router_scrollY || event.state.__svelte_spa_router_scrollX)) {
                previousScrollState = event.state
            }
            else {
                previousScrollState = null
            }
        }
        // This is removed in the destroy() invocation below
        window.addEventListener('popstate', popStateChanged)
    }

    $effect(() => {
        if (restoreScrollState) {
            restoreScroll(previousScrollState)
        }
    })

    // Always have the latest value of loc
    let lastLoc = null
    // Current object of the component loaded
    let componentObj = null

    // Handle hash change events
    // Listen to changes in the $loc store and update the page
    // Do not use the $: syntax because it gets triggered by too many things
    const unsubscribeLoc = loc.subscribe(async (newLoc) => {
        lastLoc = newLoc

        // Find a route matching the location
        let i = 0
        while (i < routesList.length) {
            const match = routesList[i].match(newLoc.location)
            if (!match) {
                i++
                continue
            }

            const detail = {
                route: routesList[i].path,
                location: newLoc.location,
                querystring: newLoc.querystring,
                userData: routesList[i].userData,
                params: (match && typeof match == 'object' && Object.keys(match).length) ? match : null,
            }

            // Check if the route can be loaded - if all conditions succeed
            if (!(await routesList[i].checkConditions(detail))) {
                // Don't display anything
                Component = null
                componentObj = null
                // Trigger an event to notify the user, then exit
                dispatchNextTick(conditionsFailed, detail)
                return
            }

            // Trigger an event to alert that we're loading the route
            // We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
            dispatchNextTick(routeLoading, Object.assign({}, detail))

            // If there's a component to show while we're loading the route, display it
            const obj = routesList[i].component
            // Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
            if (!Object.is(componentObj, obj)) {
                if (obj.loading) {
                    Component = obj.loading
                    componentObj = obj
                    componentParams = obj.loadingParams
                    componentProps = {}

                    // Trigger the routeLoaded event for the loading component
                    // Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
                    dispatchNextTick(routeLoaded, Object.assign({}, detail, {
                        component: Component,
                        name: Component.name,
                        params: componentParams,
                    }))
                }
                else {
                    Component = null
                    componentObj = null
                }

                // Invoke the Promise
                const loaded = await obj()

                // Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
                if (!Object.is(newLoc, lastLoc)) {
                    // Don't update the component, just exit
                    return
                }

                // If there is a "default" property, which is used by async routes, then pick that
                Component = (loaded && loaded.default) || loaded
                componentObj = obj
            }

            // Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
            // Of course, this assumes that developers always add a "params" prop when they are expecting parameters
            if (match && typeof match == 'object' && Object.keys(match).length) {
                componentParams = match
            }
            else {
                componentParams = null
            }

            // Set static props, if any
            componentProps = routesList[i].props

            // Dispatch the routeLoaded event then exit
            // We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
            dispatchNextTick(routeLoaded, Object.assign({}, detail, {
                Component: Component,
                name: Component.name,
                params: componentParams,
            })).then(() => {
                params.set(componentParams)
            })
            return
        }

        // If we're still here, there was no match, so show the empty component
        Component = null
        componentObj = null
        params.set(undefined)
    })

    onDestroy(() => {
        unsubscribeLoc()
        popStateChanged && window.removeEventListener('popstate', popStateChanged)
    })
</script>

{#if componentParams}
    <Component
      params={componentParams}
      {...routeEvents}
      {...componentProps}
    />
{:else}
    <Component
      {...routeEvents}
      {...componentProps}
    />
{/if}
