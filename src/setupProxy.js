const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function setupProxy(app) {
  app.use(
    '/login',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3333',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/login': '/' }
    })
  )

  app.use(
    createProxyMiddleware({
      target: 'http://127.0.0.1:3333',
      changeOrigin: true,
      ws: true,
      pathFilter: (pathname) =>
        pathname.startsWith('/@vite') ||
        pathname.startsWith('/@react-refresh') ||
        pathname.startsWith('/.sanity') ||
        pathname.startsWith('/__vite_ping') ||
        pathname.startsWith('/@id') ||
        pathname.startsWith('/@fs') ||
        pathname.startsWith('/src') ||
        pathname.startsWith('/node_modules')
    })
  )
}
