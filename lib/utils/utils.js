import {tick} from 'svelte'

// Just like dispatch, but executes on the next iteration of the event loop
export async function dispatchNextTick(callback, ...args) {
    if (!callback) {
        return
    }
    // Execute this code when the current call stack is complete
    await tick()
    return callback(...args)
}
