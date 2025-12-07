/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Skip test files inside node_modules
    config.module.rules.push({
      test: /\.test\.js$/,
      use: 'null-loader',
    })

    return config
  },
}

export default nextConfig
