/** @type {import('next').NextConfig} */
// Local `next dev` → 127.0.0.1; Docker/production → backend service name (override with BACKEND_URL)
const backendUrl =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'http://backend:8000')

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ]
  },
}
export default nextConfig
