// Prevents iOS "Turn Off Airplane Mode" system popup by intercepting
// fetch calls to our API when the device is offline.
// The popup is triggered by the OS when a network request reaches the
// network layer with no connectivity. By rejecting before native fetch
// runs, existing try/catch blocks handle it gracefully and iOS never
// shows the alert.

if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

    if (!navigator.onLine && url.startsWith('/api/')) {
      return Promise.reject(new TypeError('Failed to fetch'));
    }

    return nativeFetch(input, init);
  };
}
