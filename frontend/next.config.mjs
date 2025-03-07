/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Keep your existing rewrites if needed for development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/emulator/:path*',
          destination: 'http://localhost:9099/:path*'
        },
        {
          source: '/__/auth/:path*',
          destination: 'https://localhost:8001/__/auth/:path*'
        },
        {
          source: '/auth/:path*',
          destination: 'https://localhost:8001/auth/:path*'
        }
      ]
    }
    return []
  }
};

export default nextConfig;