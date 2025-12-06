import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;


// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   webpack: (config, { isServer }) => {
//     // Exclude test files from the build
//     config.module.rules.push({
//       test: /\.test\.(js|mjs|jsx|ts|tsx)$/,
//       loader: 'ignore-loader'
//     });

//     // Exclude the problematic thread-stream test files
//     config.module.rules.push({
//       test: /node_modules[\\/]thread-stream[\\/]test[\\/]/,
//       loader: 'ignore-loader'
//     });

//     return config;
//   },
//   // Add this to ignore TypeScript errors in node_modules
//   typescript: {
//     ignoreBuildErrors: true,
//   },
// };

// export default nextConfig;