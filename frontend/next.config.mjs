// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // REMOVED: output: 'export' - this was causing issues for development
//   // Only use static export for production builds when needed
  
//   // Disable image optimization for static export compatibility
//   images: {
//     unoptimized: true
//   },
  
//   // Environment-specific configuration
//   async rewrites() {
//     if (process.env.NODE_ENV === 'development') {
//       return [
//         {
//           source: '/emulator/:path*',
//           destination: 'http://localhost:9099/:path*'
//         },
//         {
//           source: '/__/auth/:path*',
//           destination: 'http://localhost:8001/__/auth/:path*'  // FIXED: Changed https to http
//         },
//         {
//           source: '/auth/:path*',
//           destination: 'http://localhost:8001/auth/:path*'    // FIXED: Changed https to http
//         }
//       ]
//     }
//     return []
//   },
  
//   // Ensure proper port handling in development
//   async headers() {
//     return [
//       {
//         source: '/api/:path*',
//         headers: [
//           { key: 'Access-Control-Allow-Credentials', value: 'true' },
//           { key: 'Access-Control-Allow-Origin', value: 'http://localhost:8000' },
//           { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
//           { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
//         ],
//       },
//     ]
//   }
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Disable image optimization since we're using static export
  images: {
    unoptimized: true
  },
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